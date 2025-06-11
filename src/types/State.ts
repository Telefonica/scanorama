/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
export interface MCPTool {
	name: string;
	description: string | null;
	function: string | null; // function code
	location: string; // file path for context
}

export interface AnalysisResult extends MCPTool {
	injectionType: "Injection" | "No-Injection" | "Unknown";
	explanation: string;
	incongruent: string | null;
}


