/**
 * @file src/lib/seo/feed.ts
 * Dữ liệu published posts cho sitemap / RSS.
 */

import { desc, eq } from 'drizzle-orm';
import { posts } from '../../../db/schema';
import { serializeDate } from '../api-helpers';
import type { Database } from '../db';

export interface PublishedPostEntry {
	slug: string;
	title: string;
	excerpt: string | null;
	content: string;
	updatedAt: string;
	publishedAt: string | null;
}

export async function getPublishedPostsForFeed(
	db: Database,
	limit = 100,
): Promise<PublishedPostEntry[]> {
	const rows = await db
		.select({
			slug: posts.slug,
			title: posts.title,
			excerpt: posts.excerpt,
			content: posts.content,
			updatedAt: posts.updatedAt,
			publishedAt: posts.publishedAt,
		})
		.from(posts)
		.where(eq(posts.status, 'published'))
		.orderBy(desc(posts.publishedAt))
		.limit(limit);

	return rows.map((r) => ({
		slug: r.slug,
		title: r.title,
		excerpt: r.excerpt,
		content: r.content,
		updatedAt: serializeDate(r.updatedAt) ?? new Date().toISOString(),
		publishedAt: serializeDate(r.publishedAt),
	}));
}
