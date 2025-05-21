#!/usr/bin/env node

import { Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Agent } from './agent/Agent';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import readline from 'readline'; // Import readline for user input
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
	.option('--temperature <temp>', 'Set LLM temperature (e.g., 0.1 for more deterministic, 0.7 for more creative)', parseFloat)
	.option('-y, --yes', 'Automatically answer yes to all confirmation prompts (e.g., for unlisted models)') // New option
	.description(`Scanorama is a command-line tool to perform static analysis...`)
	.usage("--clone https://github.com/user/repo.git --provider openai --model gpt-4o --output report.json")
	.version("1.1.1"); // Increment version

program.parse(process.argv);
const opts = program.opts<{
	path?: string;
	clone?: string;
	output?: string;
	provider: ProviderSlug;
	model?: string;
	listModels?: boolean;
	temperature?: number;
	yes?: boolean; // For the new option
}>();

if (opts.listModels) {
	// ... (your existing colored listModels logic) ...
	console.log("\x1b[1m\x1b[36mAvailable LLM Providers and Conceptual Models for Scanorama:\x1b[0m");
	modelManager.getAllProviders().forEach(provider => {
		console.log(`\nProvider: \x1b[32m${provider.friendlyName}\x1b[0m (slug: --provider ${provider.slug})`);
		console.log(`  Docs: ${provider.docsUrl}`);
		const reqEnvs = provider.getRequiredEnvVars(provider.getDefaultModelId());
		if (reqEnvs.length > 0) {
			const coloredEnvs = reqEnvs.map(env => `\x1b[31m${env}\x1b[0m`).join(", ");
			console.log(`  Required Environment Variables: ${coloredEnvs}`);
		} else {
			console.log(`  No specific API key environment variables required (e.g., Ollama).`);
		}

		if (provider.slug === 'ollama') {
			console.log(`  Models: For \x1b[32m${provider.friendlyName}\x1b[0m, you specify your locally pulled model name using the --model option.`);
			console.log(`          Example: --model llama3`);
		} else if (provider.slug === 'azure') {
			console.log(`  Models: For \x1b[32m${provider.friendlyName}\x1b[0m, you must specify your Azure Deployment ID using the --model option.`);
			console.log(`          Example: --model your_deployment_id`);
		}

		provider.getModels().forEach(m => {
			let modelIdDisplay = m.id;
			if (provider.slug === 'ollama' && m.id === 'custom') {
				modelIdDisplay = "your_local_model_name";
			} else if (provider.slug === 'azure' && m.id.includes("-azure-deployment")) { // A bit heuristic
				modelIdDisplay = "your_deployment_id";
			}

			let modelDesc = `    - \x1b[1m\x1b[37m${m.name}\x1b[0m (id: --model ${modelIdDisplay})`;
			if (m.id === provider.getDefaultModelId() && provider.slug !== 'azure' && provider.slug !== 'ollama') {
				modelDesc = `    - \x1b[1m\x1b[32m${m.name}\x1b[0m (id: --model ${modelIdDisplay}) [DEFAULT]`;
			}
			console.log(modelDesc);
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

		console.log('\n\x1b[36m--- REPORT ---');
		if (results.length === 0) {
			console.log("No MCP tools found or no risks identified in analyzed tools.");
		} else {
			console.dir(results);
		}

		if (opts.output) {
			const reportFilePath = path.resolve(opts.output);
			fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
			console.log(`\n\x1b[36mReport written to ${reportFilePath}\x1b[0m`);
		}


	} catch (error: unknown) {
		console.error(`\n\x1b[41mAn error occurred during the Scanorama scan: ${JSON.stringify(error, null, 2)}\x1b[0m`);
		process.exit(1);
	}
})();
