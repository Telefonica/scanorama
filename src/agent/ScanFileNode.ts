import { GraphState, GraphUpdate } from './Agent';
import { MCPTool } from '../types/State';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { HumanMessage } from '@langchain/core/messages';
import { FileBrowserTool } from '../tools/FileBrowserTool';

export const scanFileNode = async (
	state: GraphState,
	llm: BaseChatModel,
	fileBrowserTool: FileBrowserTool,
	filePathToScan: string
): Promise<GraphUpdate> => {
	console.log(`\n--- Entering ScanFileNode for: ${filePathToScan} ---`);
	if (!filePathToScan) {
		console.log("ScanFileNode: No file path provided, skipping.");
		// This case should ideally be handled by graph logic, but as a safeguard:
		return { remainingFilesToScan: undefined }; // Signal to stop or clear
	}

	try {
		const fileContent = await fileBrowserTool.readFile(filePathToScan);
		const fileExtension = filePathToScan.split('.').pop()?.toLowerCase() || 'unknown';

		const extractionPrompt = `
You are an AI assistant specialized in identifying Model Context Protocol (MCP) tool definitions within source code.
Analyze the following ${fileExtension} file content and extract all MCP tool definitions.
An MCP tool definition typically includes a tool name and a user-facing description.

Look for patterns such as:
- Python: Functions/methods with decorators like @mcp.tool() or @mcp_server.tool_method(name="...", description="..."). The description might also be in the docstring.
- TypeScript/JavaScript: server.registerTool({ name: "...", description: "...", ... }) or server.tool("name", schema_with_description, handler).
- Java/Kotlin: Annotations like @Tool(name="...", description="...") or @McpTool(name="...", description="...").
- C#: Attributes like [McpServerTool(Name="...", Description="...")] or [Tool(Name="...", Description="...")].

For each tool found, provide its name and its exact description.
The description is critical as it's the part that might be used for prompt injection.

Respond with a JSON array of objects, where each object has the following structure:
{
  "name": "tool_name_here",
  "description": "tool_description_here"
}

If no MCP tools are found in this file, return an empty JSON array [].

File Path: ${filePathToScan}
File Content:
\`\`\`${fileExtension}
${fileContent}
\`\`\`

JSON Output:
`;

		const response = await llm.invoke([new HumanMessage(extractionPrompt)]);
		let extractedRaw: { name: string; description: string }[] = [];

		if (typeof response.content === 'string') {
			try {
				// Attempt to parse the string content as JSON
				extractedRaw = JSON.parse(response.content);
			} catch (e: any) {
				// If parsing fails, try to find JSON within common markdown code blocks
				const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
				if (jsonMatch && jsonMatch[1]) {
					try {
						extractedRaw = JSON.parse(jsonMatch[1]);
					} catch (e2: any) {
						console.error(`ScanFileNode: Failed to parse JSON from LLM response for ${filePathToScan} after markdown extraction: ${e2.message}`);
						return {
							errorMessages: [`LLM response parsing error for ${filePathToScan}: ${e2.message}`],
							currentFileProcessed: filePathToScan,
							remainingFilesToScan: state.remainingFilesToScan.slice(1) // Move to next file
						};
					}
				} else {
					console.error(`ScanFileNode: Failed to parse JSON from LLM response for ${filePathToScan}: ${e.message}. Response: ${response.content}`);
					return {
						errorMessages: [`LLM response parsing error for ${filePathToScan}: ${e.message}`],
						currentFileProcessed: filePathToScan,
						remainingFilesToScan: state.remainingFilesToScan.slice(1) // Move to next file
					};
				}
			}
		} else {
			// if response.content is already an object (though less likely with ChatOpenAI default)
			extractedRaw = response.content as { name: string; description: string }[];
		}


		const newTools: MCPTool[] = extractedRaw.map(tool => ({
			...tool,
			location: filePathToScan,
		}));

		console.log(`Found ${newTools.length} tools in ${filePathToScan}.`);
		return {
			mcpTools: newTools, // These will be appended to the global list by the graph
			currentFileProcessed: filePathToScan,
			remainingFilesToScan: state.remainingFilesToScan.slice(1) // "Consume" the processed file
		};

	} catch (error: any) {
		console.error(`Error in scanFileNode for ${filePathToScan}:`, error);
		return {
			errorMessages: [`Failed to scan file ${filePathToScan}: ${error.message}`],
			currentFileProcessed: filePathToScan,
			remainingFilesToScan: state.remainingFilesToScan.slice(1) // Ensure we move to the next file
		};
	}
};
