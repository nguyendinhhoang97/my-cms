/**
 * Lưu / liệt kê backup trên R2 (optional).
 */
import { ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getBucketName, getR2Client, uploadFile } from '../r2';

const BACKUP_PREFIX = 'backups/';

export interface BackupFileInfo {
	key: string;
	filename: string;
	size: number;
	lastModified: string;
}

export function isR2Configured(): boolean {
	try {
		getR2Client();
		getBucketName();
		return true;
	} catch {
		return false;
	}
}

/** Upload backup JSON lên R2. */
export async function saveBackupToR2(json: string, filename: string): Promise<string> {
	const key = `${BACKUP_PREFIX}${filename}`;
	await uploadFile({
		key,
		body: new TextEncoder().encode(json),
		contentType: 'application/json',
		metadata: { type: 'database-backup' },
	});
	return key;
}

/** Liệt kê các backup đã lưu trên R2. */
export async function listBackupHistory(limit = 20): Promise<BackupFileInfo[]> {
	const client = getR2Client();
	const res = await client.send(
		new ListObjectsV2Command({
			Bucket: getBucketName(),
			Prefix: BACKUP_PREFIX,
			MaxKeys: limit,
		}),
	);

	const items: BackupFileInfo[] = [];
	for (const obj of res.Contents ?? []) {
		if (!obj.Key || obj.Key.endsWith('/')) continue;
		items.push({
			key: obj.Key,
			filename: obj.Key.replace(BACKUP_PREFIX, ''),
			size: obj.Size ?? 0,
			lastModified: obj.LastModified?.toISOString() ?? new Date().toISOString(),
		});
	}

	return items.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
}
