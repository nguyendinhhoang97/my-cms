/**
 * @file src/lib/db/contacts.ts
 * Form liên hệ.
 */

import { and, count, desc, eq } from 'drizzle-orm';
import { contacts, type ContactStatus } from '../../../db/schema';
import type { Database } from '../db';

export interface ContactDTO {
	id: number;
	name: string;
	email: string;
	message: string;
	status: ContactStatus;
	createdAt: string;
}

function toDTO(row: typeof contacts.$inferSelect): ContactDTO {
	return {
		id: row.id,
		name: row.name,
		email: row.email,
		message: row.message,
		status: row.status,
		createdAt: row.createdAt.toISOString(),
	};
}

export async function createContact(
	db: Database,
	data: { name: string; email: string; message: string },
): Promise<ContactDTO> {
	const inserted = await db
		.insert(contacts)
		.values({
			name: data.name,
			email: data.email,
			message: data.message,
			status: 'pending',
		})
		.returning();

	const row = inserted[0];
	if (!row) throw new Error('Không thể lưu liên hệ');
	return toDTO(row);
}

export async function getContactById(db: Database, id: number) {
	const rows = await db.select().from(contacts).where(eq(contacts.id, id)).limit(1);
	return rows[0] ?? null;
}

export async function listContacts(
	db: Database,
	status?: ContactStatus,
	page = 1,
	limit = 20,
): Promise<{
	items: ContactDTO[];
	pagination: { page: number; limit: number; total: number; totalPages: number };
}> {
	const offset = (page - 1) * limit;
	const whereClause = status ? eq(contacts.status, status) : undefined;

	const [rows, totalRow] = await Promise.all([
		db
			.select()
			.from(contacts)
			.where(whereClause)
			.orderBy(desc(contacts.createdAt))
			.limit(limit)
			.offset(offset),
		whereClause
			? db.select({ total: count() }).from(contacts).where(whereClause)
			: db.select({ total: count() }).from(contacts),
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

export async function updateContactStatus(
	db: Database,
	id: number,
	status: ContactStatus,
): Promise<ContactDTO | null> {
	const existing = await getContactById(db, id);
	if (!existing) return null;

	await db.update(contacts).set({ status }).where(eq(contacts.id, id));
	return toDTO({ ...existing, status, createdAt: new Date(existing.createdAt) });
}

export async function deleteContact(db: Database, id: number): Promise<boolean> {
	const result = await db
		.delete(contacts)
		.where(eq(contacts.id, id))
		.returning({ id: contacts.id });
	return result.length > 0;
}

export async function countPendingContacts(db: Database): Promise<number> {
	const row = await db
		.select({ total: count() })
		.from(contacts)
		.where(eq(contacts.status, 'pending'));
	return row[0]?.total ?? 0;
}
