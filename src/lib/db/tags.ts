/**
 * @file src/lib/db/tags.ts
 * CRUD tags — Drizzle parameterized queries.
 */

import { asc, count, eq } from 'drizzle-orm';
import { postTags, tags } from '../../../db/schema';
import type { Database } from '../db';
import { slugify, appendSlugSuffix } from '../utils/slugify';

export interface TagDTO {
	id: number;
	name: string;
	slug: string;
	postCount?: number;
}

export interface CreateTagData {
	name: string;
	slug?: string;
}

export type UpdateTagData = Partial<CreateTagData>;

async function resolveUniqueTagSlug(
	db: Database,
	baseSlug: string,
	excludeId?: number,
): Promise<string> {
	let attempt = 1;
	let candidate = baseSlug;

	while (attempt < 100) {
		const rows = await db
			.select({ id: tags.id })
			.from(tags)
			.where(eq(tags.slug, candidate))
			.limit(1);

		if (!rows[0]) return candidate;
		if (excludeId && rows[0].id === excludeId) return candidate;

		attempt += 1;
		candidate = appendSlugSuffix(baseSlug, attempt);
	}

	return `${baseSlug}-${Date.now()}`;
}

function toDTO(row: typeof tags.$inferSelect): TagDTO {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
	};
}

export async function getAllTags(db: Database): Promise<TagDTO[]> {
	const rows = await db.select().from(tags).orderBy(asc(tags.name));
	return rows.map(toDTO);
}

export async function getTagById(db: Database, id: number): Promise<TagDTO | null> {
	const rows = await db.select().from(tags).where(eq(tags.id, id)).limit(1);
	const row = rows[0];
	return row ? toDTO(row) : null;
}

export async function getTagBySlug(db: Database, slug: string): Promise<TagDTO | null> {
	const rows = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1);
	const row = rows[0];
	return row ? toDTO(row) : null;
}

export async function createTag(db: Database, data: CreateTagData): Promise<TagDTO> {
	const baseSlug = slugify(data.slug ?? data.name);
	const slug = await resolveUniqueTagSlug(db, baseSlug || 'tag');

	const inserted = await db
		.insert(tags)
		.values({
			name: data.name,
			slug,
		})
		.returning();

	const row = inserted[0];
	if (!row) throw new Error('Không tạo được tag');
	return toDTO(row);
}

export async function updateTag(
	db: Database,
	id: number,
	data: UpdateTagData,
): Promise<TagDTO | null> {
	const existing = await getTagById(db, id);
	if (!existing) return null;

	const updates: Partial<typeof tags.$inferInsert> = {};
	if (data.name !== undefined) updates.name = data.name;
	if (data.slug !== undefined || data.name !== undefined) {
		const base = slugify(data.slug ?? data.name ?? existing.name);
		updates.slug = await resolveUniqueTagSlug(db, base, id);
	}

	await db.update(tags).set(updates).where(eq(tags.id, id));
	return getTagById(db, id);
}

export async function deleteTag(db: Database, id: number): Promise<boolean> {
	const result = await db.delete(tags).where(eq(tags.id, id)).returning({ id: tags.id });
	return result.length > 0;
}

export async function getTagPostCount(db: Database, id: number): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(postTags)
		.where(eq(postTags.tagId, id));
	return row?.total ?? 0;
}
