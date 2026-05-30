/**
 * GET  /api/posts — danh sách (phân trang, filter status)
 * POST /api/posts — tạo bài mới
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../../lib/api';
import {
	parseJsonBody,
	parseQuery,
	requireCsrf,
	validateSchema,
} from '../../../lib/api-helpers';
import { getDb } from '../../../lib/db';
import {
	createPost,
	getAllPosts,
	getPostsByCategory,
	getPostsByTag,
} from '../../../lib/db/posts';
import {
	canCreatePost,
	listAuthorFilter,
	requireAuth,
} from '../../../lib/permissions';
import {
	postCreateSchema,
	postListQuerySchema,
} from '../../../lib/validators/posts';

export const prerender = false;

export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	const query = validateSchema(postListQuerySchema, parseQuery(context.url));
	if (!query.success) return query.response;

	const { page, limit, status } = query.data;
	const db = getDb();
	const authorId = listAuthorFilter(user);

	const categorySlug = context.url.searchParams.get('categorySlug') ?? undefined;
	const tagSlug = context.url.searchParams.get('tagSlug') ?? undefined;

	if (categorySlug) {
		const result = await getPostsByCategory(db, categorySlug, page, limit);
		if (!result) return errorResponse('Không tìm thấy category.', 404);
		if (authorId !== undefined) {
			result.items = result.items.filter((p) => p.authorId === authorId);
		}
		return successResponse(result);
	}

	if (tagSlug) {
		const result = await getPostsByTag(db, tagSlug, page, limit);
		if (!result) return errorResponse('Không tìm thấy tag.', 404);
		if (authorId !== undefined) {
			result.items = result.items.filter((p) => p.authorId === authorId);
		}
		return successResponse(result);
	}

	const result = await getAllPosts(db, page, limit, status, authorId);
	return successResponse(result);
};

export const POST: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	if (!canCreatePost(user)) {
		return errorResponse('Không có quyền tạo bài viết.', 403);
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

	const parsed = validateSchema(postCreateSchema, raw);
	if (!parsed.success) return parsed.response;

	const data = parsed.data;
	const db = getDb();

	try {
		const post = await createPost(db, {
			title: data.title,
			slug: data.slug,
			content: data.content,
			excerpt: data.excerpt,
			featuredImage: data.featuredImage,
			status: data.status,
			authorId: user.id,
			categoryIds: data.categoryIds,
			tagIds: data.tagIds,
		});
		return successResponse(post, 201);
	} catch (err) {
		console.error('[POST /api/posts]', err);
		return errorResponse('Không thể tạo bài viết.', 500);
	}
};
