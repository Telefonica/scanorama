import { AzureChatOpenAI } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import type { ILlmProvider, ModelInfo, ClientConfig, ProviderSlug } from "../types";

export class AzureProvider implements ILlmProvider {
	readonly slug: ProviderSlug = "azure";
	readonly friendlyName: string = "Azure OpenAI";
	readonly docsUrl: string = "https://learn.microsoft.com/en-us/azure/ai-services/openai/reference";

	// These are conceptual models. User MUST provide their deployment ID via --model.
	private readonly models: ModelInfo[] = [
		{ id: "azure-gpt-4o", name: "GPT-4o (Azure - specify your deployment ID with --model)" },
		{ id: "azure-gpt-35-turbo", name: "GPT-3.5 Turbo (Azure - specify your deployment ID with --model)" },
	];

	getDefaultModelId(): string {
		// User MUST specify their deployment ID with --model for Azure.
		// This default is a placeholder and will likely cause an error if not overridden.
		return "your-default-azure-deployment-id";
	}

	getModels(): ModelInfo[] {
		return this.models;
	}

	getRequiredEnvVars(): string[] {
		return [
			"AZURE_OPENAI_API_KEY",
			"AZURE_OPENAI_ENDPOINT", // or AZURE_OPENAI_API_INSTANCE_NAME
			"AZURE_OPENAI_API_VERSION",
			// AZURE_OPENAI_API_DEPLOYMENT_NAME is handled by the modelId parameter
		];
	}

	getClient(deploymentId: string, config: ClientConfig): BaseChatModel {
		// For Azure, 'modelId' from CLI IS the deploymentId.
		const endpoint = process.env.AZURE_OPENAI_ENDPOINT || process.env.AZURE_OPENAI_API_INSTANCE_NAME;

		if (!deploymentId) {
			throw new Error("Azure OpenAI deployment ID is required. Please provide it using the --model option.");
		}
		if (!endpoint) {
			throw new Error("Azure OpenAI endpoint is required. Set AZURE_OPENAI_ENDPOINT or AZURE_OPENAI_API_INSTANCE_NAME.");
		}
		if (!process.env.AZURE_OPENAI_API_VERSION) {
			throw new Error("Azure OpenAI API version is required. Set AZURE_OPENAI_API_VERSION.");
		}
		if (!process.env.AZURE_OPENAI_API_KEY) {
			throw new Error("Azure OpenAI API key is required. Set AZURE_OPENAI_API_KEY.");
		}


		const client = new AzureChatOpenAI({
			apiKey: process.env.AZURE_OPENAI_API_KEY,
			azureOpenAIApiDeploymentName: deploymentId,
			azureOpenAIBasePath: endpoint.endsWith('/') ? `${endpoint}openai/deployments` : `${endpoint}/openai/deployments`,
			azureOpenAIApiVersion: process.env.AZURE_OPENAI_API_VERSION,
			temperature: config.temperature ?? 0.7,
			...(config.providerClientOptions || {}),
		});

		// Bind for JSON mode
		return client.bind({
			response_format: { type: "json_object" },
		}) as BaseChatModel;
	}
}
