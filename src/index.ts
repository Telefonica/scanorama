#!/usr/bin/env node

import { Command, Option } from 'commander';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Agent } from './agent/Agent';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';
import { modelManager, ProviderSlug, ClientConfig } from './models';

dotenv.config();

const program = new Command();

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
}>();

if (opts.listModels) {
	console.log("Available LLM Providers and Conceptual Models for Scanorama:");
	modelManager.getAllProviders().forEach(provider => {
		console.log(`\nProvider: ${provider.friendlyName} (slug: --provider ${provider.slug})`);
		console.log(`  Docs: ${provider.docsUrl}`);
		const reqEnvs = provider.getRequiredEnvVars(provider.getDefaultModelId());
		if (reqEnvs.length > 0) {
			console.log(`  Required Environment Variables: ${reqEnvs.join(", ")}`);
		} else {
			console.log(`  No specific API key environment variables required (e.g., Ollama).`);
		}
		if (provider.slug === 'ollama' || provider.slug === 'azure') {
			console.log(`  Models: For ${provider.friendlyName}, you typically specify your own model/deployment ID using the --model option.`);
			console.log(`          Example for ${provider.friendlyName}: --model your_model_or_deployment_id`);
		}
		provider.getModels().forEach(m => {
			let modelDesc = `    - ${m.name} (id: --model ${m.id})`;
			if (m.id === provider.getDefaultModelId() && provider.slug !== 'azure' && provider.slug !== 'ollama') {
				modelDesc += " (default)";
			}
			console.log(modelDesc);
		});
	});
	process.exit(0);
}


(async () => {
	let repoPath = opts.path;
	try {
		const { provider, effectiveModelId, modelInfo } = modelManager.getModelAndProvider(
			opts.provider,
			opts.model
		);

		console.log(`\n\x1b[36mPreparing Scanorama with LLM Provider\x1b[0m: \x1b[32m${provider.friendlyName}\x1b[0m`);
		console.log(`\x1b[36mUsing Model ID\x1b[0m: \x1b[32m${effectiveModelId}\x1b[0m` + (modelInfo?.name && modelInfo.name !== effectiveModelId ? ` (${modelInfo.name})` : ""));


		if (opts.clone) {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scanorama-scan-'));
			console.log(`\x1b[36mCloning \x1b[0m \x1b[34m${opts.clone}\x1b[0m into \x1b[34m${tmp}...\x1b[0m`);
			await simpleGit().clone(opts.clone, tmp);
			repoPath = tmp;
			console.log('\x1b[42mCloning completed!\x1b[0m');
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
		// Example if you add more generic client options via CLI
		// clientConfig.providerClientOptions = { someOption: 'value' };


		// The modelManager now handles client instantiation and JSON mode configuration internally
		const llm: BaseChatModel = modelManager.getConfiguredClient(
			opts.provider,
			opts.model, // Pass CLI model directly, manager resolves it
			clientConfig
		);

		const agent = new Agent(llm); // Agent expects BaseChatModel
		const results = await agent.run(repoPath);

		console.log('\n\x1b[42m--- REPORT ---');
		if (results.length === 0) {
			console.log("No MCP tools found or no risks identified in analyzed tools.");
		} else {
			console.dir(results, { depth: null });
		}

		if (opts.output) {
			const reportFilePath = path.resolve(opts.output);
			fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
			console.log(`\n\x1b[42mReport written to ${reportFilePath}\x1b[0m`);
		}

	} catch (error: any) {
		console.error("\n\x1b[41mAn error occurred during the Scanorama scan:\x1b[0m");
		if (error.message) {
			console.error(error.message);
		}
		if (error.stack && process.env.DEBUG_SCANORAMA) { // Add a debug flag for stack traces
			console.error(error.stack);
		}
		// console.error(error); // For full object if needed
		process.exit(1);
	}
})();
