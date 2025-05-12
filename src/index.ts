#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { ChatOpenAI } from '@langchain/openai';
import { Agent } from './agent/Agent';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const program = new Command();
program
	.option('--path <folder>', 'Local folder to scan')
	.option('--clone <repo>', 'GitHub repo URL to clone and scan')
	.option('--output <file>', 'Write JSON report to file');

program.parse(process.argv);
const opts = program.opts();

if (!process.env.OPENAI_API_KEY) {
	console.error('Missing OPENAI_API_KEY');
	process.exit(1);
}

(async () => {
	let repoPath = opts.path;
	if (opts.clone) {
		const tmp = fs.mkdtempSync(path.join((await import('os')).tmpdir(), 'anubis-'));
		console.log(`Cloning ${opts.clone} → ${tmp}`);
		await simpleGit().clone(opts.clone, tmp);
		repoPath = tmp;
	}
	if (!repoPath) {
		console.error('Please provide --path or --clone');
		process.exit(1);
	}

	const llm = new ChatOpenAI({
		apiKey: process.env.OPENAI_API_KEY,
		model: "gpt-4o",
	})
		// turn on JSON mode so the model emits strict JSON
		.bind({
			response_format: { type: "json_object" },
		});
	const agent = new Agent(repoPath, llm);
	const results = await agent.run();

	// Console report
	for (const r of results) {
		console.log(`Tool: ${r.name} [${r.location}]`);
		console.log(`  Risky: ${r.risky}`);
		console.log(`  Explanation: ${r.explanation}\n`);
	}

	if (opts.output) {
		fs.writeFileSync(opts.output, JSON.stringify(results, null, 2));
		console.log(`Report written to ${opts.output}`);
	}
})();
