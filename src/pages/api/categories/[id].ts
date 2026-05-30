/**
 * GET    /api/categories/:id
 * PUT    /api/categories/:id
 * DELETE /api/categories/:id — body: { confirm: true }
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
import {
	deleteCategory,
	getCategoryById,
	getCategoryPostCount,
	updateCategory,
} from '../../../lib/db/categories';
import { requireAuth, requireTaxonomyManager } from '../../../lib/permissions';
import {
	categoryIdParamSchema,
	categoryUpdateSchema,
} from '../../../lib/validators/categories';

export const prerender = false;

const deleteConfirmSchema = z.object({
	confirm: z.literal(true, { message: 'Gửi { "confirm": true } để xác nhận xóa.' }),
});

function parseId(params: Record<string, string | undefined>): number | Response {
	const parsed = categoryIdParamSchema.safeParse(params.id);
	if (!parsed.success) return errorResponse('ID category không hợp lệ.', 400);
	return parsed.data;
}

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

	const db = getDb();
	const category = await getCategoryById(db, id);
	if (!category) return errorResponse('Không tìm thấy category.', 404);

	const postCount = await getCategoryPostCount(db, id);
	return successResponse({ ...category, postCount });
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

	const parsed = validateSchema(categoryUpdateSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const updated = await updateCategory(db, id, parsed.data);
	if (!updated) return errorResponse('Không tìm thấy category.', 404);

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
	const deleted = await deleteCategory(db, id);
	if (!deleted) return errorResponse('Không tìm thấy category.', 404);

	return successResponse({ deleted: true, id });
};
