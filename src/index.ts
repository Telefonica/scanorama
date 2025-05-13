#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { ChatOpenAI } from '@langchain/openai';
import { Agent } from './agent/Agent'; // Updated path/structure
import * as fs from 'fs';
import * as path from 'path';
import os from 'os'; // For tmpdir

dotenv.config();

const program = new Command();
program
	.option('--path <folder>', 'Local folder to scan')
	.option('--clone <repo>', 'GitHub repo URL to clone and scan')
	.option('--output <file>', 'Write JSON report to file');

program.parse(process.argv);
const opts = program.opts();

if (!process.env.OPENAI_API_KEY) {
	console.error('Error: Missing OPENAI_API_KEY in your .env file or environment variables.');
	process.exit(1);
}

(async () => {
	let repoPath = opts.path;
	let tempDirToRemove: string | null = null;

	try {
		if (opts.clone) {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'anubis-scan-'));
			tempDirToRemove = tmp;
			console.log(`Cloning ${opts.clone} into ${tmp}...`);
			await simpleGit().clone(opts.clone, tmp);
			repoPath = tmp;
			console.log('Cloning complete.');
		}

		if (!repoPath) {
			console.error('Error: Please provide a repository to scan using --path <folder> or --clone <repo_url>.');
			program.help(); // Show help
			process.exit(1);
		}

		console.log(`Scanning repository at: ${repoPath}`);

		const llm = new ChatOpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			model: "gpt-4o", // or your preferred model
			temperature: 0, // For more deterministic output in JSON mode
		}).bind({
			response_format: { type: "json_object" },
		});

		const agent = new Agent(llm); // Pass LLM to constructor
		const results = await agent.run(repoPath); // Pass repoPath to run method

		console.log("\n--- Analysis Report ---");
		if (results.length === 0) {
			console.log("No MCP tools found or no risks identified in analyzed tools.");
		} else {
			for (const r of results) {
				console.log(`\nTool: ${r.name}`);
				console.log(`  Location: ${r.location}`);
				console.log(`  Description: ${r.description.substring(0, 100)}${r.description.length > 100 ? '...' : ''}`);
				console.log(`  Risky: ${r.risky ? 'Yes' : 'No'}`);
				console.log(`  Explanation: ${r.explanation}`);
			}
		}

		if (opts.output) {
			const reportFilePath = path.resolve(opts.output);
			fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
			console.log(`\nReport written to ${reportFilePath}`);
		}

	} catch (error: any) {
		console.error("\nAn error occurred during the Anubis scan:");
		console.error(error.message);
		if (error.stack) {
			console.error(error.stack);
		}
		process.exit(1);
	} finally {
		if (tempDirToRemove) {
			try {
				// console.log(`Cleaning up temporary directory: ${tempDirToRemove}`);
				// fs.rmSync(tempDirToRemove, { recursive: true, force: true }); // Node 14.14+
				// For wider compatibility, use older fs.rmdir or a library if needed for robustness
			} catch (cleanupError: any) {
				// console.warn(`Warning: Could not remove temporary directory ${tempDirToRemove}: ${cleanupError.message}`);
			}
		}
	}
})();
