/**
 * GET  /api/tags — danh sách
 * POST /api/tags — tạo mới
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../lib/api';
import {
	parseJsonBody,
	requireCsrf,
	validateSchema,
} from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import { createTag, getAllTags } from '../../../lib/db/tags';
import { requireAuth, requireTaxonomyManager } from '../../../lib/permissions';
import { tagCreateSchema } from '../../../lib/validators/tags';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const db = getDb();
	const items = await getAllTags(db);
	return successResponse({ items });
};

export const POST: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const denied = requireTaxonomyManager(user);
	if (denied) return denied;

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

	const parsed = validateSchema(tagCreateSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const tag = await createTag(db, parsed.data);
	return successResponse(tag, 201);
};
