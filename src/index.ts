#!/usr/bin/env node

/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */

import { Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Agent } from './agent/Agent';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import readline from 'readline';
import { modelManager, ProviderSlug, ClientConfig } from './models';

dotenv.config();

const askYesNo = (question: string): Promise<boolean> => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) => {
		rl.question(`${question} (Y/N): `, (answer) => {
			rl.close();
			resolve(answer.trim().toLowerCase() === 'y');
		});
	});
}


const program = new Command();
// ... (program options and listModels logic remain the same as your previous version)
const providerChoices = modelManager.getAllProviders().map(p => p.slug);

program
	.option('-p, --path <folder>', 'Local folder to scan')
	.option('-c, --clone <repo>', 'GitHub repo URL to clone and scan')
	.option('-o, --output <file>', 'Write JSON report to file')
	.addOption(
		new Option('--provider <name>', 'LLM provider to use')
			.choices(providerChoices)
			.default('openai', 'OpenAI (default)')
	)
	.option('-m, --model <id>', 'Specific model ID to use (e.g., gpt-4o, claude-3-opus-20240229, or your Azure deployment/Ollama model name)')
	.option('--list-models', 'List available conceptual models and providers, then exit')
	.option(
		'--temperature <temp>',
		'Set LLM temperature (e.g., 0.1 for deterministic, 0.7 for creative). ' +
		'Note: This option is IGNORED for the Azure OpenAI provider; the Azure deployment\'s default temperature is always used. ' +
		'Some other models/providers might also not support or might ignore this.',
		parseFloat
	)
	.option('-y, --yes', 'Automatically answer yes to all confirmation prompts (e.g., for unlisted models)') // New option
	.description(`Scanorama is a command-line tool to perform static analysis of any MCP-based server\n(built with official MCP SDKs) and detect potential security issues.\nIt generates a human-readable report that flags.\n\nBe CAREFULL with DEEPTH of a local path or a repository because the tool will recursively find all source files under `)
	.usage("--clone https://github.com/user/repo.git --provider openai --model gpt-4o --output report.json")
	.version("1.1.0");

program.parse(process.argv);
const opts = program.opts<{
	path?: string;
	clone?: string;
	output?: string;
	provider: ProviderSlug;
	model?: string;
	listModels?: boolean;
	temperature?: number;
	yes?: boolean;
}>();

if (opts.listModels) {
	console.log("\x1b[1m\x1b[36mAvailable LLM Providers and Conceptual Models for Scanorama:\x1b[0m");
	modelManager.getAllProviders().forEach(provider => {
		console.log(`\nProvider: \x1b[32m${provider.friendlyName}\x1b[0m (slug: --provider ${provider.slug})`);
		console.log(`  Docs: ${provider.docsUrl}`);
		let defaultModelIdForEnvCheck: string | undefined;
		try {
			defaultModelIdForEnvCheck = provider.getDefaultModelId();
		} catch (e) { /* ignore */ }

		const reqEnvs = provider.getRequiredEnvVars(defaultModelIdForEnvCheck);
		if (reqEnvs.length > 0) {
			const coloredEnvs = reqEnvs.map(env => `\x1b[31m${env}\x1b[0m`).join(", ");
			console.log(`  Required Environment Variables: ${coloredEnvs}`);
		} else {
			console.log(`  No specific API key environment variables required (e.g., Ollama).`);
		}

		console.log(`  \x1b[36mModels:\x1b[0m`);
		if (provider.slug === 'ollama') {
			console.log(`    For \x1b[32m${provider.friendlyName}\x1b[0m, specify your locally pulled model name using the \x1b[4m--model <your-ollama-model>\x1b[0m option.`);
		} else if (provider.slug === 'azure') {
			console.log(`    For \x1b[32m${provider.friendlyName}\x1b[0m, you \x1b[1mMUST\x1b[0m specify your \x1b[4mAzure Deployment ID\x1b[0m using the \x1b[4m--model <your-deployment-id>\x1b[0m option.`);
			console.log(`    \x1b[33mNote:\x1b[0m Scanorama does not send a temperature setting to Azure; your deployment's default temperature will be used.`);
		}

		provider.getModels().forEach(m => {
			let modelIdDisplay = m.id;
			let defaultMarker = "";
			if (provider.slug === 'ollama' && m.id === 'custom') {
				modelIdDisplay = "<your-ollama-model>";
			} else if (provider.slug === 'azure' && m.id.startsWith("example-")) {
				modelIdDisplay = "<your-deployment-id>";
			}

			try {
				if (m.id === provider.getDefaultModelId() && provider.slug !== 'azure' && provider.slug !== 'ollama') {
					defaultMarker = " \x1b[1m\x1b[32m[DEFAULT]\x1b[0m";
				}
			} catch (e) { /* ignore */ }

			// The supportsTemperature flag on conceptual Azure models is less critical now, but can be kept for general info
			const tempSupportInfo = (provider.slug === 'azure')
				? " \x1b[33m(uses deployment's default temp)\x1b[0m"
				: (m.supportsTemperature === false ? " \x1b[33m(may not support/use temperature)\x1b[0m" : "");

			console.log(`    - \x1b[1m\x1b[37m${m.name}\x1b[0m (conceptual id for --model: ${modelIdDisplay})${defaultMarker}${tempSupportInfo}`);
		});
	});
	process.exit(0);
}


(async () => {
	let repoPath = opts.path;
	try {
		const { provider, effectiveModelId, modelInfo, isExplicitlyListed } = modelManager.getModelAndProvider(
			opts.provider,
			opts.model
		);

		console.log(`\n\x1b[36mPreparing Scanorama with LLM Provider\x1b[0m: \x1b[1m\x1b[32m${provider.friendlyName}\x1b[0m`);
		let modelDisplayName = modelInfo?.name || effectiveModelId;
		if (provider.slug === 'ollama' && opts.model && (!modelInfo || modelInfo.id === 'custom')) {
			modelDisplayName = `Ollama: ${opts.model}`; // Use the user-provided ollama model name
		} else if (provider.slug === 'azure' && opts.model && !isExplicitlyListed) {
			modelDisplayName = `Azure Deployment: ${opts.model}`; // Use the user-provided azure deployment name
		}
		console.log(`\x1b[36mUsing Model ID\x1b[0m: \x1b[1m\x1b[32m${effectiveModelId}\x1b[0m` + (modelDisplayName !== effectiveModelId ? ` (\x1b[1m${modelDisplayName}\x1b[0m)` : ""));

		// --- Confirmation for unlisted models ---
		if (opts.model && !isExplicitlyListed && provider.slug !== 'ollama' && provider.slug !== 'azure') {
			// For Ollama/Azure, `isExplicitlyListed` might be false if the user provides a custom ID not in our *conceptual* list,
			// but these providers are designed to accept custom IDs, so we don't prompt for them here.
			// We only prompt for providers like OpenAI, Anthropic, Google if the model ID is not in their specific known list.
			console.warn(`\n\x1b[33mWarning:\x1b[0m The model ID "\x1b[1m${opts.model}\x1b[0m" for provider "\x1b[1m${provider.friendlyName}\x1b[0m" is not in Scanorama's pre-verified list.`);
			console.warn(`This may lead to unexpected behavior or errors if the model ID is incorrect or the model has different capabilities.`);

			if (!opts.yes) { // Check if -y or --yes flag was used
				const proceed = await askYesNo("Do you want to continue with this model?");
				if (!proceed) {
					console.log("Scan cancelled by user.");
					process.exit(0);
				}
			} else {
				console.log("Proceeding with unlisted model due to --yes flag.");
			}
		}


		if (opts.clone) {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scanorama-scan-'));
			console.log(`\x1b[36mCloning \x1b[0m \x1b[34m${opts.clone}\x1b[0m into \x1b[34m${tmp}...\x1b[0m`);
			await simpleGit().clone(opts.clone, tmp);
			repoPath = tmp;
			console.log('\x1b[36mCloning completed!\x1b[0m');
		}

		if (!repoPath) {
			console.error('Error: Please provide a repository to scan using --path <folder> or --clone <repo_url>.');
			program.help();
			process.exit(1);
		}

		console.log(`\n\x1b[36mScanning\x1b[0m repository at: \x1b[34m${repoPath}\x1b[0m`);

		const clientConfig: ClientConfig = {};
		if (opts.temperature !== undefined) {
			clientConfig.temperature = opts.temperature;
		}

		const llm: BaseChatModel = modelManager.getConfiguredClient(
			opts.provider,
			opts.model, // Pass the original CLI model string
			clientConfig
		);

		const agent = new Agent(llm);
		const results = await agent.run(repoPath);


		if (results.length === 0) {
			console.log("\x1b[32m✅ No MCP tools found or no risks identified in analyzed tools.\x1b[0m");
		} else {
			let injectionCount = 0;
			results.forEach(result => {
				if (result.injectionType === "Injection") {
					injectionCount++;
					// Red cross emoji, then "Potential Injection in Tool:", then Bold Red tool name
					console.log(`\n\x1b[31m\n❌ Potential Injection in Tool: \x1b[1m${result.name}\x1b[0m`);
					// Location in Red
					console.log(`\x1b[31mLocation:\x1b[0m ${result.location}`);
					// Full Description in Red
					console.log(`\x1b[31mDescription: "${result.description || 'N/A'}" \x1b[0m`);
					// Explanation in Yellow (to distinguish it slightly, but still indicate warning)
					console.log(`\x1b[33mExplanation:\x1b[0m ${result.explanation}\n\n`);
				} else if (result.injectionType === "No-Injection") {
					// This part remains the same as your previous request for "No-Injection"
					console.log(`\x1b[32m\n✅ \x1b[1m${result.name}\x1b[0m - No injection risks found. (\x1b[90m${result.location}\x1b[0m)`);
				} else { // Unknown
					// This part remains the same for "Unknown"
					console.log(`\x1b[33m\n⚠️ \x1b[1m${result.name}\x1b[0m - Analysis result unknown. (\x1b[90m${result.location}\x1b[0m)`);
					console.log(`  \x1b[90mDescription:\x1b[0m "${result.description ? result.description.substring(0, 100) + (result.description.length > 100 ? '...' : '') : 'N/A'}"`);
					console.log(`  \x1b[33mExplanation:\x1b[0m ${result.explanation}`);
				}
			});

			console.log("\n\x1b[1m--- Summary ---");
			if (injectionCount > 0) {
				console.log(`\x1b[31mFound ${injectionCount} tool(s) with potential injection risks.\x1b[0m`);
			} else {
				console.log("\x1b[32mAll analyzed tools appear to be safe from prompt injection.\x1b[0m");
			}
			console.log(`Total tools analyzed: ${results.length}`);
		}
		console.log("\x1b[0m"); // Reset color at the very end of report section
		// --- End Updated Report Printing ---
		if (opts.output) {
			const reportFilePath = path.resolve(opts.output);
			fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
			console.log(`\n\x1b[36mReport written to ${reportFilePath}\x1b[0m`);
		}


	} catch (error: unknown) {
		console.error(`\n\x1b[41mAn error occurred during the Scanorama scan:\x1b[0m`);
		console.dir(error);
		process.exit(1);
	}
})();
