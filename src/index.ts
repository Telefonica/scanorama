#!/usr/bin/env node
import { Command } from 'commander';
import * as process from 'process';
import { cloneRepo } from './git';
import { findPyFiles, parseMCPTools } from './scanner';
import { analyzeDescription } from './analyzer';
import { printReport, writeJsonReport } from './reporter';
import { ToolInfo, AnalysisResult } from './types';
import * as fs from 'fs';

import dotenv from "dotenv"

dotenv.config()

async function main() {
	const program = new Command();
	program
		.name('anubis')
		.description('Scan a Python MCP repository for prompt injection in tool descriptions')
		.requiredOption('--repo <url>', 'GitHub repository URL')
		.option('--output <path>', 'Output JSON file path');

	program.parse(process.argv);
	const options = program.opts();
	const repoUrl: string = options.repo;
	const outputPath: string | undefined = options.output;

	if (!process.env.OPENAI_API_KEY) {
		console.error('Error: OPENAI_API_KEY environment variable is not set.');
		process.exit(1);
	}

	try {
		const workdir = await cloneRepo(repoUrl);
		const pyFiles = findPyFiles(workdir);

		const tools: ToolInfo[] = [];
		for (const file of pyFiles) {
			const code = fs.readFileSync(file, 'utf-8');
			const found = parseMCPTools(code);
			for (const t of found) {
				tools.push({ ...t, file });
			}
		}

		// Analize each tool an wait for all reports
		Promise.all(
			tools.map((t) => {
				if (t.description) return analyzeDescription(t);
				else return Promise.resolve({
					name: t.name,
					description: "",
					injection: "Unknown",
					explanation: 'No description found'
				}) as Promise<AnalysisResult>
			})
		)
			.then((r) => {
				printReport(r)
				if (outputPath) {
					writeJsonReport(r, repoUrl, outputPath);
				}
			})
			.catch((e) => { throw e })

	} catch (err) {
		console.error(`Fatal error: ${(err as Error)?.message || err}`)
		process.exit(2);
	}
}

main();
