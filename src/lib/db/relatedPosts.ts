/**
 * Bài viết liên quan — scoring theo categories/tags + cache in-memory.
 */
import { and, desc, eq, inArray, ne } from 'drizzle-orm';
import { postCategories, posts, postTags } from '../../../db/schema';
import type { Database } from '../db';
import {
	loadPostRelations,
	toPostDTO,
	type PostDTO,
} from './posts';

const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { data: PostDTO[]; expires: number }>();

function cacheKey(postId: number, limit: number): string {
	return `${postId}:${limit}`;
}

function getCached(postId: number, limit: number): PostDTO[] | null {
	const entry = cache.get(cacheKey(postId, limit));
	if (!entry) return null;
	if (entry.expires < Date.now()) {
		cache.delete(cacheKey(postId, limit));
		return null;
	}
	return entry.data;
}

function setCache(postId: number, limit: number, data: PostDTO[]): void {
	cache.set(cacheKey(postId, limit), { data, expires: Date.now() + CACHE_TTL_MS });
}

/**
 * Lấy posts có cùng categories hoặc tags, sắp xếp theo điểm chung.
 */
export async function getRelatedPosts(
	db: Database,
	postId: number,
	limit = 3,
): Promise<PostDTO[]> {
	const cached = getCached(postId, limit);
	if (cached) return cached;

	const currentRelations = await loadPostRelations(db, postId);
	const { categoryIds, tagIds } = currentRelations;

	const scores = new Map<number, number>();

	if (categoryIds.length > 0) {
		const catRows = await db
			.select({ postId: postCategories.postId })
			.from(postCategories)
			.innerJoin(posts, eq(posts.id, postCategories.postId))
			.where(
				and(
					eq(posts.status, 'published'),
					ne(posts.id, postId),
					inArray(postCategories.categoryId, categoryIds),
				),
			);

		for (const row of catRows) {
			scores.set(row.postId, (scores.get(row.postId) ?? 0) + 2);
		}
	}

	if (tagIds.length > 0) {
		const tagRows = await db
			.select({ postId: postTags.postId })
			.from(postTags)
			.innerJoin(posts, eq(posts.id, postTags.postId))
			.where(
				and(
					eq(posts.status, 'published'),
					ne(posts.id, postId),
					inArray(postTags.tagId, tagIds),
				),
			);

		for (const row of tagRows) {
			scores.set(row.postId, (scores.get(row.postId) ?? 0) + 1);
		}
	}

	let candidateIds = [...scores.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([id]) => id);

	// Fallback: bài mới nhất nếu không có điểm chung
	if (candidateIds.length === 0) {
		const fallback = await db
			.select({ id: posts.id })
			.from(posts)
			.where(and(eq(posts.status, 'published'), ne(posts.id, postId)))
			.orderBy(desc(posts.publishedAt))
			.limit(limit);

		candidateIds = fallback.map((r) => r.id);
	}

	candidateIds = candidateIds.slice(0, limit * 2);

	const items: PostDTO[] = [];
	for (const id of candidateIds) {
		const rows = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
		const row = rows[0];
		if (!row) continue;
		const relations = await loadPostRelations(db, id);
		items.push(toPostDTO(row, relations));
		if (items.length >= limit) break;
	}

	// Sắp xếp lại theo score rồi ngày xuất bản
	items.sort((a, b) => {
		const scoreDiff = (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
		if (scoreDiff !== 0) return scoreDiff;
		const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
		const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
		return dateB - dateA;
	});

	const result = items.slice(0, limit);
	setCache(postId, limit, result);
	return result;
}

/** Xóa cache khi cập nhật bài (optional). */
export function invalidateRelatedPostsCache(postId?: number): void {
	if (postId === undefined) {
		cache.clear();
		return;
	}
	for (const key of cache.keys()) {
		if (key.startsWith(`${postId}:`)) cache.delete(key);
	}
}
