/**
 * @file src/lib/db/categories.ts
 * CRUD categories — Drizzle parameterized queries.
 */

import { asc, count, eq } from 'drizzle-orm';
import { categories, postCategories } from '../../../db/schema';
import type { Database } from '../db';
import { slugify, appendSlugSuffix } from '../utils/slugify';

export interface CategoryDTO {
	id: number;
	name: string;
	slug: string;
	description: string | null;
	postCount?: number;
}

export interface CreateCategoryData {
	name: string;
	slug?: string;
	description?: string | null;
}

export type UpdateCategoryData = Partial<CreateCategoryData>;

async function resolveUniqueCategorySlug(
	db: Database,
	baseSlug: string,
	excludeId?: number,
): Promise<string> {
	let attempt = 1;
	let candidate = baseSlug;

	while (attempt < 100) {
		const rows = await db
			.select({ id: categories.id })
			.from(categories)
			.where(eq(categories.slug, candidate))
			.limit(1);

		if (!rows[0]) return candidate;
		if (excludeId && rows[0].id === excludeId) return candidate;

		attempt += 1;
		candidate = appendSlugSuffix(baseSlug, attempt);
	}

	return `${baseSlug}-${Date.now()}`;
}

function toDTO(row: typeof categories.$inferSelect, postCount?: number): CategoryDTO {
	return {
		id: row.id,
		name: row.name,
		slug: row.slug,
		description: row.description,
		...(postCount !== undefined ? { postCount } : {}),
	};
}

export async function getAllCategories(db: Database): Promise<CategoryDTO[]> {
	const rows = await db.select().from(categories).orderBy(asc(categories.name));
	return rows.map((r) => toDTO(r));
}

export async function getCategoryById(
	db: Database,
	id: number,
): Promise<CategoryDTO | null> {
	const rows = await db.select().from(categories).where(eq(categories.id, id)).limit(1);
	const row = rows[0];
	return row ? toDTO(row) : null;
}

export async function getCategoryBySlug(
	db: Database,
	slug: string,
): Promise<CategoryDTO | null> {
	const rows = await db
		.select()
		.from(categories)
		.where(eq(categories.slug, slug))
		.limit(1);
	const row = rows[0];
	return row ? toDTO(row) : null;
}

export async function createCategory(
	db: Database,
	data: CreateCategoryData,
): Promise<CategoryDTO> {
	const baseSlug = slugify(data.slug ?? data.name);
	const slug = await resolveUniqueCategorySlug(db, baseSlug || 'category');

	const inserted = await db
		.insert(categories)
		.values({
			name: data.name,
			slug,
			description: data.description ?? null,
		})
		.returning();

	const row = inserted[0];
	if (!row) throw new Error('Không tạo được category');
	return toDTO(row);
}

export async function updateCategory(
	db: Database,
	id: number,
	data: UpdateCategoryData,
): Promise<CategoryDTO | null> {
	const existing = await getCategoryById(db, id);
	if (!existing) return null;

	const updates: Partial<typeof categories.$inferInsert> = {};
	if (data.name !== undefined) updates.name = data.name;
	if (data.description !== undefined) updates.description = data.description ?? null;
	if (data.slug !== undefined || data.name !== undefined) {
		const base = slugify(data.slug ?? data.name ?? existing.name);
		updates.slug = await resolveUniqueCategorySlug(db, base, id);
	}

	await db.update(categories).set(updates).where(eq(categories.id, id));
	return getCategoryById(db, id);
}

export async function deleteCategory(db: Database, id: number): Promise<boolean> {
	const result = await db
		.delete(categories)
		.where(eq(categories.id, id))
		.returning({ id: categories.id });
	return result.length > 0;
}

/** Đếm bài trong category (trước khi xóa) */
export async function getCategoryPostCount(db: Database, id: number): Promise<number> {
	const [row] = await db
		.select({ total: count() })
		.from(postCategories)
		.where(eq(postCategories.categoryId, id));
	return row?.total ?? 0;
}
