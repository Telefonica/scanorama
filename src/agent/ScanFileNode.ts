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

--- CONTEXT ---
The Model Context Protocol (MCP) is an open standard developed by Anthropic that enables AI applications to connect with external tools and data sources in a standardized way. An MCP server exposes capabilities, known as tools, each accompanied by a natural language description. These descriptions are injected into the context of large language models (LLMs), guiding their behavior.

To facilitate the development of MCP-compatible applications, official SDKs are available in multiple programming languages, including Python, TypeScript, Java, Kotlin, C#, and Swift . These SDKs allow developers to implement MCP servers and clients across various platforms, ensuring broad compatibility and ease of integration.
--- END ---

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

IF NO MCP TOOLS ARE FOUND IN THIS FILE, THE "TOOLS" KEY SHOULD CONTAIN AN EMPTY JSON ARRAY [].

This is the file path of the file you are scanning, FILE PATH: ${filePathToScan}
FILE CONTENT:
\`\`\`${fileExtension}
${fileContent}
\`\`\`

JSON OUTPUT (A SINGLE JSON OBJECT WITH A "TOOLS" KEY):
`;

		const response = await llm.invoke([new HumanMessage(extractionPrompt)]);
		// console.log(`LLM raw response for ${filePathToScan}:`, response.content); // Optional: for debugging

		let parsedResponse: unknown;
		let extractedRaw: { name: string; description: string }[] = [];

		// Parse the response of the LLM if its in plain text
		if (typeof response.content === 'string') {
			try {
				parsedResponse = JSON.parse(response.content);
			} catch (e) {
				const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/);
				if (jsonMatch && jsonMatch[1]) {
					try {
						parsedResponse = JSON.parse(jsonMatch[1]);
					} catch (e2) {
						console.error(`ScanFileNode: Failed to parse JSON from LLM response for ${filePathToScan} after markdown extraction: ${JSON.stringify(e2, null, 2)}. Raw content: ${response.content}`);
						return {
							errorMessages: [`LLM response parsing error (markdown) for ${filePathToScan}: ${JSON.stringify(e2, null, 2)}`],
							currentFileProcessed: filePathToScan,
							remainingFilesToScan: state.remainingFilesToScan.slice(1),
							mcpTools: [], // Ensure we return empty tools on error
						};
					}
				} else {
					console.error(`ScanFileNode: Failed to parse JSON from LLM response for ${filePathToScan}: ${JSON.stringify(e, null, 2)}. Raw content: ${response.content}`);
					return {
						errorMessages: [`LLM response parsing error for ${filePathToScan}: ${JSON.stringify(e, null, 2)}`],
						currentFileProcessed: filePathToScan,
						remainingFilesToScan: state.remainingFilesToScan.slice(1),
						mcpTools: [], // Ensure we return empty tools on error
					};
				}
			}
		} else {
			// Already object parsed
			parsedResponse = response.content;
		}

		// Ensure parsedResponse is an object and has the 'tools' key which is an array
		if (parsedResponse && typeof parsedResponse === 'object' && "tools" in parsedResponse && Array.isArray(parsedResponse.tools)) {
			extractedRaw = parsedResponse.tools;
		} else {
			console.warn(`ScanFileNode: LLM response for ${filePathToScan} was not in the expected format (object with a 'tools' array). Response:`, JSON.stringify(parsedResponse, null, 2));
		}

		const newTools: MCPTool[] = extractedRaw.map(tool => ({
			name: String(tool.name || "Unknown Tool"),
			description: String(tool.description || ""),
			location: filePathToScan,
		}));

		if (newTools.length > 0) console.log(`\x1b[42mFound ${newTools.length} tools in ${filePathToScan}.  \x1b[0m`);
		else console.warn("\x1b[43mDidnt find tools to analyze\x1b[0m");

		return {
			mcpTools: newTools,
			currentFileProcessed: filePathToScan,
			remainingFilesToScan: state.remainingFilesToScan.slice(1)
		};

	} catch (error) {
		console.error(`Error in scanFileNode for ${filePathToScan}:`, error);
		return {
			errorMessages: [`Failed to scan file ${filePathToScan}: ${JSON.stringify(error, null, 2)}`],
			currentFileProcessed: filePathToScan,
			remainingFilesToScan: state.remainingFilesToScan.slice(1),
			mcpTools: [], // Ensure we return empty tools on error
		};
	}
};
