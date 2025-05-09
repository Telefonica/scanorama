import * as fs from 'fs';
import { AnalysisResult } from './types';

/**
 * Print human-readable results to the console.
 */
export function printReport(results: AnalysisResult[]): void {
	console.dir(results);
}

/**
 * Write structured JSON report to a file.
 */
export function writeJsonReport(
	results: AnalysisResult[],
	repoUrl: string,
	outputPath: string
): void {
	const report = {
		repo: repoUrl,
		tools: results.map(r => ({
			name: r.name,
			description: r.description,
			injection: r.injection,
			explanation: r.explanation,
			file: r.file
		} as AnalysisResult))
	};
	fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
	console.log(`JSON report written to ${outputPath}`);
}
