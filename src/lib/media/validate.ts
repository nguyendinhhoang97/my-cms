/**
 * Validate file upload ảnh.
 */

export const ALLOWED_IMAGE_TYPES = [
	'image/jpeg',
	'image/png',
	'image/webp',
	'image/gif',
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const MAX_THUMB_SIZE_BYTES = 512 * 1024; // 512KB

export function isAllowedImageType(type: string): type is AllowedImageType {
	return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}

export function validateImageFile(
	file: { type: string; size: number },
	maxSize = MAX_IMAGE_SIZE_BYTES,
): string | null {
	if (!isAllowedImageType(file.type)) {
		return 'Chỉ chấp nhận JPEG, PNG, WebP hoặc GIF.';
	}
	if (file.size <= 0) {
		return 'File rỗng.';
	}
	if (file.size > maxSize) {
		return `File quá lớn (tối đa ${Math.round(maxSize / 1024 / 1024)}MB).`;
	}
	return null;
}
