/**
 * @file src/lib/auth.ts
 * Kiểu user an toàn và helper truy vấn người dùng.
 */

import { eq } from 'drizzle-orm';
import type { User, UserRole } from '../../db/schema';
import { users } from '../../db/schema';
import type { Database } from './db';
import { normalizeEmail, normalizeUsername } from './security';

/** User trả về API / locals — không bao gồm password_hash */
export interface SafeUser {
	id: number;
	username: string;
	email: string;
	role: UserRole;
	createdAt: Date;
}

/**
 * Loại bỏ trường nhạy cảm trước khi gửi client hoặc gán `locals.user`.
 */
export function toSafeUser(user: User): SafeUser {
	return {
		id: user.id,
		username: user.username,
		email: user.email,
		role: user.role,
		createdAt: user.createdAt,
	};
}

export async function findUserByUsername(
	db: Database,
	username: string,
): Promise<User | undefined> {
	const normalized = normalizeUsername(username);
	const rows = await db
		.select()
		.from(users)
		.where(eq(users.username, normalized))
		.limit(1);
	return rows[0];
}

export async function findUserByEmail(
	db: Database,
	email: string,
): Promise<User | undefined> {
	const normalized = normalizeEmail(email);
	const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1);
	return rows[0];
}

export async function findUserById(db: Database, id: number): Promise<User | undefined> {
	const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
	return rows[0];
}
