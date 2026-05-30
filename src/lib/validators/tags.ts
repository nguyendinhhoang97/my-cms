/**
 * @file src/lib/validators/tags.ts
 * Schema Zod cho API tags.
 */

import { z } from 'zod';

export const tagCreateSchema = z.object({
	name: z.string().trim().min(1).max(100),
	slug: z.string().trim().min(1).max(200).optional(),
});

export const tagUpdateSchema = tagCreateSchema.partial();

export const tagIdParamSchema = z.coerce.number().int().positive();

export type TagCreateInput = z.infer<typeof tagCreateSchema>;
export type TagUpdateInput = z.infer<typeof tagUpdateSchema>;
