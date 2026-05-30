/**
 * GET    /api/contacts — danh sách (admin)
 * PUT    /api/contacts — đánh dấu đã xử lý
 * DELETE /api/contacts — xóa
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../lib/api';
import { parseJsonBody, parseQuery, requireCsrf, validateSchema } from '../../lib/api-helpers';
import {
	deleteContact,
	getContactById,
	listContacts,
	updateContactStatus,
} from '../../lib/db/contacts';
import { getDb } from '../../lib/db';
import { requireAuth } from '../../lib/permissions';

export const prerender = false;

const listQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: z.enum(['pending', 'handled']).optional(),
});

const actionSchema = z.object({
	id: z.coerce.number().int().positive(),
	status: z.enum(['pending', 'handled']).optional(),
	csrf_token: z.string().optional(),
});

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Không có quyền.', 403);
	}

	const parsed = validateSchema(listQuerySchema, parseQuery(context.url));
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const result = await listContacts(db, parsed.data.status, parsed.data.page, parsed.data.limit);
	return successResponse(result);
};

export const PUT: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Không có quyền.', 403);
	}

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

	const parsed = validateSchema(actionSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const existing = await getContactById(db, parsed.data.id);
	if (!existing) return errorResponse('Không tìm thấy.', 404);

	const updated = await updateContactStatus(db, parsed.data.id, parsed.data.status ?? 'handled');
	return successResponse(updated);
};

export const DELETE: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Không có quyền.', 403);
	}

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

	const parsed = validateSchema(actionSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const deleted = await deleteContact(db, parsed.data.id);
	if (!deleted) return errorResponse('Không tìm thấy.', 404);

	return successResponse({ deleted: parsed.data.id });
};
