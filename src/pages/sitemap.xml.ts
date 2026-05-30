/**
 * GET /sitemap.xml — dynamic sitemap từ published posts.
 */
import type { APIRoute } from 'astro';
import { getAllCategories } from '../lib/db/categories';
import { getDb } from '../lib/db';
import { getAllTags } from '../lib/db/tags';
import { getPublishedPostsForFeed } from '../lib/seo/feed';
import { absoluteUrl } from '../lib/seo/config';

export const prerender = false;

interface SitemapUrl {
	loc: string;
	lastmod?: string;
	changefreq: string;
	priority: string;
}

function toW3CDate(iso: string | null | undefined): string | undefined {
	if (!iso) return undefined;
	try {
		return new Date(iso).toISOString().split('T')[0];
	} catch {
		return undefined;
	}
}

function buildXml(urls: SitemapUrl[]): string {
	const entries = urls
		.map((u) => {
			const lastmod = u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : '';
			return `  <url>\n    <loc>${escapeXml(u.loc)}</loc>${lastmod}\n    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`;
		})
		.join('\n');

	return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const db = getDb();

	const [posts, categories, tags] = await Promise.all([
		getPublishedPostsForFeed(db, 500),
		getAllCategories(db),
		getAllTags(db),
	]);

	const urls: SitemapUrl[] = [
		{ loc: absoluteUrl(origin, '/'), changefreq: 'daily', priority: '1.0' },
		{ loc: absoluteUrl(origin, '/about'), changefreq: 'monthly', priority: '0.5' },
		{ loc: absoluteUrl(origin, '/categories'), changefreq: 'weekly', priority: '0.6' },
		{ loc: absoluteUrl(origin, '/tags'), changefreq: 'weekly', priority: '0.6' },
	];

	for (const post of posts) {
		urls.push({
			loc: absoluteUrl(origin, `/posts/${post.slug}`),
			lastmod: toW3CDate(post.updatedAt),
			changefreq: 'weekly',
			priority: '0.8',
		});
	}

	for (const cat of categories) {
		urls.push({
			loc: absoluteUrl(origin, `/categories/${cat.slug}`),
			changefreq: 'weekly',
			priority: '0.6',
		});
	}

	for (const tag of tags) {
		urls.push({
			loc: absoluteUrl(origin, `/tags/${tag.slug}`),
			changefreq: 'weekly',
			priority: '0.5',
		});
	}

	return new Response(buildXml(urls), {
		headers: {
			'Content-Type': 'application/xml; charset=utf-8',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
