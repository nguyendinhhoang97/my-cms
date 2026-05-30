/**
 * Alt text — tự sinh từ tên file hoặc title.
 */

/** Tự sinh alt text từ filename (bỏ extension, thay -/_ bằng space). */
export function generateAltFromFilename(filename: string): string {
	const base = filename.replace(/\.[^.]+$/, '');
	return base
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Alt text ưu tiên user nhập, fallback filename. */
export function resolveAltText(userAlt: string | undefined, filename: string): string {
	const trimmed = userAlt?.trim();
	if (trimmed) return trimmed.slice(0, 500);
	return generateAltFromFilename(filename);
}
