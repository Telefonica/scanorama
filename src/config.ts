/**
 * SPDX-FileCopyrightText: © 2025 Telefónica Innovación Digital S.L.
 * SPDX-License-Identifier: LGPL-3.0-or-later
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as dotenv from 'dotenv';

const SCANORAMA_CONFIG_DIR_NAME = ".scanorama";
const SCANORAMA_CONFIG_DIR = path.join(os.homedir(), SCANORAMA_CONFIG_DIR_NAME);
const SCANORAMA_ENV_FILE = path.join(SCANORAMA_CONFIG_DIR, '.env');

function ensureConfigDirExists(): void {
	if (!fs.existsSync(SCANORAMA_CONFIG_DIR)) {
		try {
			fs.mkdirSync(SCANORAMA_CONFIG_DIR, { recursive: true });
		} catch (err) {
			console.error(`Failed to create Scanorama config directory at ${SCANORAMA_CONFIG_DIR}:`, err);
		}
	}
}

export function loadGlobalScanoramaEnv(): void {
	ensureConfigDirExists();
	if (fs.existsSync(SCANORAMA_ENV_FILE)) {
		// This loads variables into process.env if they aren't already set.
		// Shell variables take precedence.
		const globalConfig = dotenv.parse(fs.readFileSync(SCANORAMA_ENV_FILE));
		for (const k in globalConfig) {
			if (!(k in process.env)) { // Only set if not already in process.env (shell > global file)
				process.env[k] = globalConfig[k];
			}
		}
		// console.log(`Loaded global Scanorama config from: ${SCANORAMA_ENV_FILE}`);
	}
}

export function readGlobalScanoramaEnv(): Record<string, string> {
	ensureConfigDirExists();
	if (fs.existsSync(SCANORAMA_ENV_FILE)) {
		return dotenv.parse(fs.readFileSync(SCANORAMA_ENV_FILE));
	}
	return {};
}

export function setGlobalScanoramaEnvVar(key: string, value: string): void {
	ensureConfigDirExists();
	const currentEnv = readGlobalScanoramaEnv();
	const upperKey = key.toUpperCase();
	currentEnv[upperKey] = value;

	const envContent = Object.entries(currentEnv)
		.map(([k, v]) => `${k}=${JSON.stringify(v)}`) // Properly quote values
		.join('\n');

	try {
		fs.writeFileSync(SCANORAMA_ENV_FILE, envContent);
		console.log(`\x1b[32mSuccessfully set ${upperKey} in ${SCANORAMA_ENV_FILE}\x1b[0m`);
		console.log(`\x1b[33mNote:\x1b[0m If Scanorama is already running, changes may require a restart of the terminal/session for process.env to update, or a restart of the application if it caches environment variables at startup.`);
	} catch (err) {
		console.error(`Failed to write to Scanorama config file at ${SCANORAMA_ENV_FILE}:`, err);
	}
}

export function unsetGlobalScanoramaEnvVar(key: string): void {
	ensureConfigDirExists();
	const currentEnv = readGlobalScanoramaEnv();
	const upperKey = key.toUpperCase();

	if (currentEnv[upperKey]) {
		delete currentEnv[upperKey];
		const envContent = Object.entries(currentEnv)
			.map(([k, v]) => `${k}=${JSON.stringify(v)}`)
			.join('\n');
		try {
			fs.writeFileSync(SCANORAMA_ENV_FILE, envContent);
			console.log(`\x1b[32mSuccessfully unset ${upperKey} from ${SCANORAMA_ENV_FILE}\x1b[0m`);
		} catch (err) {
			console.error(`Failed to write to Scanorama config file at ${SCANORAMA_ENV_FILE}:`, err);
		}
	} else {
		console.log(`\x1b[33mKey ${upperKey} not found in ${SCANORAMA_ENV_FILE}\x1b[0m`);
	}
}

export function getGlobalConfigPath(): string {
	return SCANORAMA_ENV_FILE;
}
