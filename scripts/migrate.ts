/**
 * @file scripts/migrate.ts
 * Chạy migration D1 — alias của db:setup.
 *
 * Usage:
 *   npm run migrate
 *   npm run migrate -- --remote
 *   npm run migrate -- --file=migrations/0003_contacts.sql
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync('npm', ['run', 'db:setup', '--', ...process.argv.slice(2)], {
	cwd: ROOT,
	stdio: 'inherit',
	env: process.env,
});

process.exit(result.status ?? 1);
