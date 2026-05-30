/**
 * POST /api/upload — upload ảnh lên R2 (multipart FormData)
 * GET  /api/upload?filename=...&contentType=... — presigned URL
 */

import type { APIRoute } from 'astro';
import { errorResponse, successResponse } from '../../lib/api';
import { requireCsrfHeader } from '../../lib/api-helpers';
import { resolveAltText } from '../../lib/media/alt-text';
import { validateImageFile } from '../../lib/media/validate';
import { canUploadMedia, requireAuth } from '../../lib/permissions';
import {
	generateObjectKey,
	getPresignedUrl,
	publicUrlForKey,
	thumbKeyForUploadKey,
	uploadFile,
} from '../../lib/r2';

export const prerender = false;

/** Presigned URL cho upload trực tiếp từ client */
export const GET: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	if (!canUploadMedia(user)) {
		return errorResponse('Không có quyền upload.', 403);
	}

	const filename = context.url.searchParams.get('filename') ?? 'image.jpg';
	const contentType = context.url.searchParams.get('contentType') ?? 'image/jpeg';

	const typeErr = validateImageFile({ type: contentType, size: 1 });
	if (typeErr) return errorResponse(typeErr, 400);

	try {
		const key = generateObjectKey(filename);
		const uploadUrl = await getPresignedUrl(key, contentType);
		return successResponse({
			key,
			uploadUrl,
			url: publicUrlForKey(key),
			thumbnailUrl: publicUrlForKey(thumbKeyForUploadKey(key)),
		});
	} catch (err) {
		console.error('[GET /api/upload]', err);
		return errorResponse('Không thể tạo presigned URL.', 500);
	}
};

export const POST: APIRoute = async (context) => {
	const user = requireAuth(context);
	if (user instanceof Response) return user;

	if (!canUploadMedia(user)) {
		return errorResponse('Không có quyền upload.', 403);
	}

	const csrfErr = await requireCsrfHeader(context);
	if (csrfErr) return csrfErr;

	let formData: FormData;
	try {
		formData = await context.request.formData();
	} catch {
		return errorResponse('Body phải là multipart/form-data.', 400);
	}

	const file = formData.get('file');
	if (!(file instanceof File)) {
		return errorResponse('Thiếu field `file`.', 400);
	}

	const fileErr = validateImageFile({ type: file.type, size: file.size });
	if (fileErr) return errorResponse(fileErr, 400);

	const thumbEntry = formData.get('thumbnail');
	const thumbFile = thumbEntry instanceof File && thumbEntry.size > 0 ? thumbEntry : null;
	if (thumbFile) {
		const thumbErr = validateImageFile(
			{ type: thumbFile.type, size: thumbFile.size },
			512 * 1024,
		);
		if (thumbErr) return errorResponse(`Thumbnail: ${thumbErr}`, 400);
	}

	const altText = resolveAltText(
		typeof formData.get('alt') === 'string' ? (formData.get('alt') as string) : undefined,
		file.name,
	);

	try {
		const key = generateObjectKey(file.name);
		const thumbKey = thumbKeyForUploadKey(key);
		const fileBuffer = new Uint8Array(await file.arrayBuffer());

		await uploadFile({
			key,
			body: fileBuffer,
			contentType: file.type,
			metadata: { alt: altText },
		});

		if (thumbFile) {
			const thumbBuffer = new Uint8Array(await thumbFile.arrayBuffer());
			await uploadFile({
				key: thumbKey,
				body: thumbBuffer,
				contentType: thumbFile.type,
				metadata: { alt: altText },
			});
		} else {
			// Fallback: dùng ảnh gốc làm thumbnail
			await uploadFile({
				key: thumbKey,
				body: fileBuffer,
				contentType: file.type,
				metadata: { alt: altText },
			});
		}

		return successResponse(
			{
				key,
				url: publicUrlForKey(key),
				thumbnailUrl: publicUrlForKey(thumbKey),
				alt: altText,
				filename: file.name,
				size: file.size,
			},
			201,
		);
	} catch (err) {
		console.error('[POST /api/upload]', err);
		return errorResponse('Upload thất bại. Kiểm tra cấu hình R2.', 500);
	}
};
