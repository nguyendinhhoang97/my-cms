/**
 * @file src/lib/api.ts
 * Helper trả về JSON / redirect thống nhất cho API routes.
 */

import { escapeHtml } from './security';

export interface ApiErrorBody {
	error: string;
}

export interface ApiSuccessBody<T = unknown> {
	ok: true;
	data?: T;
}

/**
 * JSON response với header no-store (tránh cache thông tin nhạy cảm).
 */
export function jsonResponse<T>(body: T, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff',
		},
	});
}

export function errorResponse(message: string, status: number): Response {
	return jsonResponse<ApiErrorBody>({ error: message }, status);
}

export function successResponse<T>(data?: T, status = 200): Response {
	return jsonResponse<ApiSuccessBody<T>>({ ok: true, data }, status);
}

/**
 * Redirect an toàn — chỉ cho phép path nội bộ (chống open redirect).
 */
export function safeRedirect(path: string, status = 302): Response {
	const safe =
		path.startsWith('/') && !path.startsWith('//') ? path : '/';
	return new Response(null, {
		status,
		headers: {
			Location: safe,
			'Cache-Control': 'no-store',
		},
	});
}

/**
 * Đọc form hoặc JSON body; ưu tiên `application/x-www-form-urlencoded` / multipart.
 */
export async function parseRequestBody(
	request: Request,
): Promise<Record<string, string>> {
	const contentType = request.headers.get('content-type') ?? '';

	if (contentType.includes('application/json')) {
		const data = (await request.json()) as Record<string, unknown>;
		const result: Record<string, string> = {};
		for (const [key, value] of Object.entries(data)) {
			if (typeof value === 'string') result[key] = value;
		}
		return result;
	}

	const formData = await request.formData();
	const result: Record<string, string> = {};
	for (const [key, value] of formData.entries()) {
		if (typeof value === 'string') result[key] = value;
	}
	return result;
}

/**
 * Kiểm tra client có muốn JSON (fetch API) hay form redirect (browser).
 */
export function wantsJsonResponse(request: Request): boolean {
	const accept = request.headers.get('accept') ?? '';
	return accept.includes('application/json');
}

/**
 * Thông báo lỗi đã escape — dùng khi echo vào HTML (hiếm khi cần).
 */
export function safeErrorMessage(message: string): string {
	return escapeHtml(message);
}
