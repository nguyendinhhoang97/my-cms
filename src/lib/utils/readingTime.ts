/**
 * Ước lượng thời gian đọc từ nội dung (markdown hoặc HTML).
 */
export function readingTime(content: string): string {
	const wordsPerMinute = 200;
	const wordCount = content
		.replace(/<[^>]*>/g, '')
		.split(/\s+/)
		.filter(Boolean).length;
	const minutes = Math.max(1, Math.ceil(wordCount / wordsPerMinute));
	return `${minutes} min read`;
}

/** Số phút đọc (dùng khi cần số). */
export function readingTimeMinutes(content: string): number {
	const wordsPerMinute = 200;
	const wordCount = content
		.replace(/<[^>]*>/g, '')
		.split(/\s+/)
		.filter(Boolean).length;
	return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
