/**
 * @file src/lib/utils/slugify.ts
 * Chuyển title thành URL slug (ASCII, dấu gạch ngang).
 */

/**
 * Tạo slug cơ bản từ chuỗi (không đảm bảo unique).
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 200);
}

/**
 * Thêm hậu tố `-2`, `-3`, … nếu slug đã tồn tại.
 */
export function appendSlugSuffix(base: string, attempt: number): string {
	if (attempt <= 1) return base;
	const suffix = `-${attempt}`;
	const maxBase = 200 - suffix.length;
	return `${base.slice(0, maxBase)}${suffix}`;
}
