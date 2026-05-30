/**
 * GET  /api/settings — lấy cấu hình site (public keys)
 * PUT  /api/settings — cập nhật (admin)
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { errorResponse, successResponse } from '../../lib/api';
import { parseJsonBody, requireCsrf, validateSchema } from '../../lib/api-helpers';
import {
	getSiteSettings,
	recordToSiteSettings,
	siteSettingsToRecord,
	updateSiteSettings,
} from '../../lib/db/settings';
import { getDb } from '../../lib/db';
import { requireAuth } from '../../lib/permissions';

export const prerender = false;

const updateSchema = z.object({
	site_title: z.string().trim().max(200).optional(),
	site_description: z.string().trim().max(500).optional(),
	logo: z.string().trim().max(2000).optional(),
	ga_id: z.string().trim().max(50).optional(),
	contact_email: z
		.string()
		.trim()
		.max(255)
		.refine((v) => v === '' || z.string().email().safeParse(v).success, {
			message: 'Email không hợp lệ',
		})
		.optional(),
	csrf_token: z.string().optional(),
});

export const GET: APIRoute = async () => {
	const db = getDb();
	const settings = await getSiteSettings(db);
	return successResponse(siteSettingsToRecord(settings));
};

export const PUT: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Chỉ admin mới được cập nhật cấu hình.', 403);
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

	const parsed = validateSchema(updateSchema, raw);
	if (!parsed.success) return parsed.response;

	const { csrf_token: _, ...data } = parsed.data;
	const db = getDb();
	const updated = await updateSiteSettings(db, recordToSiteSettings(data));

	return successResponse(siteSettingsToRecord(updated));
};
