#!/usr/bin/env node

/**
© 2025 Telefónica Innovación Digital S.L.

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3.0 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with this library; if not, see <https://www.gnu.org/licenses/>.
*/
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import simpleGit from 'simple-git';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'; // Import BaseChatModel type
import { Agent } from './agent/Agent';
import * as fs from 'fs';
import * as path from 'path';
import os from 'os';

dotenv.config();

const program = new Command();
program
	.option('-p, --path <folder>', 'Local folder to scan')
	.option('-c, --clone <repo>', 'GitHub repo URL to clone and scan')
	.option('-o, --output <file>', 'Write JSON report to file');

program.description(`Scanorama is a command-line tool to perform static analysis of any MCP-based server\n(built with official MCP SDKs) and detect potential security issues.\nIt generates a human-readable report that flags.\n\nBe CAREFULL with DEEPTH of a local path or a repository because the tool will recursively find all source files under `);


program.usage("--clone https://github.com/user/repo.git --output report.json");

program.version("1.0.0");

program.parse(process.argv);
const opts = program.opts();

if (!process.env.OPENAI_API_KEY) {
	console.error('Error: Missing OPENAI_API_KEY in your .env file or environment variables.');
	process.exit(1);
}

(async () => {
	let repoPath = opts.path;
	try {
		if (opts.clone) {
			const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'scanorama-scan-'));
			console.log(`\x1b[31mClonning \x1b[0m \x1b[34m${opts.clone} \x1b[0m into \x1b[34m ${tmp}...\x1b[0m`)
			await simpleGit().clone(opts.clone, tmp);
			repoPath = tmp;
			console.log('\x1b[42mCloning completed!!!\x1b[0m');
		}

		if (!repoPath) {
			console.error('Error: Please provide a repository to scan using --path <folder> or --clone <repo_url>.');
			program.help();
			process.exit(1);
		}

		console.log(`\n\x1b[31mScanning\x1b[0m repository at: ${repoPath}`);

		const openAILlm = new ChatOpenAI({ // This is a specific ChatOpenAI instance
			apiKey: process.env.OPENAI_API_KEY,
			model: "gpt-4o",
			temperature: 0.7,
		});

		// Bind OpenAI-specific parameters.
		// The result of .bind() is a Runnable, which might not be directly assignable to BaseChatModel.
		const boundLlm = openAILlm.bind({
			response_format: { type: "json_object" },
		});

		// Pass the (bound) LLM to the Agent.
		// despite its generic Runnable type, is compatible with BaseChatModel
		const agent = new Agent(boundLlm as BaseChatModel);

		const results = await agent.run(repoPath);

		console.log('\n\x1b[42m--- REPORT ---\x1b[0m');
		if (results.length === 0) {
			console.log("No MCP tools found or no risks identified in analyzed tools.");
		} else {
			console.dir(results)
		}

		if (opts.output) {
			const reportFilePath = path.resolve(opts.output);
			fs.writeFileSync(reportFilePath, JSON.stringify(results, null, 2));
			console.log(`\nReport written to ${reportFilePath}`);
		}

	} catch (error) {
		console.error("\nAn error occurred during the Scanorama scan:");
		console.error(JSON.stringify(error, null, 2)); // Stringify for better error object logging
		process.exit(1);
	}
})();
