/**
 * GET    /api/tags/:id
 * PUT    /api/tags/:id
 * DELETE /api/tags/:id — body: { confirm: true }
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../../lib/api';
import {
	parseJsonBody,
	requireCsrf,
	validateSchema,
} from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import { deleteTag, getTagById, getTagPostCount, updateTag } from '../../../lib/db/tags';
import { requireAuth, requireTaxonomyManager } from '../../../lib/permissions';
import { tagIdParamSchema, tagUpdateSchema } from '../../../lib/validators/tags';

export const prerender = false;

const deleteConfirmSchema = z.object({
	confirm: z.literal(true, { message: 'Gửi { "confirm": true } để xác nhận xóa.' }),
});

function parseId(params: Record<string, string | undefined>): number | Response {
	const parsed = tagIdParamSchema.safeParse(params.id);
	if (!parsed.success) return errorResponse('ID tag không hợp lệ.', 400);
	return parsed.data;
}

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

	const db = getDb();
	const tag = await getTagById(db, id);
	if (!tag) return errorResponse('Không tìm thấy tag.', 404);

	const postCount = await getTagPostCount(db, id);
	return successResponse({ ...tag, postCount });
};

export const PUT: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const denied = requireTaxonomyManager(user);
	if (denied) return denied;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

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

	const parsed = validateSchema(tagUpdateSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const updated = await updateTag(db, id, parsed.data);
	if (!updated) return errorResponse('Không tìm thấy tag.', 404);

	return successResponse(updated);
};

export const DELETE: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const denied = requireTaxonomyManager(user);
	if (denied) return denied;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

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

	const parsed = validateSchema(deleteConfirmSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const deleted = await deleteTag(db, id);
	if (!deleted) return errorResponse('Không tìm thấy tag.', 404);

	return successResponse({ deleted: true, id });
};
