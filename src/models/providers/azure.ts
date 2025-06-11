/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
import { AzureChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";
import { DefaultModelIdError } from "../types";

export class AzureProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "azure";
	readonly friendlyName: string = "Azure OpenAI";
	readonly docsUrl: string = "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference";

	private readonly models: ModelInfo[] = [
		// Conceptual list: User provides their actual deployment ID via --model
		// The 'supportsTemperature' flag is less relevant now for Azure if we never send it.
		{ id: "o3-mini", name: "o3-mini (via Azure Deployment)" },
	];

	getDefaultModelId(): string {
		throw new DefaultModelIdError("Azure OpenAI provider requires you to specify your deployment ID using the --model option. There is no general default.");
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		return [
			"AZURE_OPENAI_API_KEY",
			"AZURE_OPENAI_ENDPOINT",
			"AZURE_OPENAI_API_VERSION",
		];
	}

	getClient(deploymentId: string, config: ClientConfig): BaseChatModel {
		const endpoint = process.env.AZURE_OPENAI_ENDPOINT;

		if (!deploymentId) {
			throw new Error("Azure OpenAI deployment ID is required. Please provide it using the --model option.");
		}
		if (!process.env.AZURE_OPENAI_API_KEY) throw new Error("Missing AZURE_OPENAI_API_KEY. See docs: " + this.docsUrl);
		if (!endpoint) throw new Error("Missing AZURE_OPENAI_ENDPOINT. See docs: " + this.docsUrl);
		if (!process.env.AZURE_OPENAI_API_VERSION) throw new Error("Missing AZURE_OPENAI_API_VERSION. See docs: " + this.docsUrl);

		// Temperature is NOT sent for Azure. The deployment's default will be used.
		if (config.temperature !== undefined) {
			console.warn(
				`\x1b[33mWarning:\x1b[0m The --temperature option is ignored for Azure OpenAI deployments. ` +
				`The temperature configured for the deployment '\x1b[1m${deploymentId}\x1b[0m' in Azure will be used.`
			);
		}
		console.log(
			`\x1b[36mInfo:\x1b[0m For Azure deployment '\x1b[1m${deploymentId}\x1b[0m', the temperature setting from Scanorama is ignored. ` +
			`The deployment's own default temperature will be used.`
		);

		// Correct type for AzureChatOpenAI constructor options
		const clientParams: ConstructorParameters<typeof AzureChatOpenAI>[0] = {
			apiKey: process.env.AZURE_OPENAI_API_KEY,
			azureADTokenProvider: undefined,
			azureOpenAIApiDeploymentName: deploymentId,
			azureOpenAIEndpoint: endpoint,
			azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
			// IMPORTANT: `temperature` property is omitted here.
			...(config.providerClientOptions || {}),
		};

		const client = new AzureChatOpenAI(clientParams);

		// Bind for JSON mode
		return client.bind({
			response_format: { type: "json_object" },
		}) as BaseChatModel;
	}
}
