/**
 * GET /api/admin/backup/history — lịch sử backup trên R2.
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../../lib/api';
import { isR2Configured, listBackupHistory } from '../../../../lib/backup/storage';
import { requireAuth } from '../../../../lib/permissions';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Không có quyền.', 403);
	}

	if (!isR2Configured()) {
		return successResponse({ configured: false, items: [] });
	}

	try {
		const items = await listBackupHistory(30);
		return successResponse({ configured: true, items });
	} catch (err) {
		console.error('[GET /api/admin/backup/history]', err);
		return errorResponse('Không thể lấy lịch sử backup.', 500);
	}
};
