import * as fs from 'fs';
import * as path from 'path';

export class FileBrowserTool {
	async listFiles(basePath: string): Promise<string[]> {
		const results: string[] = [];
		const walk = (dir: string) => {
			for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
				const p = path.join(dir, ent.name);
				if (ent.isDirectory()) {
					if (ent.name === '.git' || ent.name === 'node_modules') continue;
					walk(p);
				} else {
					results.push(p);
				}
			}
		};
		walk(basePath);
		return results;
	}

	async readFile(filePath: string): Promise<string> {
		return fs.readFileSync(filePath, 'utf-8');
	}
}
