/**
 * @file src/lib/db.ts
 * Kết nối Drizzle ORM tới Cloudflare D1.
 *
 * Astro v6 + @astrojs/cloudflare: dùng `import { env } from 'cloudflare:workers'`
 * thay cho `locals.runtime.env` (đã deprecated).
 */

import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../db/schema';

/** Client Drizzle gắn schema đầy đủ */
export function getDb() {
	return drizzle(env.DB, { schema });
}

export type Database = ReturnType<typeof getDb>;
