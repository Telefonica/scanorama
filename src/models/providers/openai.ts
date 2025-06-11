/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
import { ChatOpenAI, ChatOpenAICallOptions } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class OpenAIProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "openai";
	readonly friendlyName: string = "OpenAI";
	readonly docsUrl: string = "https://platform.openai.com/api-keys";

	private readonly models: ModelInfo[] = [
		{ id: "gpt-4.1", name: "GPT-4.1 (Flagship)", supportsTemperature: true },
		{ id: "gpt-4.1-mini", name: "GPT-4.1 mini", supportsTemperature: true },
		{ id: "gpt-4o", name: "GPT-4o", supportsTemperature: true },
		{ id: "gpt-4o-mini", name: "GPT-4o mini", supportsTemperature: true },
		{ id: "o4-mini", name: "o4-mini", supportsTemperature: false }, // Assuming modern
		{ id: "o3-mini", name: "o3-mini", supportsTemperature: false },
		{ id: "o1", name: "o1", supportsTemperature: false }, // Assuming chat model, likely supports
		{ id: "gpt-4-turbo", name: "GPT-4 Turbo", supportsTemperature: true },
		{ id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", supportsTemperature: true },
	];

	getDefaultModelId(): string {
		return "gpt-4.1"; // As per your list
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		return ["OPENAI_API_KEY"];
	}

	getClient(modelId: string, config: ClientConfig): BaseChatModel {
		const modelInfo = this.models.find(m => m.id === modelId);

		// If modelId isn't explicitly listed, we make an assumption it supports temperature,
		// but warn the user if it's not the default.
		let modelSupportsTemperature = true; // Default assumption
		if (modelInfo) {
			modelSupportsTemperature = modelInfo.supportsTemperature !== undefined ? modelInfo.supportsTemperature : true;
		} else if (modelId !== this.getDefaultModelId()) {
			console.warn(
				`\x1b[33mWarning:\x1b[0m OpenAI model \x1b[1m${modelId}\x1b[0m not explicitly listed in Scanorama's known models. ` +
				`Assuming it supports temperature. Ensure it's a valid OpenAI Chat Completions model ID.`
			);
		}


		const clientParams: ChatOpenAICallOptions & { modelName: string; apiKey?: string; temperature?: number } = {
			apiKey: process.env.OPENAI_API_KEY,
			modelName: modelId,
			// No default temperature here yet, apply it conditionally
		};

		if (config.temperature !== undefined) { // User specified a temperature
			if (modelSupportsTemperature) {
				clientParams.temperature = config.temperature;
			} else {
				console.warn(
					`\x1b[33mWarning:\x1b[0m Model \x1b[1m${modelId}\x1b[0m does not support or reliably use the 'temperature' parameter. ` +
					`The provided temperature of ${config.temperature} will be ignored or may not have an effect.`
				);
				// Do not set clientParams.temperature
			}
		} else { // User did NOT specify a temperature, apply Scanorama's default if supported
			if (modelSupportsTemperature) {
				clientParams.temperature = 0.7; // Your previous default
			} else {
				// If model doesn't support temp, and user didn't set one, let the model use its inherent behavior.
				// No warning needed here unless you want to be very verbose.
			}
		}


		if (config.providerClientOptions) {
			Object.assign(clientParams, config.providerClientOptions);
		}

		const client = new ChatOpenAI(clientParams);

		// Bind for JSON mode
		return client.bind({
			response_format: { type: "json_object" },
		}) as BaseChatModel; // Cast is fine if you are sure the bound version is compatible
	}
}
