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
	): { provider: ILlmProvider; effectiveModelId: string; modelInfo?: ModelInfo; isExplicitlyListed: boolean } { // Added isExplicitlyListed
		const effectiveProviderSlug = providerSlug || "openai";
		const provider = this.getProvider(effectiveProviderSlug);

		if (!provider) {
			throw new Error(
				`Unsupported provider: ${effectiveProviderSlug}. Supported: ${Array.from(this.providers.keys()).join(", ")}`
			);
		}

		let effectiveModelId = modelIdFromCli || provider.getDefaultModelId();
		let modelInfo = provider.getModels().find(m => m.id === effectiveModelId);
		let isExplicitlyListed = !!modelInfo;

		// Special handling for Ollama and Azure where modelIdFromCli is the key
		if (provider.slug === "ollama" && modelIdFromCli) {
			effectiveModelId = modelIdFromCli;
			// For Ollama, if a modelId is given, it's considered "valid" even if not in conceptual list.
			// We can still create a placeholder modelInfo.
			if (!modelInfo) {
				modelInfo = { id: effectiveModelId, name: `Ollama Custom: ${effectiveModelId}` };
				// isExplicitlyListed remains false if not in the conceptual list
			} else {
				isExplicitlyListed = true;
			}
		} else if (provider.slug === "azure" && modelIdFromCli) {
			effectiveModelId = modelIdFromCli; // This is the deployment name
			// Check if this deployment name matches any *conceptual* ID we listed
			const conceptualMatch = provider.getModels().find(m => m.id === effectiveModelId);
			if (conceptualMatch) {
				modelInfo = conceptualMatch;
				isExplicitlyListed = true;
			} else {
				// If it's a custom deployment ID not in our conceptual list
				modelInfo = { id: effectiveModelId, name: `Azure Custom Deployment: ${effectiveModelId}` };
				isExplicitlyListed = false; // It's a user-provided ID not pre-listed
			}
		}


		// If after all checks, modelInfo is still undefined (e.g. user provided a model for OpenAI not in its list)
		// and it's not Ollama/Azure where we create placeholders for custom IDs.
		if (!modelInfo && provider.slug !== 'ollama' && provider.slug !== 'azure') {
			// For providers like OpenAI, Anthropic, Google, if the modelIdFromCli is not in their list,
			// it's unlisted. We don't create a placeholder modelInfo here as they have fixed model IDs.
			isExplicitlyListed = false;
		}


		return { provider, effectiveModelId, modelInfo, isExplicitlyListed };
	}

	getConfiguredClient(
		providerSlug?: ProviderSlug,
		modelIdFromCli?: string,
		clientConfig: ClientConfig = {}
	): BaseChatModel {
		// getModelAndProvider will throw if provider is invalid.
		// The interactive confirmation will happen in index.ts before this.
		const { provider, effectiveModelId } = this.getModelAndProvider(providerSlug, modelIdFromCli);

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

export const modelManager = new ModelManager();
