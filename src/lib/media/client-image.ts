/**
 * Client-side thumbnail generation (Workers không hỗ trợ sharp).
 */
export async function createThumbnailBlob(
	file: File,
	maxWidth = 400,
	quality = 0.82,
): Promise<Blob> {
	const bitmap = await createImageBitmap(file);
	const ratio = Math.min(1, maxWidth / bitmap.width);
	const width = Math.round(bitmap.width * ratio);
	const height = Math.round(bitmap.height * ratio);

	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Canvas không khả dụng');
	ctx.drawImage(bitmap, 0, 0, width, height);
	bitmap.close();

	const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => (blob ? resolve(blob) : reject(new Error('Tạo thumbnail thất bại'))),
			mime,
			quality,
		);
	});
}

/** Alt text tự sinh từ filename (client). */
export function generateAltFromFilename(filename: string): string {
	const base = filename.replace(/\.[^.]+$/, '');
	return base
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (c) => c.toUpperCase());
}

export interface UploadedMedia {
	key: string;
	url: string;
	thumbnailUrl: string;
	alt: string;
	filename: string;
	size: number;
}

export interface MediaListItem {
	key: string;
	url: string;
	thumbnailUrl: string;
	alt: string;
	filename: string;
	size: number;
	lastModified: string;
}
