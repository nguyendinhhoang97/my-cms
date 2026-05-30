/**
 * Parse markdown headings → Table of Contents.
 */

export interface TocItem {
	level: number;
	text: string;
	id: string;
}

/** Slug hóa heading text làm anchor id. */
export function slugifyHeading(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.replace(/[^\w\s-]/g, '')
		.replace(/\s+/g, '-')
		.replace(/-+/g, '-')
		.slice(0, 80);
}

/** Strip markdown inline syntax từ heading text. */
function stripMarkdownInline(text: string): string {
	return text
		.replace(/\*\*|__|\*|_|~~|`/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.trim();
}

/**
 * Trích xuất TOC từ markdown (# … ######).
 */
export function extractTOC(markdown: string): TocItem[] {
	const headings: TocItem[] = [];
	const slugCounts = new Map<string, number>();

	for (const line of markdown.split('\n')) {
		const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
		if (!match) continue;

		const level = match[1]!.length;
		const text = stripMarkdownInline(match[2]!);
		if (!text) continue;

		let base = slugifyHeading(text) || 'section';
		const count = slugCounts.get(base) ?? 0;
		slugCounts.set(base, count + 1);
		const id = count > 0 ? `${base}-${count}` : base;

		headings.push({ level, text, id });
	}

	return headings;
}

/**
 * Gắn id vào thẻ h1–h6 trong HTML theo thứ tự headings đã parse.
 */
export function injectHeadingIds(html: string, headings: TocItem[]): string {
	let index = 0;
	return html.replace(/<h([1-6])>(.*?)<\/h\1>/gi, (match, levelStr: string, inner: string) => {
		const heading = headings[index];
		index += 1;
		if (!heading) return match;
		return `<h${levelStr} id="${heading.id}">${inner}</h${levelStr}>`;
	});
}
