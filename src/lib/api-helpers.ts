/**
 * @file src/lib/api-helpers.ts
 * Helper chung cho REST API: parse JSON, Zod, CSRF.
 */

import type { APIContext } from 'astro';
import { z } from 'zod';
import { errorResponse } from './api';
import { validateCsrfToken } from './csrf';
import { getDb } from './db';
import { getSessionIdFromCookies } from './session';

/**
 * Đọc body JSON (POST/PUT/DELETE).
 */
export async function parseJsonBody(request: Request): Promise<unknown> {
	const contentType = request.headers.get('content-type') ?? '';
	if (!contentType.includes('application/json')) {
		throw new Error('Content-Type phải là application/json');
	}
	return request.json();
}

/**
 * Validate bằng Zod; trả về Response lỗi hoặc data.
 */
export function validateSchema<T extends z.ZodType>(
	schema: T,
	data: unknown,
): { success: true; data: z.infer<T> } | { success: false; response: Response } {
	const result = schema.safeParse(data);
	if (!result.success) {
		const message = result.error.issues.map((e) => e.message).join('; ');
		return { success: false, response: errorResponse(message, 400) };
	}
	return { success: true, data: result.data };
}

/** Parse query string thành object */
export function parseQuery(url: URL): Record<string, string> {
	const out: Record<string, string> = {};
	for (const [key, value] of url.searchParams.entries()) {
		out[key] = value;
	}
	return out;
}

/**
 * CSRF cho mutation (POST/PUT/DELETE) — header hoặc body `csrf_token`.
 */
export async function requireCsrf(
	context: APIContext,
	body: Record<string, unknown>,
): Promise<Response | null> {
	const token =
		(typeof body.csrf_token === 'string' ? body.csrf_token : undefined) ??
		context.request.headers.get('x-csrf-token') ??
		undefined;

	const db = getDb();
	const ok = await validateCsrfToken({
		db,
		cookies: context.cookies,
		sessionId: getSessionIdFromCookies(context.cookies),
		submittedToken: token,
	});

	if (!ok) return errorResponse('Token CSRF không hợp lệ.', 403);
	return null;
}

/** CSRF từ header (multipart / FormData). */
export async function requireCsrfHeader(context: APIContext): Promise<Response | null> {
	const token = context.request.headers.get('x-csrf-token') ?? undefined;
	return requireCsrf(context, { csrf_token: token });
}

/** Chuyển Date → ISO string cho JSON */
export function serializeDate(value: Date | null | undefined): string | null {
	if (!value) return null;
	return value.toISOString();
}
