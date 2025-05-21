import { ChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class OpenAIProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "openai";
	readonly friendlyName: string = "OpenAI";
	readonly docsUrl: string = "https://platform.openai.com/api-keys";

	private readonly models: ModelInfo[] = [
		{ id: "gpt-4o", name: "GPT-4o (Flagship)" },
		{ id: "gpt-4-turbo", name: "GPT-4 Turbo" },
		{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
	];

	getDefaultModelId(): string {
		return "gpt-4o";
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		return ["OPENAI_API_KEY"];
	}

	getClient(modelId: string, config: ClientConfig): BaseChatModel {
		const model = this.models.find(m => m.id === modelId);
		if (!model && modelId !== this.getDefaultModelId()) { // Allow default even if not in list initially
			console.warn(`OpenAI model ${modelId} not explicitly listed, but attempting to use. Ensure it's a valid OpenAI model ID.`);
		}


		const client = new ChatOpenAI({
			apiKey: process.env.OPENAI_API_KEY,
			modelName: modelId,
			temperature: config.temperature ?? 0.7,
			...(config.providerClientOptions || {}),
		});

		// Bind for JSON mode
		return client.bind({
			response_format: { type: "json_object" },
		}) as BaseChatModel;
	}
}
