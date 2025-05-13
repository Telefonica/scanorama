import {
	StateGraph,
	Annotation,
	START,
	END,
	CompiledStateGraph,
} from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { MCPTool, AnalysisResult } from '../types/State';
import { listFilesNode } from './ListFilesNode'; // New node
import { scanFileNode } from './ScanFileNode';   // Rewritten ScanNode
import { analyzeToolsNode } from './AnalyzeNode'; // Rewritten AnalyzeNode
import { FileBrowserTool } from '../tools/FileBrowserTool';

// Define the state structure for our graph
const AnubisGraphState = Annotation.Root({
	repoPath: Annotation<string>({
		value: (_prev, incoming) => incoming, // Always take the initial seeded value
	}),
	allSourceFiles: Annotation<string[]>({
		value: (_prev, incoming) => incoming,
		default: () => [],
	}),
	// To keep track of which files to scan next
	remainingFilesToScan: Annotation<string[]>({
		value: (prev, incoming) => {
			if (incoming === null) return []; // Explicitly clear
			if (prev.length === 0 && incoming.length > 0) return incoming; // Initial population
			if (incoming.length === 0 && prev.length > 0) return prev.slice(1); // "Pop" first element conceptually
			return incoming; // Allow direct setting/replacement
		},
		default: () => [],
	}),
	mcpTools: Annotation<MCPTool[]>({
		value: (prev, incoming) => [...prev, ...incoming], // Append new tools
		default: () => [],
	}),
	analysisResults: Annotation<AnalysisResult[]>({
		value: (_prev, incoming) => incoming, // Replace with new results
		default: () => [],
	}),
	currentFileProcessed: Annotation<string | null>({ // For clarity, which file was just processed
		value: (_prev, incoming) => incoming,
		default: () => null,
	}),
	errorMessages: Annotation<string[]>({
		value: (prev, incoming) => [...prev, ...incoming],
		default: () => [],
	}),
});

// TS type for our graph's state
export type GraphState = typeof AnubisGraphState.State;
// TS type for updates to our graph's state
export type GraphUpdate = typeof AnubisGraphState.Update;

export class Agent {
	private compiledGraph: CompiledStateGraph<GraphState, GraphUpdate, string>;
	private llm: BaseChatModel;
	private fileBrowserTool: FileBrowserTool;

	constructor(llm: BaseChatModel) {
		this.llm = llm;
		this.fileBrowserTool = new FileBrowserTool();

		const graphBuilder = new StateGraph(AnubisGraphState);

		// Define nodes
		graphBuilder.addNode('listFiles', this.callListFilesNode.bind(this));
		graphBuilder.addNode('scanFile', this.callScanFileNode.bind(this));
		graphBuilder.addNode('analyzeTools', this.callAnalyzeToolsNode.bind(this));

		// Define edges
		graphBuilder.addEdge(START, 'listFiles');
		graphBuilder.addConditionalEdges('listFiles',
			(state: GraphState) => state.allSourceFiles.length > 0 ? 'scanFile' : 'analyzeTools' // or END if no files & no tools
		);

		graphBuilder.addConditionalEdges('scanFile',
			(state: GraphState) => state.remainingFilesToScan.length > 0 ? 'scanFile' : 'analyzeTools'
		);

		graphBuilder.addEdge('analyzeTools', END);

		this.compiledGraph = graphBuilder.compile();
	}

	// Node execution wrappers to pass LLM and tools
	private async callListFilesNode(state: GraphState): Promise<GraphUpdate> {
		return listFilesNode(state, this.fileBrowserTool);
	}

	private async callScanFileNode(state: GraphState): Promise<GraphUpdate> {
		// ScanFileNode will now operate on the first file in remainingFilesToScan
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

		// console.log("Initial state for graph:", initialState);
		const finalState = await this.compiledGraph.invoke(initialState, {
			recursionLimit: 150, // Adjust as needed, depends on number of files
		});

		if (finalState.errorMessages && finalState.errorMessages.length > 0) {
			console.warn("Errors encountered during agent execution:", finalState.errorMessages);
		}

		// console.log("Final state from graph:", finalState);
		return finalState.analysisResults || [];
	}
}
