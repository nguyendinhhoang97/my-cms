/**
 * @file src/lib/seo/jsonld.ts
 * Builder JSON-LD structured data.
 */

import type { BreadcrumbItem } from '../../components/Breadcrumb.astro';
import { SITE, absoluteUrl } from './config';

export function buildWebsiteSchema(origin: string) {
	return {
		'@context': 'https://schema.org',
		'@type': 'WebSite',
		name: SITE.name,
		url: absoluteUrl(origin, '/'),
		description: SITE.description,
		inLanguage: SITE.language,
		potentialAction: {
			'@type': 'SearchAction',
			target: {
				'@type': 'EntryPoint',
				urlTemplate: `${absoluteUrl(origin, '/search')}?q={search_term_string}`,
			},
			'query-input': 'required name=search_term_string',
		},
	};
}

export function buildBlogPostingSchema(
	origin: string,
	post: {
		title: string;
		slug: string;
		excerpt: string | null;
		content: string;
		featuredImage: string | null;
		publishedAt: string | null;
		updatedAt: string;
	},
) {
	const url = absoluteUrl(origin, `/posts/${post.slug}`);
	return {
		'@context': 'https://schema.org',
		'@type': 'BlogPosting',
		headline: post.title,
		description: post.excerpt ?? post.content.slice(0, 160),
		url,
		mainEntityOfPage: { '@type': 'WebPage', '@id': url },
		datePublished: post.publishedAt ?? post.updatedAt,
		dateModified: post.updatedAt,
		author: {
			'@type': 'Organization',
			name: SITE.name,
		},
		publisher: {
			'@type': 'Organization',
			name: SITE.name,
		},
		...(post.featuredImage ? { image: [post.featuredImage] } : {}),
		inLanguage: SITE.language,
	};
}

export function buildBreadcrumbSchema(origin: string, items: BreadcrumbItem[]) {
	return {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: items.map((item, i) => ({
			'@type': 'ListItem',
			position: i + 1,
			name: item.label,
			...(item.href ? { item: absoluteUrl(origin, item.href) } : {}),
		})),
	};
}
