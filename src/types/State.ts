export interface MCPTool {
	name: string;
	description: string;
	location: string; // file path for context
}

export interface AnalysisResult extends MCPTool {
	risky: boolean;
	explanation: string;
}
