/**
 * @file drizzle.config.ts
 * Cấu hình Drizzle Kit cho Cloudflare D1.
 *
 * Lệnh thường dùng:
 * - `npx drizzle-kit generate` — sinh migration SQL từ db/schema.ts (không cần kết nối D1)
 * - `npx drizzle-kit push`       — đẩy schema lên D1 remote (cần biến môi trường bên dưới)
 * - `npx drizzle-kit studio`     — UI xem/sửa dữ liệu trên D1 remote
 *
 * Biến môi trường (tạo file `.env` ở root, không commit):
 * - CLOUDFLARE_ACCOUNT_ID   — Account ID trên dashboard Cloudflare
 * - CLOUDFLARE_DATABASE_ID  — database_id từ `wrangler d1 create` / wrangler.toml
 * - CLOUDFLARE_API_TOKEN    — API token có quyền D1:Edit
 *
 * Migration SQL thủ công nằm trong `migrations/`; chạy bằng `npm run db:setup`.
 *
 * @see https://orm.drizzle.team/docs/get-started/d1-new
 */

import { defineConfig } from 'drizzle-kit';

/** Binding D1 trong wrangler.toml — phải khớp `[[d1_databases]].binding` */
const D1_BINDING_NAME = 'DB';

export default defineConfig({
	/** File định nghĩa bảng Drizzle */
	schema: './db/schema.ts',

	/** Thư mục chứa file .sql migration (khớp wrangler `migrations_dir`) */
	out: './migrations',

	/** D1 là SQLite-compatible */
	dialect: 'sqlite',

	/**
	 * Driver HTTP cho D1 production.
	 * Chỉ bắt buộc khi dùng push / migrate / studio trên database remote.
	 */
	driver: 'd1-http',

	dbCredentials: {
		accountId: process.env.CLOUDFLARE_ACCOUNT_ID ?? '',
		databaseId:
			process.env.CLOUDFLARE_DATABASE_ID ??
			// Fallback: đọc từ wrangler nếu chưa set env (dev convenience)
			process.env.D1_DATABASE_ID ??
			'',
		token:
			process.env.CLOUDFLARE_API_TOKEN ??
			process.env.CLOUDFLARE_D1_TOKEN ??
			'',
	},

	/** Bảng theo dõi migration đã chạy (khi dùng drizzle-kit migrate) */
	migrations: {
		table: '__drizzle_migrations',
	},

	/** In câu SQL khi generate — hữu ích khi debug */
	verbose: true,

	/** Tách file migration theo từng câu lệnh */
	breakpoints: true,
});

// Export tên binding để script khác có thể import nếu cần
export { D1_BINDING_NAME };
