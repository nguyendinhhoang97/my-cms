/**
 * GET /api/newsletter/export — export CSV (admin).
 * DELETE — xóa subscriber theo id (admin).
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse } from '../../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import {
	deleteNewsletterSubscriber,
	getAllNewsletterEmails,
} from '../../../lib/db/newsletter';
import { requireAuth } from '../../../lib/permissions';

export const prerender = false;

const deleteSchema = z.object({
	id: z.coerce.number().int().positive(),
	csrf_token: z.string().optional(),
});

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Không có quyền.', 403);
	}

	const db = getDb();
	const items = await getAllNewsletterEmails(db);

	const header = 'id,email,subscribed_at';
	const rows = items.map(
		(s) =>
			`${s.id},"${s.email.replace(/"/g, '""')}","${s.subscribedAt}"`,
	);
	const csv = [header, ...rows].join('\n');

	return new Response(csv, {
		status: 200,
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="newsletter-${Date.now()}.csv"`,
			'Cache-Control': 'no-store',
		},
	});
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

	const parsed = validateSchema(deleteSchema, raw);
	if (!parsed.success) return parsed.response;

	const db = getDb();
	const deleted = await deleteNewsletterSubscriber(db, parsed.data.id);
	if (!deleted) {
		return errorResponse('Không tìm thấy email.', 404);
	}

	return new Response(JSON.stringify({ ok: true, data: { deleted: parsed.data.id } }), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
	});
};
