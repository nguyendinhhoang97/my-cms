/**
 * GET /robots.txt
 */
import type { APIRoute } from 'astro';
import { absoluteUrl } from '../lib/seo/config';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
	const origin = url.origin;
	const sitemap = absoluteUrl(origin, '/sitemap.xml');

	const body = `# robots.txt — my-cms
User-agent: *
Allow: /

Sitemap: ${sitemap}
`;

	return new Response(body.trim() + '\n', {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
		},
	});
};
