/**
 * @file src/lib/rate-limit.ts
 * Rate limiting đăng nhập: 5 lần sai → khóa 15 phút.
 * Dữ liệu lưu bảng `login_attempts` trên D1.
 */

import { eq } from 'drizzle-orm';
import { loginAttempts } from '../../db/schema';
import {
	LOGIN_LOCK_DURATION_SECONDS,
	MAX_LOGIN_ATTEMPTS,
} from './constants';
import type { Database } from './db';
import { normalizeUsername } from './security';

export interface LoginRateLimitResult {
	allowed: boolean;
	/** Số giây còn lại nếu bị khóa */
	retryAfterSeconds?: number;
}

/**
 * Tạo khóa identifier: `ip:username` (username đã normalize).
 */
export function buildLoginIdentifier(ip: string, username: string): string {
	const user = normalizeUsername(username) || '*';
	return `${ip}:${user}`;
}

/**
 * Lấy IP client (ưu tiên Cloudflare header).
 */
export function getClientIp(request: Request): string {
	const cfIp = request.headers.get('cf-connecting-ip');
	if (cfIp) return cfIp.trim();

	const forwarded = request.headers.get('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';

	return 'unknown';
}

/**
 * Kiểm tra có được phép thử đăng nhập không.
 */
export async function checkLoginRateLimit(
	db: Database,
	identifier: string,
): Promise<LoginRateLimitResult> {
	const rows = await db
		.select()
		.from(loginAttempts)
		.where(eq(loginAttempts.identifier, identifier))
		.limit(1);

	const record = rows[0];
	if (!record) return { allowed: true };

	const lockedUntil = record.lockedUntil;
	if (lockedUntil && lockedUntil.getTime() > Date.now()) {
		const retryAfterSeconds = Math.ceil(
			(lockedUntil.getTime() - Date.now()) / 1000,
		);
		return { allowed: false, retryAfterSeconds };
	}

	// Hết hạn khóa — reset nếu đã qua thời gian
	if (lockedUntil && lockedUntil.getTime() <= Date.now()) {
		await db
			.update(loginAttempts)
			.set({
				failedCount: 0,
				lockedUntil: null,
				updatedAt: new Date(),
			})
			.where(eq(loginAttempts.identifier, identifier));
	}

	return { allowed: true };
}

/**
 * Ghi nhận đăng nhập thất bại; khóa nếu đạt ngưỡng.
 */
export async function recordFailedLogin(
	db: Database,
	identifier: string,
): Promise<void> {
	const rows = await db
		.select()
		.from(loginAttempts)
		.where(eq(loginAttempts.identifier, identifier))
		.limit(1);

	const now = new Date();
	const existing = rows[0];

	if (!existing) {
		const failedCount = 1;
		const lockedUntil =
			failedCount >= MAX_LOGIN_ATTEMPTS
				? new Date(now.getTime() + LOGIN_LOCK_DURATION_SECONDS * 1000)
				: null;

		await db.insert(loginAttempts).values({
			identifier,
			failedCount,
			lockedUntil,
			updatedAt: now,
		});
		return;
	}

	const failedCount = existing.failedCount + 1;
	const lockedUntil =
		failedCount >= MAX_LOGIN_ATTEMPTS
			? new Date(now.getTime() + LOGIN_LOCK_DURATION_SECONDS * 1000)
			: existing.lockedUntil;

	await db
		.update(loginAttempts)
		.set({
			failedCount,
			lockedUntil,
			updatedAt: now,
		})
		.where(eq(loginAttempts.identifier, identifier));
}

/**
 * Xóa bộ đếm sau đăng nhập thành công.
 */
export async function clearLoginAttempts(
	db: Database,
	identifier: string,
): Promise<void> {
	await db.delete(loginAttempts).where(eq(loginAttempts.identifier, identifier));
}
