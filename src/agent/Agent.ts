// src/agent/AnubisAgent.ts
import { StateGraph, ChatOpenAI } from '@langchain/langgraph';
import { AgentState } from '../types/State';
import { FileBrowserTool } from '../tools/FileBrowserTool';
import { ScanNode } from './ScanNode';
import { AnalyzeNode } from './AnalyzeNode';
import * as path from 'path';

export class Agent {
	private graph: StateGraph<AgentState>;

	constructor(repoPath: string, openAiKey: string) {
		const llm = new ChatOpenAI({ apiKey: openAiKey, model: 'gpt-4.1' });
		this.graph = new StateGraph<AgentState>({
			initialState: { repoPath, tools: [], results: [] },
			tools: [new FileBrowserTool()],
			llm,
			nodes: [
				new ScanNode({ name: 'scan' }),
				new AnalyzeNode({ name: 'analyze' })
			],
			transitions: [
				['scan', 'analyze']
			]
		});
	}

	async run() {
		await this.graph.start('scan');
		return this.graph.state.results;
	}
}
