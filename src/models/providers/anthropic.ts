import { ChatAnthropic } from "@langchain/anthropic";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class AnthropicProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "anthropic";
	readonly friendlyName: string = "Anthropic";
	readonly docsUrl: string = "https://console.anthropic.com/settings/keys";

	private readonly models: ModelInfo[] = [
		{ id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
		{ id: "claude-3-sonnet-20240229", name: "Claude 3 Sonnet" },
		{ id: "claude-3-haiku-20240307", name: "Claude 3 Haiku" },
	];

	getDefaultModelId(): string {
		return "claude-3-haiku-20240307";
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		return ["ANTHROPIC_API_KEY"];
	}

	getClient(modelId: string, config: ClientConfig): BaseChatModel {
		// Anthropic Claude 3 models are good with JSON if prompted correctly.
		// For true structured output, `withStructuredOutput` and a Zod schema would be used.
		// Here, we rely on Scanorama's prompts to request JSON.
		console.warn(`\x1b[43m\x1b[30mFYI\x1b[0m For Anthropic, Scanorama relies on strong prompting to get JSON.`);
		return new ChatAnthropic({
			apiKey: process.env.ANTHROPIC_API_KEY,
			modelName: modelId,
			temperature: config.temperature ?? 0.7,
			...(config.providerClientOptions || {}),
		});
	}
}
