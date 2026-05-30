/**
 * GET /api/auth/me
 * Trả về thông tin user hiện tại (từ session cookie).
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../lib/api';
import { getDb } from '../../../lib/db';
import { getUserFromSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
	const db = getDb();
	const auth = await getUserFromSession(db, cookies);

	if (!auth) {
		return errorResponse('Chưa đăng nhập.', 401);
	}

	return successResponse({ user: auth.user });
};
