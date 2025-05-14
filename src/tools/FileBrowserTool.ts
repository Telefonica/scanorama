import * as fs from 'fs';
import * as path from 'path';


// Exclude directories in what source code should not be searched
const excludeDirs = [".git", ".svn", ".hg", "bzr", ".idea", ".vscode", "node_modules", ".venv", ".gradle", ".mvn", ".vs", ".build", ".swiftpm", ".xcodeproj", ".xcworkspace", ".cargo", "__pychache__", "venv", ".pytest_cache"];

export class FileBrowserTool {
	async listFiles(basePath: string): Promise<string[]> {
		const results: string[] = [];
		const walk = (dir: string) => {
			for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
				const p = path.join(dir, ent.name);
				if (ent.isDirectory()) {
					if (excludeDirs.indexOf(ent.name) != -1) continue;
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
