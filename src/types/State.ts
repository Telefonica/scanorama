export interface MCPTool {
	name: string;
	description: string;
	location: string; // file path for context
}

export interface AnalysisResult extends MCPTool {
	risky: boolean;
	explanation: string;
}

export interface AgentState {
	repoPath: string;
	tools: MCPTool[];
	results: AnalysisResult[];
}

export type AgentUpdate = Partial<AgentState>
