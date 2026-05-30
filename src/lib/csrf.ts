/**
 * @file src/lib/csrf.ts
 * Bảo vệ CSRF cho form POST.
 *
 * - Đã đăng nhập: token lưu trong bảng `sessions` (gắn session).
 * - Chưa đăng nhập: token trong cookie `cms_csrf` (httpOnly) + hidden field.
 */

import type { AstroCookies } from 'astro';
import { CSRF_COOKIE_NAME } from './constants';
import type { Database } from './db';
import { getSessionById, type SessionRow } from './session';
import { generateSecureToken, timingSafeEqual } from './security';

const CSRF_MAX_AGE_SECONDS = 60 * 60 * 2; // 2 giờ cho khách

/** Alias — token CSRF 32 bytes hex */
export function generateCsrfToken(): string {
	return generateSecureToken(32);
}

/**
 * Đặt cookie CSRF cho khách (chưa có session).
 */
export function setGuestCsrfCookie(cookies: AstroCookies, token: string): void {
	const secure = import.meta.env.PROD;
	cookies.set(CSRF_COOKIE_NAME, token, {
		httpOnly: true,
		secure,
		sameSite: 'lax',
		path: '/',
		maxAge: CSRF_MAX_AGE_SECONDS,
	});
}

/**
 * Đảm bảo có token CSRF cho trang form (login/register).
 * Trả về token để render hidden input.
 */
export function ensureGuestCsrfToken(cookies: AstroCookies): string {
	const existing = cookies.get(CSRF_COOKIE_NAME)?.value;
	if (existing && existing.length >= 32) {
		return existing;
	}
	const token = generateCsrfToken();
	setGuestCsrfCookie(cookies, token);
	return token;
}

export interface CsrfValidationContext {
	db: Database;
	cookies: AstroCookies;
	sessionId: string | undefined;
	submittedToken: string | undefined;
}

/**
 * Xác thực CSRF token từ form/header.
 */
export async function validateCsrfToken(
	ctx: CsrfValidationContext,
): Promise<boolean> {
	const submitted = ctx.submittedToken?.trim();
	if (!submitted) return false;

	// Ưu tiên session đã đăng nhập
	if (ctx.sessionId) {
		const session = await getSessionById(ctx.db, ctx.sessionId);
		if (session && timingSafeEqual(submitted, session.csrfToken)) {
			return true;
		}
	}

	// Khách: so khớp cookie cms_csrf
	const cookieToken = ctx.cookies.get(CSRF_COOKIE_NAME)?.value;
	if (cookieToken && timingSafeEqual(submitted, cookieToken)) {
		return true;
	}

	return false;
}

/** Lấy token CSRF từ session row (đã đăng nhập). */
export function getCsrfFromSession(session: SessionRow): string {
	return session.csrfToken;
}
