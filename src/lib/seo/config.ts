/**
 * @file src/lib/seo/config.ts
 * Cấu hình SEO site-wide.
 */

export const SITE = {
	name: 'my-cms',
	title: 'my-cms Blog',
	description: 'Blog chia sẻ kiến thức, công nghệ và trải nghiệm — xây dựng bằng Astro + Cloudflare D1.',
	defaultKeywords: ['blog', 'cms', 'astro', 'cloudflare', 'technology'],
	/** Ảnh OG mặc định (absolute URL nên set qua env hoặc origin) */
	defaultOgImagePath: '/favicon.svg',
	language: 'vi-VN',
	twitterHandle: '@mycms',
} as const;

/** Tạo absolute URL từ origin + path */
export function absoluteUrl(origin: string, path: string): string {
	const base = origin.replace(/\/$/, '');
	const p = path.startsWith('/') ? path : `/${path}`;
	return `${base}${p}`;
}

/** Cắt description cho meta (~160 ký tự) */
export function truncateDescription(text: string, max = 160): string {
	const t = text.replace(/\s+/g, ' ').trim();
	if (t.length <= max) return t;
	return `${t.slice(0, max - 1).trim()}…`;
}
