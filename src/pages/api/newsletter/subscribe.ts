/**
 * POST /api/newsletter/subscribe — đăng ký newsletter.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import { subscribeNewsletter } from '../../../lib/db/newsletter';

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

	try {
		const db = getDb();
		const { subscriber, created } = await subscribeNewsletter(db, parsed.data.email);
		return successResponse(
			{
				message: created
					? 'Đăng ký newsletter thành công!'
					: 'Email này đã được đăng ký.',
				email: subscriber.email,
			},
			created ? 201 : 200,
		);
	} catch (err) {
		console.error('[POST /api/newsletter/subscribe]', err);
		return errorResponse('Không thể đăng ký newsletter.', 500);
	}
};
