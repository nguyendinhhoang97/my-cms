/**
 * POST /api/auth/logout
 * Xóa session D1 và cookie.
 */

import type { APIRoute } from 'astro';
import {
	errorResponse,
	parseRequestBody,
	safeRedirect,
	successResponse,
	wantsJsonResponse,
} from '../../../lib/api';
import { validateCsrfToken } from '../../../lib/csrf';
import { getDb } from '../../../lib/db';
import {
	clearSessionCookie,
	destroySession,
	getSessionIdFromCookies,
} from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
	const db = getDb();
	const body = await parseRequestBody(request);

	const sessionId = getSessionIdFromCookies(cookies);

	const csrfOk = await validateCsrfToken({
		db,
		cookies,
		sessionId,
		submittedToken: body.csrf_token ?? request.headers.get('x-csrf-token') ?? undefined,
	});

	if (!csrfOk) {
		return errorResponse('Token CSRF không hợp lệ.', 403);
	}

	if (sessionId) {
		await destroySession(db, sessionId);
	}

	clearSessionCookie(cookies);

	if (wantsJsonResponse(request)) {
		return successResponse({ message: 'Đã đăng xuất.' });
	}

	return safeRedirect('/login');
};
