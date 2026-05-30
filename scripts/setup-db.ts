/**
 * @file scripts/setup-db.ts
 * Chạy tất cả file migration SQL trong `migrations/` (theo thứ tự tên).
 *
 * Usage:
 *   npm run db:setup
 *   npm run db:setup -- --remote
 *   npm run db:setup -- --file=migrations/0002_auth.sql
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATIONS_DIR = join(PROJECT_ROOT, 'migrations');
const DEFAULT_D1_BINDING = 'DB';

interface SetupOptions {
	remote: boolean;
	binding: string;
	/** Chỉ chạy một file cụ thể */
	singleFile?: string;
}

function parseCliArgs(argv: string[]): SetupOptions {
	let remote = false;
	let binding = DEFAULT_D1_BINDING;
	let singleFile: string | undefined;

	for (const arg of argv) {
		if (arg === '--remote') remote = true;
		else if (arg.startsWith('--binding=')) binding = arg.slice('--binding='.length);
		else if (arg.startsWith('--file=')) singleFile = arg.slice('--file='.length);
		else if (arg === '--help' || arg === '-h') {
			printHelp();
			process.exit(0);
		}
	}

	return { remote, binding, singleFile };
}

function printHelp(): void {
	console.log(`
Chạy migration D1 cho my-cms

  npm run db:setup [-- --remote] [-- --file=migrations/0002_auth.sql]
`);
}

function listMigrationFiles(singleFile?: string): string[] {
	if (singleFile) {
		const path = join(PROJECT_ROOT, singleFile);
		if (!existsSync(path)) {
			console.error('❌ Không tìm thấy:', path);
			process.exit(1);
		}
		return [path];
	}

	if (!existsSync(MIGRATIONS_DIR)) {
		console.error('❌ Không có thư mục migrations/');
		process.exit(1);
	}

	return readdirSync(MIGRATIONS_DIR)
		.filter((f) => f.endsWith('.sql'))
		.sort()
		.map((f) => join(MIGRATIONS_DIR, f));
}

function executeFile(filePath: string, options: SetupOptions): boolean {
	const wranglerArgs = [
		'd1',
		'execute',
		options.binding,
		`--file=${filePath}`,
	];

	if (!options.remote) wranglerArgs.push('--local');

	console.log(`\n📦 Migration: ${filePath}`);
	const result = spawnSync('npx', ['wrangler', ...wranglerArgs], {
		cwd: PROJECT_ROOT,
		stdio: 'inherit',
	});

	return result.status === 0;
}

function main(): void {
	const options = parseCliArgs(process.argv.slice(2));
	const files = listMigrationFiles(options.singleFile);

	if (!existsSync(join(PROJECT_ROOT, 'wrangler.toml'))) {
		console.error('❌ Thiếu wrangler.toml');
		process.exit(1);
	}

	console.log('Môi trường:', options.remote ? 'remote' : 'local');
	console.log('Số file migration:', files.length);

	for (const file of files) {
		if (!executeFile(file, options)) {
			console.error('\n❌ Migration thất bại:', file);
			process.exit(1);
		}
	}

	console.log('\n✅ Tất cả migration đã chạy xong.');
}

main();
