import type { BaseChatModel } from "@langchain/core/language_models/chat_models";

export type ProviderSlug = "openai" | "anthropic" | "google" | "ollama" | "azure";

export interface ModelInfo {
	id: string; // LangChain model ID, or deployment name for Azure, or user-defined for Ollama
	name: string;
	description?: string;
}

export interface ClientConfig {
	temperature?: number;
	ollamaBaseUrl?: string;
	providerClientOptions?: Record<string, unknown>;
}

export interface ILlmProvider {
	readonly slug: ProviderSlug;
	readonly friendlyName: string;
	readonly docsUrl: string;

	/**
	 * Lists the models supported by this provider.
	 * For providers like Ollama or Azure, this might list conceptual models,
	 * but the actual model/deployment ID is often user-provided.
	 */
	getModels(): ModelInfo[];

	/**
	 * Gets the default model ID for this provider.
	 */
	getDefaultModelId(): string;

	/**
	 * Retrieves the list of environment variables required for this provider to function.
	 * May vary based on the specific model if applicable (e.g. Azure deployment needing specific env vars).
	 */
	getRequiredEnvVars(modelId?: string): string[];

	/**
	 * Creates and returns a LangChain BaseChatModel instance for the given modelId.
	 * It should also attempt to configure the client for JSON output if applicable.
	 */
	getClient(modelId: string, config: ClientConfig): BaseChatModel;
}
