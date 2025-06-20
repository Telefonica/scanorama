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

console.log(`
  ██████  ▄████▄   ▄▄▄       ███▄    █  ▒█████   ██▀███   ▄▄▄       ███▄ ▄███▓ ▄▄▄      
▒██    ▒ ▒██▀ ▀█  ▒████▄     ██ ▀█   █ ▒██▒  ██▒▓██ ▒ ██▒▒████▄    ▓██▒▀█▀ ██▒▒████▄    
░ ▓██▄   ▒▓█    ▄ ▒██  ▀█▄  ▓██  ▀█ ██▒▒██░  ██▒▓██ ░▄█ ▒▒██  ▀█▄  ▓██    ▓██░▒██  ▀█▄  
  ▒   ██▒▒▓▓▄ ▄██▒░██▄▄▄▄██ ▓██▒  ▐▌██▒▒██   ██░▒██▀▀█▄  ░██▄▄▄▄██ ▒██    ▒██ ░██▄▄▄▄██ 
▒██████▒▒▒ ▓███▀ ░ ▓█   ▓██▒▒██░   ▓██░░ ████▓▒░░██▓ ▒██▒ ▓█   ▓██▒▒██▒   ░██▒ ▓█   ▓██▒
▒ ▒▓▒ ▒ ░░ ░▒ ▒  ░ ▒▒   ▓▒█░░ ▒░   ▒ ▒ ░ ▒░▒░▒░ ░ ▒▓ ░▒▓░ ▒▒   ▓▒█░░ ▒░   ░  ░ ▒▒   ▓▒█░
░ ░▒  ░ ░  ░  ▒     ▒   ▒▒ ░░ ░░   ░ ▒░  ░ ▒ ▒░   ░▒ ░ ▒░  ▒   ▒▒ ░░  ░      ░  ▒   ▒▒ ░
░  ░  ░  ░          ░   ▒      ░   ░ ░ ░ ░ ░ ▒    ░░   ░   ░   ▒   ░      ░     ░   ▒   
      ░  ░ ░            ░  ░         ░     ░ ░     ░           ░  ░       ░         ░  ░
         ░                                                                              
`);

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
const providerChoices = modelManager.getAllProviders().map(p => p.slug);

program
	.option('-p, --path <folder>', 'Local folder to scan')
	.option('-c, --clone <repo>', 'GitHub repo URL to clone and scan')
	.option('-o, --output <file>', 'Write JSON report to file\n')
	.option('--list-models', 'List available conceptual models and providers, then exit')
	.addOption(
		new Option('--provider <name>', 'LLM provider to use')
			.choices(providerChoices)
			.default('openai', 'OpenAI (default)')
	)
	.option('--model <id>', 'Specific model ID to use (e.g., gpt-4o)')
	.option(
		'--temperature <temp>',
		'Set LLM temperature (e.g., 0.1 for deterministic, 0.7 for creative). ' +
		'Note: This option is IGNORED for the Azure OpenAI provider\n',
		parseFloat
	)
	.option('-y, --yes', 'Automatically answer yes to all confirmation prompts (e.g., for unlisted models)') // New option
	.description(`
                   
Scanorama is a CLI tool to perform static analysis of any MCP-based server (built with official MCP SDKs) and detect potential security issues.\nIt generates a human-readable report that flags.\n(Be CAREFULL with DEEPTH of a local path or a repository because the tool will recursively find all source files under) `)
	.usage("--clone https://github.com/user/repo.git --provider openai --model gpt-4o --output report.json")
	.version("1.0.2");

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
		}

		console.log(`  \x1b[36mModels:\x1b[0m`);
		if (provider.slug === 'azure') {
			console.log(`    For \x1b[32m${provider.friendlyName}\x1b[0m, you \x1b[1mMUST\x1b[0m specify your \x1b[4mAzure Deployment ID\x1b[0m using the \x1b[4m--model <your-deployment-id>\x1b[0m option.`);
			console.log(`    \x1b[33mNote:\x1b[0m Scanorama does not send a temperature setting to Azure; your deployment's default temperature will be used.`);
		}

		provider.getModels().forEach(m => {
			let modelIdDisplay = m.id;
			let defaultMarker = "";
			if (provider.slug === 'azure' && m.id.startsWith("example-")) {
				modelIdDisplay = "<your-deployment-id>";
			}

			try {
				if (m.id === provider.getDefaultModelId() && provider.slug !== 'azure') {
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
		if (provider.slug === 'azure' && opts.model && !isExplicitlyListed) {
			modelDisplayName = `Azure Deployment: ${opts.model}`;
		}
		console.log(`\x1b[36mUsing Model ID\x1b[0m: \x1b[1m\x1b[32m${effectiveModelId}\x1b[0m` + (modelDisplayName !== effectiveModelId ? ` (\x1b[1m${modelDisplayName}\x1b[0m)` : ""));

		// --- Confirmation for unlisted models ---
		if (opts.model && !isExplicitlyListed && provider.slug !== 'azure') {
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
			results
				.filter(r => r.injectionType !== "Injection")
				.concat(
					results.filter(r => r.injectionType === "Injection")
				)
				.forEach(result => {
					if (result.injectionType === "Injection") {
						injectionCount++;
						console.log(`\n\x1b[31m❌ Potential Injection in Tool: \x1b[0m${result.name}`);
						console.log(`\x1b[31mLocation:\x1b[0m ${result.location}`);
						console.log(`\x1b[31mDescription: "${result.description || 'N/A'}"\x1b[0m`);
						console.log(`\x1b[33mExplanation:\x1b[0m ${result.explanation}`);
						if (result.incongruent) console.log(`\x1b[33mInconsistencies found!!!:\x1b[0m ${result.incongruent}\n`);
						console.log();

					} else if (result.injectionType === "No-Injection") {
						console.log(`\n\x1b[32m✅\x1b[1m${result.name}\x1b[0m - No injection risks found. (\x1b[90m${result.location}\x1b[0m)`);
						if (result.incongruent) console.log(`\x1b[33mInconsistencies found!!!:\x1b[0m ${result.incongruent}\n`);
						console.log();

					} else {
						console.log(`\n\x1b[33m⚠️\x1b[1m${result.name}\x1b[0m - Analysis result unknown. (\x1b[90m${result.location}\x1b[0m)`);
						console.log(`\x1b[90mDescription:\x1b[0m "${result.description ? result.description.substring(0, 100) + (result.description.length > 100 ? '...' : '') : 'N/A'}"`);
						console.log(`\x1b[33mExplanation:\x1b[0m ${result.explanation}`);
						if (result.incongruent) console.log(`\x1b[33mInconsistencies found!!!:\x1b[0m ${result.incongruent}\n`);
						console.log();
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
		console.log("\x1b[0m");
		// --- End Updated Report Printing ---
		if (opts.output) {
			const reportFilePath = path.resolve(opts.output);
			fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
			console.log(`\x1b[36mReport written to ${reportFilePath}\x1b[0m`);
		}


	} catch (error: unknown) {
		console.error(`\n\x1b[41mAn error occurred during the Scanorama scan:\x1b[0m`);
		console.dir(error);
		process.exit(1);
	}
})();
