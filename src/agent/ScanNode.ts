// src/agent/ScanNode.ts
import { Node, Context } from '@langchain/langgraph';
import { AgentState, MCPTool } from '../types/State';

export class ScanNode extends Node<AgentState> {
	async run(ctx: Context<AgentState>) {
		const fb = ctx.getTool<FileBrowserTool>('fileBrowser');
		const allFiles = await fb.listFiles(ctx.state.repoPath);

		for (const file of allFiles) {
			const ext = file.split('.').pop()?.toLowerCase();
			if (!['py', 'ts', 'js', 'java', 'kt', 'cs'].includes(ext!)) continue;
			const content = await fb.readFile(file);

			// Ask LLM to extract tool definitions from this file
			const extractionPrompt = `
        You are a code analyst. Given the contents of a ${ext} file, 
        extract any MCP tool definitions (SDK-specific): 
        - Python: @mcp.tool() + docstring 
        - TS/JS: server.tool(name, schema, handler) 
        - Java/Kotlin: @Tool(name=..., description=...) 
        - C#: [McpServerTool, Description("...")] 
        For each tool, output JSON array of {name, description}.
      `;
			const extracted: MCPTool[] = await ctx.llm.callJSON(extractionPrompt, content);

			extracted.forEach(t => {
				ctx.state.tools.push({ ...t, location: file });
			});
		}

		// Proceed to next state
		ctx.next('analyze');
	}
}
