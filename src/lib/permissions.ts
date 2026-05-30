/**
 * @file src/lib/permissions.ts
 * Kiểm tra quyền CMS: admin, editor, author.
 *
 * - admin / editor: quản lý mọi bài viết, categories, tags
 * - author: chỉ tạo/sửa/xóa bài của chính mình; không CRUD taxonomy
 */

import type { APIContext } from 'astro';
import { errorResponse } from './api';
import type { SafeUser } from './auth';

/** Cần đăng nhập */
export function requireAuth(context: APIContext): SafeUser | Response {
	const user = context.locals.user;
	if (!user) {
		return errorResponse('Yêu cầu đăng nhập.', 401);
	}
	return user;
}

/** admin hoặc editor */
export function canManageTaxonomy(user: SafeUser): boolean {
	return user.role === 'admin' || user.role === 'editor';
}

/** Sửa/xóa bài: admin & editor — mọi bài; author — chỉ bài của mình */
export function canModifyPost(
	user: SafeUser,
	post: { authorId: number },
): boolean {
	if (user.role === 'admin' || user.role === 'editor') return true;
	return user.role === 'author' && post.authorId === user.id;
}

/** Tạo bài: mọi user đã đăng nhập */
export function canCreatePost(user: SafeUser): boolean {
	return ['admin', 'editor', 'author'].includes(user.role);
}

/** Lọc author_id khi author xem danh sách (không thấy bài người khác) */
export function listAuthorFilter(user: SafeUser): number | undefined {
	if (user.role === 'author') return user.id;
	return undefined;
}

export function requireTaxonomyManager(user: SafeUser): Response | null {
	if (!canManageTaxonomy(user)) {
		return errorResponse('Không có quyền quản lý danh mục/thẻ.', 403);
	}
	return null;
}

/** Upload ảnh: mọi user đã đăng nhập */
export function canUploadMedia(user: SafeUser): boolean {
	return ['admin', 'editor', 'author'].includes(user.role);
}

/** Xóa / quản lý media library: admin & editor */
export function canManageMedia(user: SafeUser): boolean {
	return user.role === 'admin' || user.role === 'editor';
}
