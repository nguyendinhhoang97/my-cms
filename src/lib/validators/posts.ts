/**
 * @file src/lib/validators/posts.ts
 * Schema Zod cho API bài viết.
 */

import { z } from 'zod';
import { postStatuses } from '../../../db/schema';

const statusSchema = z.enum(postStatuses);

export const postListQuerySchema = z.object({
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(10),
	status: statusSchema.optional(),
});

export const postCreateSchema = z.object({
	title: z.string().trim().min(1).max(500),
	slug: z.string().trim().min(1).max(200).optional(),
	content: z.string().min(1),
	excerpt: z.string().max(2000).optional().nullable(),
	featuredImage: z
		.union([z.string().url().max(2000), z.literal('')])
		.optional()
		.nullable()
		.transform((v) => (v === '' || v === undefined ? null : v)),
	status: statusSchema.default('draft'),
	categoryIds: z.array(z.coerce.number().int().positive()).optional().default([]),
	tagIds: z.array(z.coerce.number().int().positive()).optional().default([]),
});

export const postUpdateSchema = postCreateSchema.partial().extend({
	confirm: z.never().optional(),
});

export const postDeleteSchema = z.object({
	confirm: z.literal(true, { message: 'Gửi { "confirm": true } để xác nhận xóa.' }),
});

export const postIdParamSchema = z.coerce.number().int().positive();

export type PostCreateInput = z.infer<typeof postCreateSchema>;
export type PostUpdateInput = z.infer<typeof postUpdateSchema>;
