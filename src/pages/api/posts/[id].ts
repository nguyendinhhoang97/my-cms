/**
 * GET    /api/posts/:id — chi tiết
 * PUT    /api/posts/:id — cập nhật
 * DELETE /api/posts/:id — xóa (body: { confirm: true })
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../lib/api';
import {
	parseJsonBody,
	requireCsrf,
	validateSchema,
} from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import { deletePost, getPostById, updatePost } from '../../../lib/db/posts';
import { canModifyPost, requireAuth } from '../../../lib/permissions';
import {
	postDeleteSchema,
	postIdParamSchema,
	postUpdateSchema,
} from '../../../lib/validators/posts';

export const prerender = false;

function parseId(params: Record<string, string | undefined>): number | Response {
	const parsed = postIdParamSchema.safeParse(params.id);
	if (!parsed.success) {
		return errorResponse('ID bài viết không hợp lệ.', 400);
	}
	return parsed.data;
}

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

	const db = getDb();
	const post = await getPostById(db, id);

	if (!post) {
		return errorResponse('Không tìm thấy bài viết.', 404);
	}

	if (user.role === 'author' && post.authorId !== user.id) {
		return errorResponse('Không có quyền xem bài viết này.', 403);
	}

	return successResponse(post);
};

export const PUT: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

	const db = getDb();
	const existing = await getPostById(db, id);

	if (!existing) {
		return errorResponse('Không tìm thấy bài viết.', 404);
	}

	if (!canModifyPost(user, { authorId: existing.authorId })) {
		return errorResponse('Không có quyền sửa bài viết này.', 403);
	}

	let raw: unknown;
	try {
		raw = await parseJsonBody(context.request);
	} catch {
		return errorResponse('Body phải là JSON hợp lệ.', 400);
	}

	const body =
		typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const csrfErr = await requireCsrf(context, body);
	if (csrfErr) return csrfErr;

	const parsed = validateSchema(postUpdateSchema, raw);
	if (!parsed.success) return parsed.response;

	const data = parsed.data;
	const updated = await updatePost(db, id, {
		title: data.title,
		slug: data.slug,
		content: data.content,
		excerpt: data.excerpt,
		featuredImage: data.featuredImage,
		status: data.status,
		categoryIds: data.categoryIds,
		tagIds: data.tagIds,
	});

	if (!updated) {
		return errorResponse('Không tìm thấy bài viết.', 404);
	}

	return successResponse(updated);
};

export const DELETE: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const id = parseId(context.params);
	if (id instanceof Response) return id;

	const db = getDb();
	const existing = await getPostById(db, id);

	if (!existing) {
		return errorResponse('Không tìm thấy bài viết.', 404);
	}

	if (!canModifyPost(user, { authorId: existing.authorId })) {
		return errorResponse('Không có quyền xóa bài viết này.', 403);
	}

	let raw: unknown;
	try {
		raw = await parseJsonBody(context.request);
	} catch {
		return errorResponse('Body phải là JSON hợp lệ.', 400);
	}

	const body =
		typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
	const csrfErr = await requireCsrf(context, body);
	if (csrfErr) return csrfErr;

	const parsed = validateSchema(postDeleteSchema, raw);
	if (!parsed.success) return parsed.response;

	const deleted = await deletePost(db, id);
	if (!deleted) {
		return errorResponse('Không tìm thấy bài viết.', 404);
	}

	return successResponse({ deleted: true, id });
};
