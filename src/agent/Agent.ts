import {
	StateGraph,
	Annotation,
	START,
	END,
	CompiledStateGraph,
} from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ScanNode } from './ScanNode';
import { AnalyzeNode } from './AnalyzeNode';
import type { Tool } from '../types/Tool';
import type { AnalysisResult } from '../types/AnalysisResult';

const StateAnnotation = Annotation.Root({
	repoPath: Annotation<string>({
		default: () => '',                          // will be overridden at runtime
		description: 'The path to the repository',
	}),
	tools: Annotation<Tool[]>({
		default: () => [],
		reducer: (left, right) => [...left, ...right],
		description: 'Tools to pass into each node',
	}),
	results: Annotation<AnalysisResult[]>({
		default: () => [],
		reducer: (_old, incoming) => incoming,
		description: 'The final analysis results',
	}),
});

// Extracted TS types for convenience
type State = typeof StateAnnotation.State;       // { repoPath: string; tools: Tool[]; results: AnalysisResult[] }
type Update = typeof StateAnnotation.Update;     // Partial<State>

export class Agent {
	private compiled: CompiledStateGraph<State, Update, string>;

	constructor(private repoPath: string, private llm: BaseChatModel) {
		// Patch the default repoPath into the annotation
		StateAnnotation.definition.repoPath.default = () => this.repoPath;

		// Build the graph
		const builder = new StateGraph(StateAnnotation)
			.addNode('scan', (state: State) => ScanNode(state, { llm: this.llm }))
			.addNode('analyze', (state: State) => AnalyzeNode(state, { llm: this.llm }))
			.addEdge(START, 'scan')
			.addEdge('scan', 'analyze')
			.addEdge('analyze', END);

		// Compile it
		this.compiled = builder.compile();
	}

	/**
	 * Kick off the graph from an empty initial state.
	 * Returns whatever ended up in `results`.
	 */
	public async run(): Promise<AnalysisResult[]> {
		// You must seed all keys of your state if you want to pass an initial value,
		// but since we provided defaults in the Annotation, we can just pass `{}`.
		const finalState = await this.compiled.invoke({}, { llm: this.llm });
		return finalState.results;
	}
}
