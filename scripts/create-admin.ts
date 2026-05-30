/**
 * @file scripts/create-admin.ts
 * Tạo user admin đầu tiên.
 *
 * Usage:
 *   npm run create-admin -- --email=admin@example.com --password=secret123
 *   npm run create-admin -- --email=admin@example.com --password=secret123 --remote
 */

import { spawnSync } from 'node:child_process';
import { existsSync, writeFileSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BCRYPT_ROUNDS = 10;

interface CreateAdminOptions {
	username: string;
	email: string;
	password: string;
	remote: boolean;
}

function parseArgs(argv: string[]): CreateAdminOptions {
	let username = 'admin';
	let email = 'admin@example.com';
	let password = '';
	let remote = false;

	for (const arg of argv) {
		if (arg.startsWith('--username=')) username = arg.slice('--username='.length);
		else if (arg.startsWith('--email=')) email = arg.slice('--email='.length);
		else if (arg.startsWith('--password=')) password = arg.slice('--password='.length);
		else if (arg === '--remote') remote = true;
		else if (arg === '--help' || arg === '-h') {
			console.log(`
Tạo tài khoản admin

  npm run create-admin -- --email=admin@example.com --password=yourpassword
  npm run create-admin -- --email=admin@example.com --password=xxx --remote

Options:
  --username=   Tên đăng nhập (mặc định: admin)
  --email=      Email (bắt buộc)
  --password=   Mật khẩu (bắt buộc, tối thiểu 8 ký tự)
  --remote      Ghi vào D1 remote (production)
`);
			process.exit(0);
		}
	}

	return { username, email, password, remote };
}

function escapeSql(value: string): string {
	return value.replace(/'/g, "''");
}

async function main(): Promise<void> {
	const opts = parseArgs(process.argv.slice(2));

	if (!opts.email || !opts.password) {
		console.error('❌ Cần --email và --password.');
		console.error('   Ví dụ: npm run create-admin -- --email=admin@example.com --password=secret123');
		process.exit(1);
	}

	if (opts.password.length < 8) {
		console.error('❌ Mật khẩu tối thiểu 8 ký tự.');
		process.exit(1);
	}

	if (!existsSync(join(ROOT, 'wrangler.toml'))) {
		console.error('❌ Thiếu wrangler.toml');
		process.exit(1);
	}

	const username = opts.username.toLowerCase().trim();
	const email = opts.email.toLowerCase().trim();
	const hash = await bcrypt.hash(opts.password, BCRYPT_ROUNDS);

	const sqlPath = join(ROOT, '.create-admin.sql');
	const sql = `
-- Nếu email đã tồn tại (vd: đã /register) → nâng lên admin + đổi mật khẩu
UPDATE users SET role = 'admin', password_hash = '${hash}' WHERE email = '${escapeSql(email)}';

-- Tạo mới nếu chưa có username này
INSERT OR IGNORE INTO users (username, email, password_hash, role)
VALUES ('${escapeSql(username)}', '${escapeSql(email)}', '${hash}', 'admin');

-- Cập nhật theo username (khi email trùng user khác, bỏ qua đổi email)
UPDATE users SET role = 'admin', password_hash = '${hash}'
WHERE username = '${escapeSql(username)}' AND email = '${escapeSql(email)}';
`.trim();

	writeFileSync(sqlPath, sql);

	const wranglerArgs = ['wrangler', 'd1', 'execute', 'DB', `--file=${sqlPath}`];
	if (!opts.remote) wranglerArgs.push('--local');

	console.log(`Tạo admin: ${username} <${email}> (${opts.remote ? 'remote' : 'local'})`);

	const result = spawnSync('npx', wranglerArgs, { cwd: ROOT, stdio: 'inherit' });

	if (existsSync(sqlPath)) unlinkSync(sqlPath);

	if (result.status !== 0) {
		process.exit(1);
	}

	console.log(`✅ Admin "${username}" đã sẵn sàng. Đăng nhập tại /login`);
}

main();
