export interface MCPTool {
	name: string;
	description: string;
	location: string; // file path for context
}

export interface AnalysisResult extends MCPTool {
	injectionType: "Injection" | "No-Injection" | "Unknown";
	explanation: string;
}
