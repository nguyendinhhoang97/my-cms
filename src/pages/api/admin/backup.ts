/**
 * GET /api/admin/backup — export D1 JSON (admin only).
 * Query: ?store=1 — lưu thêm bản sao lên R2 (nếu đã cấu hình).
 */

import type { APIRoute } from 'astro';
import { errorResponse } from '../../../lib/api';
import { listBackupHistory, saveBackupToR2, isR2Configured } from '../../../lib/backup/storage';
import { backupFilename, exportDatabase } from '../../../lib/db/backup';
import { getDb } from '../../../lib/db';
import { requireAuth } from '../../../lib/permissions';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return errorResponse('Chỉ admin mới được export database.', 403);
	}

	const storeToR2 = context.url.searchParams.get('store') === '1';

	try {
		const db = getDb();
		const backup = await exportDatabase(db);
		const json = JSON.stringify(backup, null, 2);
		const filename = backupFilename(backup.exportedAt);

		let storedKey: string | null = null;
		if (storeToR2 && isR2Configured()) {
			try {
				storedKey = await saveBackupToR2(json, filename);
			} catch (err) {
				console.error('[backup] R2 store failed:', err);
			}
		}

		return new Response(json, {
			status: 200,
			headers: {
				'Content-Type': 'application/json; charset=utf-8',
				'Content-Disposition': `attachment; filename="${filename}"`,
				'Cache-Control': 'no-store',
				...(storedKey ? { 'X-Backup-Stored': storedKey } : {}),
			},
		});
	} catch (err) {
		console.error('[GET /api/admin/backup]', err);
		return errorResponse('Không thể export database.', 500);
	}
};

/** HEAD — kiểm tra R2 backup có sẵn không */
export const HEAD: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;
	if (user.role !== 'admin') {
		return new Response(null, { status: 403 });
	}
	return new Response(null, {
		status: 200,
		headers: { 'X-R2-Configured': isR2Configured() ? '1' : '0' },
	});
};
