/**
 * @file src/lib/markdown.ts
 * Parse Markdown → HTML với syntax highlighting (Prism).
 */

import MarkdownIt from 'markdown-it';
import markdownItPrism from 'markdown-it-prism';
import { extractTOC, injectHeadingIds, type TocItem } from './utils/toc';

/** Instance dùng chung — không cho phép HTML thô (chống XSS) */
const md = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: true,
	breaks: true,
}).use(markdownItPrism);

export type TocHeading = TocItem;

/**
 * Render markdown thành HTML an toàn.
 */
export function renderMarkdown(content: string): string {
	return md.render(content);
}

/**
 * Gắn id cho h1–h6 và trả về danh sách TOC.
 */
export function renderMarkdownWithToc(content: string): {
	html: string;
	headings: TocHeading[];
} {
	const headings = extractTOC(content);
	const rawHtml = md.render(content);
	const html = injectHeadingIds(rawHtml, headings);
	return { html, headings };
}

/**
 * Format ngày hiển thị blog.
 */
export function formatBlogDate(iso: string | null): string {
	if (!iso) return '';
	try {
		return new Date(iso).toLocaleDateString('vi-VN', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
		});
	} catch {
		return '';
	}
}
