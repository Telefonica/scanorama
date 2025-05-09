import z from "zod";

export const toolInfo = z.object({
	name: z.string().describe("Name of the tool"),
	description: z.string().describe("Description of the tool"),
	file: z.string().optional().describe("Name of the file where the tool comes from"),
});

export const analysisResult = toolInfo.merge(
	z.object({
		injection: z.enum(["Injection", "Non-injection", "Unknown"]).describe("Indicates if the actual tool injects some prompt to modify the behavior of the agent"),
		explanation: z.string().describe(
			"Explanation of why the tool description makes a prompt injection and could modify the normal agent behavior and what the new behavior does"
		),
	})
);

export type ToolInfo = z.infer<typeof toolInfo>;
export type AnalysisResult = z.infer<typeof analysisResult>;
