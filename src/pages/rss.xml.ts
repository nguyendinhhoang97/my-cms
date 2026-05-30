/**
 * GET /rss.xml — RSS 2.0 feed từ published posts.
 */
import type { APIRoute } from 'astro';
import { getDb } from '../lib/db';
import { SITE, absoluteUrl, truncateDescription } from '../lib/seo/config';
import { getPublishedPostsForFeed } from '../lib/seo/feed';

export const prerender = false;

function escapeXml(s: string): string {
	return s
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

function toRfc822(iso: string | null): string {
	const d = iso ? new Date(iso) : new Date();
	return d.toUTCString();
}

export const GET: APIRoute = async ({ url }) => {
	const origin = url.origin;
	const db = getDb();
	const posts = await getPublishedPostsForFeed(db, 30);

	const channelLink = absoluteUrl(origin, '/');
	const selfLink = absoluteUrl(origin, '/rss.xml');
	const buildDate = toRfc822(posts[0]?.publishedAt ?? null);

	const items = posts
		.map((post) => {
			const link = absoluteUrl(origin, `/posts/${post.slug}`);
			const desc = escapeXml(
				truncateDescription(post.excerpt ?? post.content.replace(/[#*`]/g, ''), 300),
			);
			return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${toRfc822(post.publishedAt)}</pubDate>
      <description>${desc}</description>
    </item>`;
		})
		.join('\n');

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(SITE.title)}</title>
    <link>${channelLink}</link>
    <description>${escapeXml(SITE.description)}</description>
    <language>${SITE.language}</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${selfLink}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;

	return new Response(xml, {
		headers: {
			'Content-Type': 'application/rss+xml; charset=utf-8',
			'Cache-Control': 'public, max-age=1800',
		},
	});
};
