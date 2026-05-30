/**
 * POST /api/newsletter/unsubscribe — hủy đăng ký newsletter.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import { unsubscribeNewsletter } from '../../../lib/db/newsletter';

export const prerender = false;

const schema = z.object({
	email: z.string().trim().email().max(255),
	csrf_token: z.string().optional(),
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

	const parsed = validateSchema(schema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const removed = await unsubscribeNewsletter(db, parsed.data.email);

	if (!removed) {
		return errorResponse('Email không có trong danh sách đăng ký.', 404);
	}

	return successResponse({ message: 'Đã hủy đăng ký newsletter.' });
};
