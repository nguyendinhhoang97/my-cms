/**
 * @file src/lib/db/newsletter.ts
 * Đăng ký / hủy newsletter.
 */

import { count, desc, eq } from 'drizzle-orm';
import { newsletterEmails } from '../../../db/schema';
import type { Database } from '../db';

export interface NewsletterSubscriberDTO {
	id: number;
	email: string;
	subscribedAt: string;
}

function toDTO(row: typeof newsletterEmails.$inferSelect): NewsletterSubscriberDTO {
	return {
		id: row.id,
		email: row.email,
		subscribedAt: row.subscribedAt.toISOString(),
	};
}

export async function subscribeNewsletter(
	db: Database,
	email: string,
): Promise<{ subscriber: NewsletterSubscriberDTO; created: boolean }> {
	const normalized = email.trim().toLowerCase();
	const existing = await db
		.select()
		.from(newsletterEmails)
		.where(eq(newsletterEmails.email, normalized))
		.limit(1);

	if (existing[0]) {
		return { subscriber: toDTO(existing[0]), created: false };
	}

	const inserted = await db
		.insert(newsletterEmails)
		.values({ email: normalized })
		.returning();

	const row = inserted[0];
	if (!row) throw new Error('Không thể đăng ký newsletter');
	return { subscriber: toDTO(row), created: true };
}

export async function unsubscribeNewsletter(db: Database, email: string): Promise<boolean> {
	const normalized = email.trim().toLowerCase();
	const result = await db
		.delete(newsletterEmails)
		.where(eq(newsletterEmails.email, normalized))
		.returning({ id: newsletterEmails.id });
	return result.length > 0;
}

export async function deleteNewsletterSubscriber(db: Database, id: number): Promise<boolean> {
	const result = await db
		.delete(newsletterEmails)
		.where(eq(newsletterEmails.id, id))
		.returning({ id: newsletterEmails.id });
	return result.length > 0;
}

export async function listNewsletterSubscribers(
	db: Database,
	page = 1,
	limit = 20,
): Promise<{
	items: NewsletterSubscriberDTO[];
	pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
	const offset = (page - 1) * limit;

	const [rows, totalRow] = await Promise.all([
		db
			.select()
			.from(newsletterEmails)
			.orderBy(desc(newsletterEmails.subscribedAt))
			.limit(limit)
			.offset(offset),
		db.select({ total: count() }).from(newsletterEmails),
	]);

	const total = totalRow[0]?.total ?? 0;

	return {
		items: rows.map(toDTO),
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
		},
	};
}

/** Lấy tất cả emails cho export CSV. */
export async function getAllNewsletterEmails(db: Database): Promise<NewsletterSubscriberDTO[]> {
	const rows = await db
		.select()
		.from(newsletterEmails)
		.orderBy(desc(newsletterEmails.subscribedAt));
	return rows.map(toDTO);
}
