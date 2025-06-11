/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
import { ChatOllama } from "@langchain/ollama";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class OllamaProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "ollama";
	readonly friendlyName: string = "Ollama (Local)";
	readonly docsUrl: string = "https://ollama.com";

	// Ollama models are user-defined, so this list is conceptual.
	private readonly models: ModelInfo[] = [
		{ id: "custom", name: "Custom Model (specify with --model, e.g., llama3, mistral)" }
	];

	getDefaultModelId(): string {
		// User should specify their Ollama model.
		return "llama3"; // A common example, but user needs it pulled.
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		// OLLAMA_BASE_URL is optional
		return [];
	}

	getClient(modelId: string, config: ClientConfig): BaseChatModel {
		// For Ollama, modelId from CLI IS the actual model name.
		const baseUrl = process.env.OLLAMA_BASE_URL || config.ollamaBaseUrl || "http://localhost:11434";
		console.warn(`\x1b[43m\x1b[30mFYI\x1b[0m For Ollama, JSON output reliability depends heavily on the specific model's capabilities and your prompts.`);
		return new ChatOllama({
			baseUrl: baseUrl,
			model: modelId,
			temperature: config.temperature ?? 0.7,
			format: "json", // Attempt to use Ollama's JSON mode
			...(config.providerClientOptions || {}),
		});
	}
}
