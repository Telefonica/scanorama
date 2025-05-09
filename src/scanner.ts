import * as fs from 'fs';
import * as path from 'path';
import { ToolInfo } from './types';

/**
 * Recursively find all Python files under a directory.
 */
export function findPyFiles(dir: string): string[] {
	let files: string[] = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (entry.name === '.git') continue;
			files = files.concat(findPyFiles(path.join(dir, entry.name)));
		} else if (entry.isFile() && entry.name.endsWith('.py')) {
			files.push(path.join(dir, entry.name));
		}
	}
	return files;
}

/**
 * Parse the source of a Python file to extract @mcp.tool() definitions
 * and their docstring descriptions.
 */
export function parseMCPTools(code: string): ToolInfo[] {
	const lines = code.split('\n');
	const tools: ToolInfo[] = [];

	for (let i = 0; i < lines.length; i++) {
		if (/@tools_mcp\.tool\s*\(/.test(lines[i])) {
			// Find the next "def" line
			let j = i + 1;
			while (j < lines.length && lines[j].trim() === '') j++;
			if (j >= lines.length) break;

			const defMatch = lines[j].match(/^def\s+(\w+)/);
			if (!defMatch) continue;
			const name = defMatch[1];

			// Look for docstring starting on the next non-empty line
			let k = j + 1;
			while (k < lines.length && lines[k].trim() === '') k++;
			let description: string | null = null;

			if (k < lines.length) {
				const trimmed = lines[k].trim();
				const match = trimmed.match(/^('{3}|"{3})(.*)/);
				if (match) {
					const delim = match[1];
					let doc = match[2];
					if (!doc.endsWith(delim)) {
						// Multiline docstring
						k++;
						while (k < lines.length && !lines[k].includes(delim)) {
							doc += '\n' + lines[k].trim();
							k++;
						}
						if (k < lines.length) {
							doc += '\n' + lines[k].trim().split(delim)[0];
						}
					} else {
						// Single-line docstring
						doc = doc.slice(0, -delim.length);
					}
					description = doc.trim();
				}
			}

			description = description ? description : "";
			tools.push({ name, description });
		}
	}

	return tools;
}
