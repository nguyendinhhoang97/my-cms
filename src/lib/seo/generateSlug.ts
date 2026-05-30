/**
 * @file src/lib/seo/generateSlug.ts
 * Tạo URL slug từ title — bỏ dấu, lowercase, space → dash.
 *
 * Dùng cho SEO-friendly URLs và đồng bộ với admin slugify.
 */

/**
 * Sinh slug từ title hoặc chuỗi bất kỳ.
 * @example generateSlug("Hello World Việt Nam") → "hello-world-viet-nam"
 */
export function generateSlug(title: string): string {
	return title
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/đ/g, 'd')
		.replace(/Đ/g, 'd')
		.replace(/[^a-z0-9\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 200);
}

/** Re-export alias — cùng logic với `src/lib/utils/slugify.ts` */
export { slugify as generateSlugAlias } from '../utils/slugify';
