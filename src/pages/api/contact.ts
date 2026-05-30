/**
 * POST /api/contact — gửi form liên hệ.
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../lib/api-helpers';
import { createContact } from '../../lib/db/contacts';
import { getSiteSettings } from '../../lib/db/settings';
import { getDb } from '../../lib/db';
import { sendContactNotification } from '../../lib/email';

export const prerender = false;

const schema = z.object({
	name: z.string().trim().min(1).max(100),
	email: z.string().trim().email().max(255),
	message: z.string().trim().min(10).max(5000),
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

	try {
		const contact = await createContact(db, parsed.data);
		const siteSettings = await getSiteSettings(db);

		void sendContactNotification(siteSettings.contactEmail, {
			name: parsed.data.name,
			email: parsed.data.email,
			message: parsed.data.message,
		});

		return successResponse(
			{
				message: 'Cảm ơn! Tin nhắn đã được gửi. Chúng tôi sẽ phản hồi sớm.',
				id: contact.id,
			},
			201,
		);
	} catch (err) {
		console.error('[POST /api/contact]', err);
		return errorResponse('Không thể gửi tin nhắn.', 500);
	}
};
