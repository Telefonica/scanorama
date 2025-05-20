/**
© 2025 Telefónica Innovación Digital S.L.

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3.0 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with this library; if not, see <https://www.gnu.org/licenses/>.
*/
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
		try {
			return fs.readFileSync(filePath, 'utf-8');
		}
		catch (error: unknown) {
			console.error(`Error cant read the file ${filePath} \nerror=${JSON.stringify(error, null, 2)}`)
			return "";
		}
	}
}
