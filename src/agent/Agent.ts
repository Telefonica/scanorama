/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
import {
	StateGraph,
	Annotation,
	START,
	END,
	CompiledStateGraph,
} from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { MCPTool, AnalysisResult } from '../types/State'; // Assuming these are correctly defined
import { listFilesNode } from './ListFilesNode';
import { scanFileNode } from './ScanFileNode';
import { analyzeToolsNode } from './AnalyzeNode';
import { FileBrowserTool } from '../tools/FileBrowserTool';

// 1. Define the raw schema definition object
const anubisSchemaDefinition = {
	repoPath: Annotation<string>({
		value: (_prev, incoming) => incoming,
	}),
	allSourceFiles: Annotation<string[]>({
		value: (_prev, incoming) => incoming,
		default: () => [],
	}),
	remainingFilesToScan: Annotation<string[]>({
		value: (prev, incoming) => {
			if (incoming === null) return [];
			const prevLength = prev?.length ?? 0;
			if (prevLength === 0 && incoming.length > 0) return incoming;
			if (incoming.length === 0 && prevLength > 0) return prev!.slice(1); // prev should exist if prevLength > 0
			return incoming;
		},
		default: () => [],
	}),
	mcpTools: Annotation<MCPTool[]>({
		value: (prev, incoming) => [...(prev ?? []), ...(incoming ?? [])],
		default: () => [],
	}),
	analysisResults: Annotation<AnalysisResult[]>({
		value: (_prev, incoming) => incoming,
		default: () => [],
	}),
	currentFileProcessed: Annotation<string | null>({
		value: (_prev, incoming) => incoming,
		default: () => null,
	}),
	errorMessages: Annotation<string[]>({
		value: (prev, incoming) => [...(prev ?? []), ...(incoming ?? [])],
		default: () => [],
	}),
};

type AnubisSchemaDefinitionType = typeof anubisSchemaDefinition;

const AnubisGraphAnnotationInstance = Annotation.Root(anubisSchemaDefinition);

export type GraphState = typeof AnubisGraphAnnotationInstance.State;
export type GraphUpdate = typeof AnubisGraphAnnotationInstance.Update;

type AnubisNodeNames = 'listFiles' | 'scanFile' | 'analyzeTools' | typeof START | typeof END;

export class Agent {
	private compiledGraph: CompiledStateGraph<GraphState, GraphUpdate, AnubisNodeNames>;
	private llm: BaseChatModel;
	private fileBrowserTool: FileBrowserTool;

	constructor(llm: BaseChatModel) {
		this.llm = llm;
		this.fileBrowserTool = new FileBrowserTool();

		const graphBuilder = new StateGraph<
			AnubisSchemaDefinitionType,
			GraphState,
			GraphUpdate,
			AnubisNodeNames
		>(AnubisGraphAnnotationInstance);

		// Define nodes
		graphBuilder.addNode('listFiles', this.callListFilesNode.bind(this));
		graphBuilder.addNode('scanFile', this.callScanFileNode.bind(this));
		graphBuilder.addNode('analyzeTools', this.callAnalyzeToolsNode.bind(this));

		// Define edges
		graphBuilder.addEdge(START, 'listFiles');
		graphBuilder.addConditionalEdges('listFiles',
			(state: GraphState) => (state.allSourceFiles && state.allSourceFiles.length > 0 ? 'scanFile' : 'analyzeTools')
		);
		graphBuilder.addConditionalEdges('scanFile',
			(state: GraphState) => (state.remainingFilesToScan && state.remainingFilesToScan.length > 0 ? 'scanFile' : 'analyzeTools')
		);
		graphBuilder.addEdge('analyzeTools', END);

		this.compiledGraph = graphBuilder.compile();
	}

	private async callListFilesNode(state: GraphState): Promise<GraphUpdate> {
		return listFilesNode(state, this.fileBrowserTool);
	}

	private async callScanFileNode(state: GraphState): Promise<GraphUpdate> {
		const currentFileToScan = state.remainingFilesToScan[0];
		return scanFileNode(state, this.llm, this.fileBrowserTool, currentFileToScan);
	}

	private async callAnalyzeToolsNode(state: GraphState): Promise<GraphUpdate> {
		return analyzeToolsNode(state, this.llm);
	}

	public async run(repoPath: string): Promise<AnalysisResult[]> {
		const initialState: GraphUpdate = {
			repoPath,
		};
		const finalState = await this.compiledGraph.invoke(initialState as Partial<GraphState>, { // Cast might be needed for initial invoke
			recursionLimit: 150,
		});

		if (finalState.errorMessages && finalState.errorMessages.length > 0) {
			console.warn("Errors encountered during agent execution:", finalState.errorMessages);
		}
		return finalState.analysisResults || [];
	}
}
