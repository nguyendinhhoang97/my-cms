/**
 * @file src/lib/db/comments.ts
 * Bình luận khách trên blog.
 */

import { and, count, desc, eq, inArray } from 'drizzle-orm';
import { comments, posts, type CommentStatus } from '../../../db/schema';
import type { Database } from '../db';

export interface CommentDTO {
	id: number;
	postId: number;
	authorName: string;
	content: string;
	createdAt: string;
}

export interface AdminCommentDTO {
	id: number;
	postId: number;
	postTitle: string;
	postSlug: string;
	authorName: string;
	authorEmail: string;
	content: string;
	status: CommentStatus;
	createdAt: string;
}

function toPublicDTO(row: typeof comments.$inferSelect): CommentDTO {
	return {
		id: row.id,
		postId: row.postId,
		authorName: row.authorName,
		content: row.content,
		createdAt: row.createdAt.toISOString(),
	};
}

function toAdminDTO(
	row: typeof comments.$inferSelect,
	post: { title: string; slug: string },
): AdminCommentDTO {
	return {
		id: row.id,
		postId: row.postId,
		postTitle: post.title,
		postSlug: post.slug,
		authorName: row.authorName,
		authorEmail: row.authorEmail,
		content: row.content,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
	};
}

/** Bình luận đã duyệt của một bài */
export async function getApprovedCommentsByPostId(
	db: Database,
	postId: number,
): Promise<CommentDTO[]> {
	const rows = await db
		.select()
		.from(comments)
		.where(and(eq(comments.postId, postId), eq(comments.status, 'approved')))
		.orderBy(desc(comments.createdAt));

	return rows.map(toPublicDTO);
}

export async function getCommentById(db: Database, id: number) {
	const rows = await db.select().from(comments).where(eq(comments.id, id)).limit(1);
	return rows[0] ?? null;
}

/** Danh sách comments theo status (admin). */
export async function getCommentsByStatus(
	db: Database,
	status: CommentStatus | CommentStatus[],
	page = 1,
	limit = 20,
): Promise<{
	items: AdminCommentDTO[];
	pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
	const statuses = Array.isArray(status) ? status : [status];
	const offset = (page - 1) * limit;

	const whereClause =
		statuses.length === 1
			? eq(comments.status, statuses[0]!)
			: inArray(comments.status, statuses);

	const [rows, totalRow] = await Promise.all([
		db
			.select({
				comment: comments,
				postTitle: posts.title,
				postSlug: posts.slug,
			})
			.from(comments)
			.innerJoin(posts, eq(comments.postId, posts.id))
			.where(whereClause)
			.orderBy(desc(comments.createdAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(comments).where(whereClause),
	]);

	const total = totalRow[0]?.total ?? 0;

	return {
		items: rows.map((r) => toAdminDTO(r.comment, { title: r.postTitle, slug: r.postSlug })),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

export async function countPendingComments(db: Database): Promise<number> {
	const row = await db
		.select({ total: count() })
		.from(comments)
		.where(eq(comments.status, 'pending'));
	return row[0]?.total ?? 0;
}

export async function createComment(
	db: Database,
	data: {
		postId: number;
		authorName: string;
		authorEmail: string;
		content: string;
	},
): Promise<CommentDTO> {
	const inserted = await db
		.insert(comments)
		.values({
			postId: data.postId,
			authorName: data.authorName,
			authorEmail: data.authorEmail,
			content: data.content,
			status: 'pending',
		})
		.returning();

	const row = inserted[0];
	if (!row) throw new Error('Không tạo được bình luận');
	return toPublicDTO(row);
}

export async function updateCommentStatus(
	db: Database,
	id: number,
	status: CommentStatus,
): Promise<AdminCommentDTO | null> {
	const existing = await getCommentById(db, id);
	if (!existing) return null;

	await db.update(comments).set({ status }).where(eq(comments.id, id));

	const postRows = await db
		.select({ title: posts.title, slug: posts.slug })
		.from(posts)
		.where(eq(posts.id, existing.postId))
		.limit(1);
	const post = postRows[0];
	if (!post) return null;

	return toAdminDTO({ ...existing, status }, post);
}

export async function deleteComment(db: Database, id: number): Promise<boolean> {
	const result = await db
		.delete(comments)
		.where(eq(comments.id, id))
		.returning({ id: comments.id });
	return result.length > 0;
}
