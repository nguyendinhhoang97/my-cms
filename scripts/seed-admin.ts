/**
 * @file scripts/seed-admin.ts
 * Tạo tài khoản admin đầu tiên (chạy local D1).
 *
 * Usage:
 *   ADMIN_USERNAME=admin ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=secret123 npx tsx scripts/seed-admin.ts
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BCRYPT_ROUNDS = 10;

async function main(): Promise<void> {
	const username = process.env.ADMIN_USERNAME ?? 'admin';
	const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
	const password = process.env.ADMIN_PASSWORD ?? 'admin12345';

	if (password.length < 8) {
		console.error('❌ ADMIN_PASSWORD tối thiểu 8 ký tự.');
		process.exit(1);
	}

	const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
	const sqlPath = join(ROOT, '.seed-admin.sql');
	const sql = `
INSERT OR IGNORE INTO users (username, email, password_hash, role)
VALUES ('${username.toLowerCase()}', '${email.toLowerCase()}', '${hash}', 'admin');
UPDATE users SET role = 'admin', password_hash = '${hash}' WHERE username = '${username.toLowerCase()}';
`;

	writeFileSync(sqlPath, sql.trim());

	const result = spawnSync(
		'npx',
		['wrangler', 'd1', 'execute', 'DB', '--local', `--file=${sqlPath}`],
		{ cwd: ROOT, stdio: 'inherit' },
	);

	if (existsSync(sqlPath)) {
		readFileSync(sqlPath);
		// cleanup
		spawnSync('rm', [sqlPath], { cwd: ROOT });
	}

	if (result.status !== 0) {
		process.exit(1);
	}

	console.log(`✅ Admin "${username}" đã sẵn sàng. Đăng nhập tại /login`);
}

main();
