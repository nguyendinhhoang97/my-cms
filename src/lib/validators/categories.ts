/**
 * @file src/lib/validators/categories.ts
 * Schema Zod cho API categories.
 */

import { z } from 'zod';

export const categoryCreateSchema = z.object({
	name: z.string().trim().min(1).max(200),
	slug: z.string().trim().min(1).max(200).optional(),
	description: z.string().max(5000).optional().nullable(),
});

export const categoryUpdateSchema = categoryCreateSchema.partial();

export const categoryIdParamSchema = z.coerce.number().int().positive();

export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;
export type CategoryUpdateInput = z.infer<typeof categoryUpdateSchema>;
