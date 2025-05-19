/**
© 2025 Telefónica Innovación Digital S.L.

This library is free software; you can redistribute it and/or modify it under the terms of the GNU Lesser General Public License as published by the Free Software Foundation; either version 3.0 of the License, or (at your option) any later version.

This library is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License along with this library; if not, see <https://www.gnu.org/licenses/>.
*/
import { GraphState, GraphUpdate } from './Agent';
import { FileBrowserTool } from '../tools/FileBrowserTool';

export const listFilesNode = async (
	state: GraphState,
	fileBrowserTool: FileBrowserTool
): Promise<GraphUpdate> => {
	//console.log("--- Entering ListFilesNode ---");
	try {
		const allFiles = await fileBrowserTool.listFiles(state.repoPath);
		// Filter for relevant extensions
		const sourceFiles = allFiles.filter(file => {
			const ext = file.split('.').pop()?.toLowerCase();
			return ['py', 'ts', 'js', 'java', 'kt', 'cs'].includes(ext!);
		});

		if (sourceFiles.length > 0) {
			console.log(`Found ${sourceFiles.length} source files to scan.`);
			console.dir(sourceFiles);
		} else {
			console.warn("\x1b[43mDidnt found source files to scan\x1b[0m")
		}
		return {
			allSourceFiles: sourceFiles,
			remainingFilesToScan: [...sourceFiles] // Initialize remaining files
		};
	} catch (error) {
		console.error("Error in listFilesNode:", error);
		return {
			errorMessages: [`Failed to list files: ${JSON.stringify(error, null, 2)}`],
			allSourceFiles: [], // Ensure it's empty on error
			remainingFilesToScan: []
		};
	}
};
