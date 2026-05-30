/**
 * @file src/lib/db/posts.ts
 * Truy vấn bài viết qua Drizzle ORM (prepared statements / parameterized).
 */

import { and, count, desc, eq, ne, or, sql, like } from 'drizzle-orm';
import type { PostStatus } from '../../../db/schema';
import {
	categories,
	postCategories,
	posts,
	postTags,
	tags,
} from '../../../db/schema';
import type { Database } from '../db';
import { slugify, appendSlugSuffix } from '../utils/slugify';
import { serializeDate } from '../api-helpers';

export interface PaginationParams {
	page: number;
	limit: number;
}

export interface PaginatedResult<T> {
	items: T[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface PostRelations {
	categoryIds: number[];
	tagIds: number[];
	categories: { id: number; name: string; slug: string }[];
	tags: { id: number; name: string; slug: string }[];
}

export interface PostDTO {
	id: number;
	title: string;
	slug: string;
	content: string;
	excerpt: string | null;
	featuredImage: string | null;
	status: PostStatus;
	authorId: number;
	publishedAt: string | null;
	updatedAt: string;
	viewCount: number;
	categoryIds: number[];
	tagIds: number[];
	categories: PostRelations['categories'];
	tags: PostRelations['tags'];
}

export interface CreatePostData {
	title: string;
	slug?: string;
	content: string;
	excerpt?: string | null;
	featuredImage?: string | null;
	status: PostStatus;
	authorId: number;
	categoryIds?: number[];
	tagIds?: number[];
}

export type UpdatePostData = Partial<
	Omit<CreatePostData, 'authorId'>
> & {
	authorId?: never;
};

export async function loadPostRelations(
	db: Database,
	postId: number,
): Promise<PostRelations> {
	const catRows = await db
		.select({
			id: categories.id,
			name: categories.name,
			slug: categories.slug,
		})
		.from(postCategories)
		.innerJoin(categories, eq(postCategories.categoryId, categories.id))
		.where(eq(postCategories.postId, postId));

	const tagRows = await db
		.select({
			id: tags.id,
			name: tags.name,
			slug: tags.slug,
		})
		.from(postTags)
		.innerJoin(tags, eq(postTags.tagId, tags.id))
		.where(eq(postTags.postId, postId));

	return {
		categoryIds: catRows.map((c) => c.id),
		tagIds: tagRows.map((t) => t.id),
		categories: catRows,
		tags: tagRows,
	};
}

export function toPostDTO(
	row: typeof posts.$inferSelect,
	relations: PostRelations,
): PostDTO {
	return {
		id: row.id,
		title: row.title,
		slug: row.slug,
		content: row.content,
		excerpt: row.excerpt,
		featuredImage: row.featuredImage,
		status: row.status,
		authorId: row.authorId,
		publishedAt: serializeDate(row.publishedAt),
		updatedAt: serializeDate(row.updatedAt) ?? new Date().toISOString(),
		viewCount: row.viewCount,
		categoryIds: relations.categoryIds,
		tagIds: relations.tagIds,
		categories: relations.categories,
		tags: relations.tags,
	};
}

/** Kiểm tra slug unique; trả về slug khả dụng */
async function resolveUniquePostSlug(
	db: Database,
	baseSlug: string,
	excludeId?: number,
): Promise<string> {
	let attempt = 1;
	let candidate = baseSlug;

	while (attempt < 100) {
		const rows = await db
			.select({ id: posts.id })
			.from(posts)
			.where(
				excludeId
					? and(eq(posts.slug, candidate), ne(posts.id, excludeId))
					: eq(posts.slug, candidate),
			)
			.limit(1);

		if (!rows[0]) return candidate;
		attempt += 1;
		candidate = appendSlugSuffix(baseSlug, attempt);
	}

	return `${baseSlug}-${Date.now()}`;
}

async function syncPostCategories(
	db: Database,
	postId: number,
	categoryIds: number[],
): Promise<void> {
	await db.delete(postCategories).where(eq(postCategories.postId, postId));
	if (categoryIds.length === 0) return;
	await db.insert(postCategories).values(
		categoryIds.map((categoryId) => ({ postId, categoryId })),
	);
}

async function syncPostTags(
	db: Database,
	postId: number,
	tagIds: number[],
): Promise<void> {
	await db.delete(postTags).where(eq(postTags.postId, postId));
	if (tagIds.length === 0) return;
	await db.insert(postTags).values(tagIds.map((tagId) => ({ postId, tagId })));
}

/**
 * Danh sách bài viết có phân trang và lọc status.
 */
export async function getAllPosts(
	db: Database,
	page: number,
	limit: number,
	status?: PostStatus,
	authorId?: number,
): Promise<PaginatedResult<PostDTO>> {
	const offset = (page - 1) * limit;
	const filters = [];

	if (status) filters.push(eq(posts.status, status));
	if (authorId !== undefined) filters.push(eq(posts.authorId, authorId));

	const whereClause = filters.length > 0 ? and(...filters) : undefined;

	const [totalRow] = await db
		.select({ total: count() })
		.from(posts)
		.where(whereClause);

	const total = totalRow?.total ?? 0;

	const rows = await db
		.select()
		.from(posts)
		.where(whereClause)
		.orderBy(desc(posts.publishedAt), desc(posts.updatedAt))
		.limit(limit)
		.offset(offset);

	const items: PostDTO[] = [];
	for (const row of rows) {
		const relations = await loadPostRelations(db, row.id);
		items.push(toPostDTO(row, relations));
	}

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	};
}

/**
 * Chi tiết bài theo id.
 */
export async function getPostById(
	db: Database,
	id: number,
): Promise<PostDTO | null> {
	const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
	const row = rows[0];
	if (!row) return null;
	const relations = await loadPostRelations(db, id);
	return toPostDTO(row, relations);
}

/**
 * Chi tiết bài theo slug.
 */
export async function getPostBySlug(
	db: Database,
	slug: string,
): Promise<PostDTO | null> {
	const rows = await db.select().from(posts).where(eq(posts.slug, slug)).limit(1);
	const row = rows[0];
	if (!row) return null;
	const relations = await loadPostRelations(db, row.id);
	return toPostDTO(row, relations);
}

/**
 * Tạo bài viết mới.
 */
export async function createPost(
	db: Database,
	data: CreatePostData,
): Promise<PostDTO> {
	const baseSlug = slugify(data.slug ?? data.title);
	const slug = await resolveUniquePostSlug(db, baseSlug || 'post');
	const now = new Date();
	const publishedAt = data.status === 'published' ? now : null;

	const inserted = await db
		.insert(posts)
		.values({
			title: data.title,
			slug,
			content: data.content,
			excerpt: data.excerpt ?? null,
			featuredImage: data.featuredImage || null,
			status: data.status,
			authorId: data.authorId,
			publishedAt,
			updatedAt: now,
		})
		.returning();

	const post = inserted[0];
	if (!post) throw new Error('Không tạo được bài viết');

	await syncPostCategories(db, post.id, data.categoryIds ?? []);
	await syncPostTags(db, post.id, data.tagIds ?? []);

	const relations = await loadPostRelations(db, post.id);
	return toPostDTO(post, relations);
}

/**
 * Cập nhật bài viết.
 */
export async function updatePost(
	db: Database,
	id: number,
	data: UpdatePostData,
): Promise<PostDTO | null> {
	const existing = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
	const row = existing[0];
	if (!row) return null;

	const now = new Date();
	const updates: Partial<typeof posts.$inferInsert> = { updatedAt: now };

	if (data.title !== undefined) updates.title = data.title;
	if (data.content !== undefined) updates.content = data.content;
	if (data.excerpt !== undefined) updates.excerpt = data.excerpt ?? null;
	if (data.featuredImage !== undefined) {
		updates.featuredImage = data.featuredImage || null;
	}
	if (data.status !== undefined) {
		updates.status = data.status;
		if (data.status === 'published' && !row.publishedAt) {
			updates.publishedAt = now;
		}
	}
	if (data.slug !== undefined || data.title !== undefined) {
		const base = slugify(data.slug ?? data.title ?? row.title);
		updates.slug = await resolveUniquePostSlug(db, base, id);
	}

	await db.update(posts).set(updates).where(eq(posts.id, id));

	if (data.categoryIds !== undefined) {
		await syncPostCategories(db, id, data.categoryIds);
	}
	if (data.tagIds !== undefined) {
		await syncPostTags(db, id, data.tagIds);
	}

	return getPostById(db, id);
}

/**
 * Xóa bài viết (cascade post_categories, post_tags, comments).
 */
export async function deletePost(db: Database, id: number): Promise<boolean> {
	const result = await db.delete(posts).where(eq(posts.id, id)).returning({ id: posts.id });
	return result.length > 0;
}

/**
 * Bài viết theo category slug.
 */
export async function getPostsByCategory(
	db: Database,
	categorySlug: string,
	page: number,
	limit: number,
	status?: PostStatus,
): Promise<PaginatedResult<PostDTO> | null> {
	const cat = await db
		.select()
		.from(categories)
		.where(eq(categories.slug, categorySlug))
		.limit(1);

	if (!cat[0]) return null;

	const offset = (page - 1) * limit;

	const filters = [eq(postCategories.categoryId, cat[0].id)];
	if (status) filters.push(eq(posts.status, status));

	const whereClause = and(...filters);

	const [totalRow] = await db
		.select({ total: count() })
		.from(posts)
		.innerJoin(postCategories, eq(posts.id, postCategories.postId))
		.where(whereClause);

	const total = totalRow?.total ?? 0;

	const rows = await db
		.select({ post: posts })
		.from(posts)
		.innerJoin(postCategories, eq(posts.id, postCategories.postId))
		.where(whereClause)
		.orderBy(desc(posts.publishedAt), desc(posts.updatedAt))
		.limit(limit)
		.offset(offset);

	const items: PostDTO[] = [];
	for (const { post } of rows) {
		const relations = await loadPostRelations(db, post.id);
		items.push(toPostDTO(post, relations));
	}

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	};
}

/**
 * Bài viết theo tag slug.
 */
export async function getPostsByTag(
	db: Database,
	tagSlug: string,
	page: number,
	limit: number,
	status?: PostStatus,
): Promise<PaginatedResult<PostDTO> | null> {
	const tagRow = await db
		.select()
		.from(tags)
		.where(eq(tags.slug, tagSlug))
		.limit(1);

	if (!tagRow[0]) return null;

	const offset = (page - 1) * limit;

	const tagFilters = [eq(postTags.tagId, tagRow[0].id)];
	if (status) tagFilters.push(eq(posts.status, status));
	const tagWhere = and(...tagFilters);

	const [totalRow] = await db
		.select({ total: count() })
		.from(posts)
		.innerJoin(postTags, eq(posts.id, postTags.postId))
		.where(tagWhere);

	const total = totalRow?.total ?? 0;

	const rows = await db
		.select({ post: posts })
		.from(posts)
		.innerJoin(postTags, eq(posts.id, postTags.postId))
		.where(tagWhere)
		.orderBy(desc(posts.publishedAt), desc(posts.updatedAt))
		.limit(limit)
		.offset(offset);

	const items: PostDTO[] = [];
	for (const { post } of rows) {
		const relations = await loadPostRelations(db, post.id);
		items.push(toPostDTO(post, relations));
	}

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	};
}

/**
 * Bài published theo slug (null nếu không tồn tại hoặc chưa publish).
 */
export async function getPublishedPostBySlug(
	db: Database,
	slug: string,
): Promise<PostDTO | null> {
	const post = await getPostBySlug(db, slug);
	if (!post || post.status !== 'published') return null;
	return post;
}

/** Tăng view count (+1), trả về count mới. */
export async function incrementPostViewCount(db: Database, postId: number): Promise<number> {
	await db
		.update(posts)
		.set({ viewCount: sql`${posts.viewCount} + 1` })
		.where(eq(posts.id, postId));

	const rows = await db
		.select({ viewCount: posts.viewCount })
		.from(posts)
		.where(eq(posts.id, postId))
		.limit(1);

	return rows[0]?.viewCount ?? 0;
}

/**
 * Tìm kiếm bài published theo title / excerpt.
 */
export async function searchPublishedPosts(
	db: Database,
	query: string,
	page: number,
	limit: number,
): Promise<PaginatedResult<PostDTO>> {
	const q = query.trim();
	const offset = (page - 1) * limit;
	const pattern = `%${q.replace(/[%_]/g, '')}%`;

	const baseFilter = and(
		eq(posts.status, 'published'),
		or(like(posts.title, pattern), like(posts.excerpt, pattern)),
	);

	const [totalRow] = await db.select({ total: count() }).from(posts).where(baseFilter);
	const total = totalRow?.total ?? 0;

	const rows = await db
		.select()
		.from(posts)
		.where(baseFilter)
		.orderBy(desc(posts.publishedAt))
		.limit(limit)
		.offset(offset);

	const items: PostDTO[] = [];
	for (const row of rows) {
		const relations = await loadPostRelations(db, row.id);
		items.push(toPostDTO(row, relations));
	}

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.ceil(total / limit) || 1,
		},
	};
}
