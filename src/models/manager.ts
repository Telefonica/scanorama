import type { ILlmProvider, ProviderSlug, ModelInfo, ClientConfig } from "./types";
import { OpenAIProvider } from "./providers/openai";
import { AnthropicProvider } from "./providers/anthropic";
import { AzureProvider } from "./providers/azure";
import { OllamaProvider } from "./providers/ollama";
import { GoogleProvider } from "./providers/google";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export class ModelManager {
	private providers: Map<ProviderSlug, ILlmProvider>;

	constructor() {
		this.providers = new Map();
		this.registerProvider(new OpenAIProvider());
		this.registerProvider(new AnthropicProvider());
		this.registerProvider(new AzureProvider());
		this.registerProvider(new OllamaProvider());
		this.registerProvider(new GoogleProvider());
	}

	private registerProvider(provider: ILlmProvider): void {
		this.providers.set(provider.slug, provider);
	}

	getProvider(slug: ProviderSlug): ILlmProvider | undefined {
		return this.providers.get(slug);
	}

	getAllProviders(): ILlmProvider[] {
		return Array.from(this.providers.values());
	}

	getModelAndProvider(
		providerSlug?: ProviderSlug,
		modelIdFromCli?: string
	): { provider: ILlmProvider; effectiveModelId: string; modelInfo?: ModelInfo } {
		const effectiveProviderSlug = providerSlug || "openai"; // Default
		const provider = this.getProvider(effectiveProviderSlug);

		if (!provider) {
			throw new Error(
				`Unsupported provider: ${effectiveProviderSlug}. Supported: ${Array.from(this.providers.keys()).join(", ")}`
			);
		}

		let effectiveModelId = modelIdFromCli || provider.getDefaultModelId();

		// For Azure and Ollama, the modelIdFromCli is the definitive ID.
		if (provider.slug === "azure" && modelIdFromCli) {
			effectiveModelId = modelIdFromCli;
		} else if (provider.slug === "ollama" && modelIdFromCli) {
			effectiveModelId = modelIdFromCli;
		}

		const modelInfo = provider.getModels().find(m => m.id === effectiveModelId);
		// For Azure/Ollama, modelInfo might be undefined if user passes a custom ID not in conceptual list
		// but effectiveModelId will hold their input.

		return { provider, effectiveModelId, modelInfo };
	}

	getConfiguredClient(
		providerSlug?: ProviderSlug,
		modelIdFromCli?: string,
		clientConfig: ClientConfig = {}
	): BaseChatModel {
		const { provider, effectiveModelId } = this.getModelAndProvider(providerSlug, modelIdFromCli);

		// Check required environment variables
		const requiredEnvs = provider.getRequiredEnvVars(effectiveModelId);
		for (const envVar of requiredEnvs) {
			if (!process.env[envVar]) {
				throw new Error(
					`Missing environment variable ${envVar} for provider ${provider.friendlyName}. ` +
					`See docs: ${provider.docsUrl}`
				);
			}
		}
		return provider.getClient(effectiveModelId, clientConfig);
	}
}

// Singleton instance
export const modelManager = new ModelManager();
