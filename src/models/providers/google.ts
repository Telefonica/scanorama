import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class GoogleProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "google";
	readonly friendlyName: string = "Google Gemini";
	readonly docsUrl: string = "https://ai.google.dev/gemini-api/docs/api-key";

	private readonly models: ModelInfo[] = [
		{ id: "gemini-1.5-pro-latest", name: "Gemini 1.5 Pro" },
		{ id: "gemini-1.5-flash-latest", name: "Gemini 1.5 Flash" },
		{ id: "gemini-1.0-pro", name: "Gemini 1.0 Pro" },
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
		console.warn(`\x1b[43m\x1b[30mFYI\x1b[0m For Google Gemini, Scanorama relies on strong prompting to get JSON.`);
		return new ChatGoogleGenerativeAI({
			apiKey: process.env.GOOGLE_API_KEY,
			model: modelId,
			temperature: config.temperature ?? 0.7,
			...(config.providerClientOptions || {}),
		});
	}
}
