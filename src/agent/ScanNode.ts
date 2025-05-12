import { FileBrowserTool } from '../tools/FileBrowserTool';
import { AgentState, MCPTool } from '../types/State';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export const ScanNode = async (state: AgentState, config: { llm: BaseChatModel }) => {
	const llm = config.llm;
	const fb = new FileBrowserTool();
	const allFiles = await fb.listFiles(state.repoPath);

	const newTools: MCPTool[] = [];

	for (const file of allFiles) {
		const ext = file.split('.').pop()?.toLowerCase();
		if (!['py', 'ts', 'js', 'java', 'kt', 'cs'].includes(ext!)) continue;
		const content = await fb.readFile(file);

		const extractionPrompt = `
You are an AI assistant analyzing a ${ext} file to find MCP tool definitions. MCP tools are functions or methods registered with an MCP server, with associated names and descriptions, across languages like Python, TypeScript, JavaScript, Java, Kotlin, and C#.

Identify tool definitions by looking for:
- Functions/methods with decorators, annotations, or registration calls.
- Associated names and descriptions (e.g., docstrings, parameters, attributes).

Examples:
- Python: @mcp.tool() with docstring.
- TS/JS: server.tool(name, schema, handler).
- Java/Kotlin: @Tool(name="...", description="...").
- C#: [McpServerTool, Description("...")].

For each tool, output a JSON object with:
- name: The tool's name.
- description: The tool's description.

File content:
${content}

Respond with a JSON array of tool objects, each with "name" and "description" fields. If no tools are found, return an empty array [].
    `;

		const response = await llm.invoke(extractionPrompt);
		const extracted: MCPTool[] = JSON.parse(response.content as string);
		extracted.forEach(t => newTools.push({ ...t, location: file }));
	}

	return { tools: newTools };
};
