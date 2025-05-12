import {
	StateGraph,
	Annotation,
	START,
	END,
	CompiledStateGraph,
} from '@langchain/langgraph';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { ScanNode } from './ScanNode';
import { AnalyzeNode } from './AnalyzeNode';
import type { MCPTool, AnalysisResult } from '../types/State';

// Each Annotation<T> needs a `value:` reducer, and may optionally have a `default: () => T`
const StateAnnotation = Annotation.Root({
	repoPath: Annotation<string>({
		// always take whatever we seed at invoke()
		value: (_old, incoming) => incoming,
	}),
	tools: Annotation<MCPTool[]>({
		value: (existing, incoming) => [...existing, ...incoming],
		default: () => [],
	}),
	results: Annotation<AnalysisResult[]>({
		value: (_old, incoming) => incoming,
		default: () => [],
	}),
});

// TS will infer:
type State = typeof StateAnnotation.State;   // { repoPath: string; tools: MCPTool[]; results: AnalysisResult[] }
type Update = typeof StateAnnotation.Update;  // Partial<State>

export class Agent {
	private compiled: CompiledStateGraph<State, Update, string>;

	constructor(private repoPath: string, private llm: BaseChatModel) {
		const builder = new StateGraph(StateAnnotation)
			.addNode('scan', state => ScanNode(state, { llm: this.llm }))
			.addNode('analyze', state => AnalyzeNode(state, { llm: this.llm }))
			.addEdge(START, 'scan')
			.addEdge('scan', 'analyze')
			.addEdge('analyze', END);

		this.compiled = builder.compile();
	}

	/** 
	 * Kick off the graph, seeding repoPath in the initial state. 
	 * (Nodes already have `llm` closed over from the ctor.)
	 */
	public async run(): Promise<AnalysisResult[]> {
		const initial: Partial<State> = { repoPath: this.repoPath };
		const finalState = await this.compiled.invoke(initial);
		return finalState.results;
	}
}
