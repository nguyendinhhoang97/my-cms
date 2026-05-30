/**
 * GET    /api/media — danh sách media từ R2 (phân trang)
 * DELETE /api/media — xóa ảnh khỏi R2
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../../lib/api';
import {
	parseJsonBody,
	requireCsrf,
	validateSchema,
} from '../../../lib/api-helpers';
import { canManageMedia, requireAuth } from '../../../lib/permissions';
import { deleteFile, listFiles } from '../../../lib/r2';

export const prerender = false;

const listQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(24),
	continuationToken: z.string().optional(),
});

const deleteBodySchema = z.object({
	key: z.string().min(1),
	csrf_token: z.string().optional(),
});

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const parsed = validateSchema(listQuerySchema, {
		page: context.url.searchParams.get('page') ?? '1',
		limit: context.url.searchParams.get('limit') ?? '24',
		continuationToken: context.url.searchParams.get('continuationToken') ?? undefined,
	});
	if (!parsed.success) return parsed.response;

	const { page, limit, continuationToken } = parsed.data;

	try {
		const result = await listFiles(page, limit, continuationToken);
		return successResponse(result);
	} catch (err) {
		console.error('[GET /api/media]', err);
		return errorResponse('Không thể lấy danh sách media.', 500);
	}
};

export const DELETE: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	if (!canManageMedia(user)) {
		return errorResponse('Không có quyền xóa media.', 403);
	}

	let raw: unknown;
	try {
		raw = await parseJsonBody(context.request);
	} catch {
		return errorResponse('Body phải là JSON hợp lệ.', 400);
	}

	const body =
		typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const csrfErr = await requireCsrf(context, body);
	if (csrfErr) return csrfErr;

	const parsed = validateSchema(deleteBodySchema, raw);
	if (!parsed.success) return parsed.response;

	const { key } = parsed.data;

	if (!key.startsWith('uploads/')) {
		return errorResponse('Key không hợp lệ.', 400);
	}

	try {
		await deleteFile(key);
		return successResponse({ deleted: key });
	} catch (err) {
		console.error('[DELETE /api/media]', err);
		return errorResponse('Không thể xóa file.', 500);
	}
};
