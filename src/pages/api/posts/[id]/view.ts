/**
 * POST /api/posts/:id/view — tăng view_count (cookie chống trùng 24h).
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../../lib/api';
import { getDb } from '../../../../lib/db';
import { getPostById, incrementPostViewCount } from '../../../../lib/db/posts';

export const prerender = false;

const VIEW_COOKIE_PREFIX = 'pv_';
const VIEW_COOKIE_MAX_AGE = 60 * 60 * 24; // 24h

export const POST: APIRoute = async (context) => {
	const id = Number(context.params.id);
	if (!Number.isFinite(id) || id < 1) {
		return errorResponse('ID không hợp lệ.', 400);
	}

	const db = getDb();
	const post = await getPostById(db, id);
	if (!post || post.status !== 'published') {
		return errorResponse('Bài viết không tồn tại.', 404);
	}

	const cookieName = `${VIEW_COOKIE_PREFIX}${id}`;
	const alreadyViewed = context.cookies.get(cookieName)?.value;

	if (alreadyViewed) {
		return successResponse({
			viewCount: post.viewCount,
			counted: false,
		});
	}

	context.cookies.set(cookieName, '1', {
		path: '/',
		maxAge: VIEW_COOKIE_MAX_AGE,
		sameSite: 'lax',
		httpOnly: true,
		secure: import.meta.env.PROD,
	});

	const viewCount = await incrementPostViewCount(db, id);

	return successResponse({
		viewCount,
		counted: true,
	});
};
