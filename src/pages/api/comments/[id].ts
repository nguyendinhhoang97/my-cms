/**
 * DELETE /api/comments/:id — xóa bình luận (chỉ admin).
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../../lib/api-helpers';
import { deleteComment, getCommentById } from '../../../lib/db/comments';
import { getDb } from '../../../lib/db';
import { requireAuth } from '../../../lib/permissions';
import { z } from 'zod';

export const prerender = false;

const deleteSchema = z.object({
	csrf_token: z.string().optional(),
});

export const DELETE: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	if (user.role !== 'admin') {
		return errorResponse('Chỉ admin mới được xóa bình luận.', 403);
	}

	const id = Number(context.params.id);
	if (!Number.isFinite(id) || id < 1) {
		return errorResponse('ID không hợp lệ.', 400);
	}

	let raw: unknown;
	try {
		raw = await parseJsonBody(context.request);
	} catch {
		raw = {};
	}

	const body =
		typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const csrfErr = await requireCsrf(context, body);
	if (csrfErr) return csrfErr;

	const parsed = validateSchema(deleteSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const existing = await getCommentById(db, id);
	if (!existing) {
		return errorResponse('Không tìm thấy bình luận.', 404);
	}

	const deleted = await deleteComment(db, id);
	if (!deleted) {
		return errorResponse('Không thể xóa bình luận.', 500);
	}

	return successResponse({ deleted: id });
};
