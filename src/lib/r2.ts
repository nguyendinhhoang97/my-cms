/**
 * Cloudflare R2 — S3-compatible client và helpers.
 */
import {
	DeleteObjectCommand,
	ListObjectsV2Command,
	PutObjectCommand,
	S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from 'cloudflare:workers';

const UPLOAD_PREFIX = 'uploads/';
const THUMB_PREFIX = 'thumbs/';

let cachedClient: S3Client | null = null;

function getR2Config() {
	const accessKeyId = env.R2_ACCESS_KEY_ID;
	const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
	const bucket = env.R2_BUCKET_NAME;
	const endpoint = env.R2_ENDPOINT;
	const publicUrl = env.R2_PUBLIC_URL?.replace(/\/$/, '');

	if (!accessKeyId || !secretAccessKey || !bucket || !endpoint || !publicUrl) {
		throw new Error(
			'Thiếu cấu hình R2. Kiểm tra R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_ENDPOINT, R2_PUBLIC_URL.',
		);
	}

	return { accessKeyId, secretAccessKey, bucket, endpoint, publicUrl };
}

/** Khởi tạo S3 client cho R2 (singleton). */
export function getR2Client(): S3Client {
	if (cachedClient) return cachedClient;

	const { accessKeyId, secretAccessKey, endpoint } = getR2Config();
	cachedClient = new S3Client({
		region: 'auto',
		endpoint,
		credentials: { accessKeyId, secretAccessKey },
	});
	return cachedClient;
}

export function getBucketName(): string {
	return getR2Config().bucket;
}

/** Public URL cho object key. */
export function publicUrlForKey(key: string): string {
	return `${getR2Config().publicUrl}/${key}`;
}

/** Key thumbnail tương ứng với key gốc. */
export function thumbKeyForUploadKey(key: string): string {
	if (key.startsWith(UPLOAD_PREFIX)) {
		return THUMB_PREFIX + key.slice(UPLOAD_PREFIX.length);
	}
	return `${THUMB_PREFIX}${key}`;
}

export interface UploadFileOptions {
	key: string;
	body: Uint8Array | ArrayBuffer;
	contentType: string;
	metadata?: Record<string, string>;
}

/** Upload file lên R2 bucket. */
export async function uploadFile(options: UploadFileOptions): Promise<void> {
	const client = getR2Client();
	await client.send(
		new PutObjectCommand({
			Bucket: getBucketName(),
			Key: options.key,
			Body: options.body,
			ContentType: options.contentType,
			Metadata: options.metadata,
		}),
	);
}

/** Xóa file khỏi R2 (cả thumbnail nếu có). */
export async function deleteFile(key: string): Promise<void> {
	const client = getR2Client();
	const bucket = getBucketName();
	const keys = [key];
	const thumbKey = thumbKeyForUploadKey(key);
	if (thumbKey !== key) keys.push(thumbKey);

	await Promise.all(
		keys.map((k) =>
			client.send(
				new DeleteObjectCommand({
					Bucket: bucket,
					Key: k,
				}),
			),
		),
	);
}

export interface MediaFileItem {
	key: string;
	url: string;
	thumbnailUrl: string;
	size: number;
	lastModified: string;
	alt: string;
	filename: string;
}

export interface ListFilesResult {
	items: MediaFileItem[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasMore: boolean;
		nextContinuationToken?: string;
	};
}

/**
 * Liệt kê files trong bucket (prefix uploads/).
 * Phân trang qua continuation token (cursor-based).
 */
export async function listFiles(
	page = 1,
	limit = 24,
	continuationToken?: string,
): Promise<ListFilesResult> {
	const client = getR2Client();
	const bucket = getBucketName();

	// R2 list không có offset — lấy đủ items cho trang hiện tại
	const needed = page * limit;
	const collected: MediaFileItem[] = [];
	let token = continuationToken;
	let hasMore = true;
	let totalListed = 0;

	while (collected.length < needed && hasMore) {
		const res = await client.send(
			new ListObjectsV2Command({
				Bucket: bucket,
				Prefix: UPLOAD_PREFIX,
				MaxKeys: Math.min(100, needed - collected.length + limit),
				ContinuationToken: token,
			}),
		);

		for (const obj of res.Contents ?? []) {
			if (!obj.Key || obj.Key.endsWith('/')) continue;
			totalListed++;
			const filename = obj.Key.split('/').pop() ?? obj.Key;
			const thumbKey = thumbKeyForUploadKey(obj.Key);
			collected.push({
				key: obj.Key,
				url: publicUrlForKey(obj.Key),
				thumbnailUrl: publicUrlForKey(thumbKey),
				size: obj.Size ?? 0,
				lastModified: obj.LastModified?.toISOString() ?? new Date().toISOString(),
				alt: filename.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '),
				filename,
			});
		}

		hasMore = Boolean(res.IsTruncated);
		token = res.NextContinuationToken;
		if (!hasMore) break;
	}

	// Sort newest first
	collected.sort((a, b) => b.lastModified.localeCompare(a.lastModified));

	const start = (page - 1) * limit;
	const items = collected.slice(start, start + limit);
	const total = hasMore ? collected.length + limit : collected.length;

	return {
		items,
		pagination: {
			page,
			limit,
			total,
			totalPages: Math.max(1, Math.ceil(total / limit)),
			hasMore,
			nextContinuationToken: token,
		},
	};
}

/** Presigned URL cho upload trực tiếp từ client (PUT). */
export async function getPresignedUrl(
	key: string,
	contentType: string,
	expiresIn = 3600,
): Promise<string> {
	const client = getR2Client();
	const command = new PutObjectCommand({
		Bucket: getBucketName(),
		Key: key,
		ContentType: contentType,
	});
	return getSignedUrl(client, command, { expiresIn });
}

/** Tạo unique object key từ tên file gốc. */
export function generateObjectKey(originalName: string): string {
	const safe = originalName
		.toLowerCase()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9._-]+/g, '-')
		.replace(/-+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80);
	const rand = crypto.randomUUID().slice(0, 8);
	return `${UPLOAD_PREFIX}${Date.now()}-${rand}-${safe || 'image'}`;
}

export { UPLOAD_PREFIX, THUMB_PREFIX };
