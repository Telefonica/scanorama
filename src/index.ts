#!/usr/bin/env node
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import cloneRepo from 'simple-git';
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
		await cloneRepo(opts.clone, tmp);
		repoPath = tmp;
	}
	const agent = new Agent(repoPath, process.env.OPENAI_API_KEY!);
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
