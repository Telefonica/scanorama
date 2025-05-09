import { simpleGit } from 'simple-git';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

/**
 * Clone a GitHub repository into a unique temporary directory.
 */
export async function cloneRepo(repoUrl: string): Promise<string> {
	const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anubis-'));
	const git = simpleGit();
	console.log(`Cloning ${repoUrl} into ${tmpDir}...`);
	await git.clone(repoUrl, tmpDir)
		.catch(err => { throw new Error(`Git clone failed: ${err}`); });
	return tmpDir;
}
