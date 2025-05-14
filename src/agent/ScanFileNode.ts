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
	//console.log(`\n--- Entering ScanFileNode for: ${filePathToScan} ---`);
	console.log(`\n\x1b[31mScanning\x1b[0m source file: (${filePathToScan})...`);
	// Rely on graph logic to ensure filePathToScan is valid.
	// The conditional edge from listFiles and the loop condition in Agent.ts
	// should prevent this node from being called with an undefined/empty filePathToScan
	// if remainingFilesToScan is empty.

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

Respond with a single JSON object. This object should have a key named "tools" which contains an array of objects.
Each object in the "tools" array should have the following structure:
{
  "name": "tool_name_here",
  "description": "tool_description_here"
}

If no MCP tools are found in this file, the "tools" key should contain an empty JSON array [].

File Path: ${filePathToScan}
File Content:
\`\`\`${fileExtension}
${fileContent}
\`\`\`

JSON Output (a single JSON object with a "tools" key):
`;

		const response = await llm.invoke([new HumanMessage(extractionPrompt)]);
		// console.log(`LLM raw response for ${filePathToScan}:`, response.content); // Optional: for debugging

		let parsedResponse: any;
		let extractedRaw: { name: string; description: string }[] = [];

		if (typeof response.content === 'string') {
			try {
				parsedResponse = JSON.parse(response.content);
			} catch (e: any) {
				const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
				if (jsonMatch && jsonMatch[1]) {
					try {
						parsedResponse = JSON.parse(jsonMatch[1]);
					} catch (e2: any) {
						console.error(`ScanFileNode: Failed to parse JSON from LLM response for ${filePathToScan} after markdown extraction: ${e2.message}. Raw content: ${response.content}`);
						return {
							errorMessages: [`LLM response parsing error (markdown) for ${filePathToScan}: ${e2.message}`],
							currentFileProcessed: filePathToScan,
							remainingFilesToScan: state.remainingFilesToScan.slice(1),
							mcpTools: [], // Ensure we return empty tools on error
						};
					}
				} else {
					console.error(`ScanFileNode: Failed to parse JSON from LLM response for ${filePathToScan}: ${e.message}. Raw content: ${response.content}`);
					return {
						errorMessages: [`LLM response parsing error for ${filePathToScan}: ${e.message}`],
						currentFileProcessed: filePathToScan,
						remainingFilesToScan: state.remainingFilesToScan.slice(1),
						mcpTools: [], // Ensure we return empty tools on error
					};
				}
			}
		} else {
			// If response.content is already an object (less common with ChatOpenAI default string output but good to handle)
			parsedResponse = response.content;
		}

		// Ensure parsedResponse is an object and has the 'tools' key which is an array
		if (parsedResponse && typeof parsedResponse === 'object' && Array.isArray(parsedResponse.tools)) {
			extractedRaw = parsedResponse.tools;
		} else {
			console.warn(`ScanFileNode: LLM response for ${filePathToScan} was not in the expected format (object with a 'tools' array). Response:`, JSON.stringify(parsedResponse, null, 2));
			// extractedRaw remains [], which is the correct default.
		}

		const newTools: MCPTool[] = extractedRaw.map(tool => ({
			name: String(tool.name || "Unknown Tool"), // Ensure name is a string
			description: String(tool.description || ""), // Ensure description is a string
			location: filePathToScan,
		}));

		if (newTools.length > 0) console.log(`\x1b[42mFound ${newTools.length} tools in ${filePathToScan}.  \x1b[0m`);
		else console.warn("\x1b[43mDidnt find tools to analyze\x1b[0m");

		return {
			mcpTools: newTools,
			currentFileProcessed: filePathToScan,
			remainingFilesToScan: state.remainingFilesToScan.slice(1)
		};

	} catch (error: any) {
		console.error(`Error in scanFileNode for ${filePathToScan}:`, error);
		return {
			errorMessages: [`Failed to scan file ${filePathToScan}: ${error.message}`],
			currentFileProcessed: filePathToScan,
			remainingFilesToScan: state.remainingFilesToScan.slice(1),
			mcpTools: [], // Ensure we return empty tools on error
		};
	}
};
