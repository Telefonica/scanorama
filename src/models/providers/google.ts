import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class GoogleProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "google";
	readonly friendlyName: string = "Google Gemini";
	readonly docsUrl: string = "https://ai.google.dev/gemini-api/docs/api-key";

	private readonly models: ModelInfo[] = [
		{
			id: "gemini-1.5-pro-latest",
			name: "Gemini 1.5 Pro (Latest)",
			description: "Google's most capable Gemini model for complex tasks.",
			supportsTemperature: true
		},
		{
			id: "gemini-1.5-flash-latest",
			name: "Gemini 1.5 Flash (Latest)",
			description: "Google's fast and versatile Gemini model for a balance of speed and capability.",
			supportsTemperature: true
		},
		{
			id: "gemini-1.0-pro",
			name: "Gemini 1.0 Pro",
			description: "The first production version of Gemini Pro. Often interchangeable with 'gemini-pro'.",
			supportsTemperature: true
		},
		{ // Adding the common alias
			id: "gemini-pro",
			name: "Gemini Pro (Alias for 1.0 Pro)",
			description: "Alias for the Gemini 1.0 Pro model.",
			supportsTemperature: true
		},
	];

	getDefaultModelId(): string {
		return "gemini-1.5-flash-latest";
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		return ["GOOGLE_API_KEY"];
	}

	getClient(modelId: string, config: ClientConfig): BaseChatModel {
		if (!process.env.GOOGLE_API_KEY) {
			throw new Error("Missing GOOGLE_API_KEY for Google Gemini. See docs: " + this.docsUrl);
		}

		// The Agent.ts will handle applying .withStructuredOutput for JSON.
		// We inform the user about this enhanced reliability.
		console.log(
			`\x1b[36mInfo:\x1b[0m For Google Gemini model '\x1b[1m${modelId}\x1b[0m', Scanorama will use schema-enforced structured output for reliable JSON.`
		);

		const clientParams: ConstructorParameters<typeof ChatGoogleGenerativeAI>[0] = {
			apiKey: process.env.GOOGLE_API_KEY,
			model: modelId, // Use 'model' for Gemini
			temperature: config.temperature ?? 0.7, // Scanorama's default or user override
			// Do NOT set generationConfig here for global JSON mode.
			// withStructuredOutput is preferred and handled in Agent.ts
			...(config.providerClientOptions || {}),
		};

		return new ChatGoogleGenerativeAI(clientParams);
	}
}
