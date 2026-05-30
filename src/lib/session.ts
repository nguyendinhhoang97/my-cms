/**
 * @file src/lib/session.ts
 * Quản lý session: cookie httpOnly + lưu trữ D1.
 */

import type { AstroCookies } from 'astro';
import { eq, lt } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { sessions } from '../../db/schema';
import {
	SESSION_COOKIE_NAME,
	SESSION_MAX_AGE_SECONDS,
} from './constants';
import { generateCsrfToken } from './csrf';
import type { Database } from './db';
import { findUserById, toSafeUser, type SafeUser } from './auth';

/** Row session từ DB */
export interface SessionRow {
	id: string;
	userId: number;
	csrfToken: string;
	expiresAt: Date;
}

function rowToSession(row: typeof sessions.$inferSelect): SessionRow {
	return {
		id: row.id,
		userId: row.userId,
		csrfToken: row.csrfToken,
		expiresAt: row.expiresAt,
	};
}

/**
 * Đọc session id từ cookie request.
 */
export function getSessionIdFromCookies(cookies: AstroCookies): string | undefined {
	return cookies.get(SESSION_COOKIE_NAME)?.value;
}

/**
 * Tùy chọn cookie session (httpOnly, secure prod, sameSite=lax).
 */
export function setSessionCookie(cookies: AstroCookies, sessionId: string): void {
	const secure = import.meta.env.PROD;
	cookies.set(SESSION_COOKIE_NAME, sessionId, {
		httpOnly: true,
		secure,
		sameSite: 'lax',
		path: '/',
		maxAge: SESSION_MAX_AGE_SECONDS,
	});
}

/** Xóa cookie session khi logout. */
export function clearSessionCookie(cookies: AstroCookies): void {
	cookies.delete(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Tạo session mới trong D1 và trả về id + csrf token.
 */
export async function createSession(
	db: Database,
	userId: number,
): Promise<SessionRow> {
	const id = uuidv4();
	const csrfToken = generateCsrfToken();
	const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

	await db.insert(sessions).values({
		id,
		userId,
		csrfToken,
		expiresAt,
	});

	return { id, userId, csrfToken, expiresAt };
}

/** Lấy session theo id; null nếu hết hạn hoặc không tồn tại. */
export async function getSessionById(
	db: Database,
	sessionId: string,
): Promise<SessionRow | null> {
	const rows = await db
		.select()
		.from(sessions)
		.where(eq(sessions.id, sessionId))
		.limit(1);

	const row = rows[0];
	if (!row) return null;

	if (row.expiresAt.getTime() <= Date.now()) {
		await db.delete(sessions).where(eq(sessions.id, sessionId));
		return null;
	}

	return rowToSession(row);
}

/** Xóa session khỏi D1 (logout). */
export async function destroySession(db: Database, sessionId: string): Promise<void> {
	await db.delete(sessions).where(eq(sessions.id, sessionId));
}

/**
 * Dọn session hết hạn (gọi định kỳ nhẹ trên request — không chặn UX).
 */
export async function purgeExpiredSessions(db: Database): Promise<void> {
	const now = new Date();
	await db.delete(sessions).where(lt(sessions.expiresAt, now));
}

/**
 * Từ cookie → SafeUser hoặc null.
 */
export async function getUserFromSession(
	db: Database,
	cookies: AstroCookies,
): Promise<{ user: SafeUser; session: SessionRow } | null> {
	const sessionId = getSessionIdFromCookies(cookies);
	if (!sessionId) return null;

	const session = await getSessionById(db, sessionId);
	if (!session) return null;

	const user = await findUserById(db, session.userId);
	if (!user) {
		await destroySession(db, sessionId);
		return null;
	}

	return { user: toSafeUser(user), session };
}
