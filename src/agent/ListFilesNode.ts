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
