/**
 * PUT /api/comments/:id/spam — đánh dấu spam (admin/editor).
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../../lib/api';
import { parseJsonBody, requireCsrf } from '../../../../lib/api-helpers';
import { getCommentById, updateCommentStatus } from '../../../../lib/db/comments';
import { getDb } from '../../../../lib/db';
import { canManageTaxonomy, requireAuth } from '../../../../lib/permissions';

export const prerender = false;

export const PUT: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	if (!canManageTaxonomy(user)) {
		return errorResponse('Không có quyền quản lý bình luận.', 403);
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

	const db = getDb();
	const existing = await getCommentById(db, id);
	if (!existing) {
		return errorResponse('Không tìm thấy bình luận.', 404);
	}

	const updated = await updateCommentStatus(db, id, 'spam');
	if (!updated) {
		return errorResponse('Không thể cập nhật bình luận.', 500);
	}

	return successResponse(updated);
};
