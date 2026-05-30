/**
 * POST /api/comments — gửi bình luận khách (status: pending).
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../../lib/api-helpers';
import { createComment } from '../../../lib/db/comments';
import { getDb } from '../../../lib/db';
import { getPostById } from '../../../lib/db/posts';

export const prerender = false;

const commentSchema = z.object({
	postId: z.coerce.number().int().positive(),
	authorName: z.string().trim().min(1).max(100),
	authorEmail: z.string().trim().email().max(255),
	content: z.string().trim().min(1).max(2000),
});

export const POST: APIRoute = async (context) => {
	let raw: unknown;
	try {
		raw = await parseJsonBody(context.request);
	} catch {
		return errorResponse('Body phải là JSON.', 400);
	}

	const body =
		typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const csrfErr = await requireCsrf(context, body);
	if (csrfErr) return csrfErr;

	const parsed = validateSchema(commentSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const post = await getPostById(db, parsed.data.postId);
	if (!post || post.status !== 'published') {
		return errorResponse('Bài viết không tồn tại.', 404);
	}

	await createComment(db, {
		postId: parsed.data.postId,
		authorName: parsed.data.authorName,
		authorEmail: parsed.data.authorEmail,
		content: parsed.data.content,
	});

	return successResponse({ message: 'Bình luận đã gửi, chờ duyệt.' }, 201);
};
