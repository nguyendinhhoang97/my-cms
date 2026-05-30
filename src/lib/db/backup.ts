/**
 * Export toàn bộ dữ liệu D1 ra JSON.
 */
import {
	categories,
	comments,
	contacts,
	loginAttempts,
	newsletterEmails,
	postCategories,
	posts,
	postTags,
	sessions,
	settings,
	tags,
	users,
} from '../../../db/schema';
import type { Database } from '../db';

export interface DatabaseBackup {
	version: '1.0';
	exportedAt: string;
	tables: {
		users: unknown[];
		posts: unknown[];
		categories: unknown[];
		tags: unknown[];
		post_categories: unknown[];
		post_tags: unknown[];
		comments: unknown[];
		settings: unknown[];
		newsletter_emails: unknown[];
		contacts: unknown[];
		sessions: unknown[];
		login_attempts: unknown[];
	};
}

/** Serialize rows — Date → ISO string. */
function serializeRows<T>(rows: T[]): T[] {
	return JSON.parse(JSON.stringify(rows)) as T[];
}

export async function exportDatabase(db: Database): Promise<DatabaseBackup> {
	const [
		userRows,
		postRows,
		categoryRows,
		tagRows,
		postCategoryRows,
		postTagRows,
		commentRows,
		settingRows,
		newsletterRows,
		contactRows,
		sessionRows,
		loginAttemptRows,
	] = await Promise.all([
		db.select().from(users),
		db.select().from(posts),
		db.select().from(categories),
		db.select().from(tags),
		db.select().from(postCategories),
		db.select().from(postTags),
		db.select().from(comments),
		db.select().from(settings),
		db.select().from(newsletterEmails),
		db.select().from(contacts),
		db.select().from(sessions),
		db.select().from(loginAttempts),
	]);

	return {
		version: '1.0',
		exportedAt: new Date().toISOString(),
		tables: {
			users: serializeRows(userRows),
			posts: serializeRows(postRows),
			categories: serializeRows(categoryRows),
			tags: serializeRows(tagRows),
			post_categories: serializeRows(postCategoryRows),
			post_tags: serializeRows(postTagRows),
			comments: serializeRows(commentRows),
			settings: serializeRows(settingRows),
			newsletter_emails: serializeRows(newsletterRows),
			contacts: serializeRows(contactRows),
			sessions: serializeRows(sessionRows),
			login_attempts: serializeRows(loginAttemptRows),
		},
	};
}

export function backupFilename(isoDate = new Date().toISOString()): string {
	const stamp = isoDate.replace(/[:.]/g, '-').slice(0, 19);
	return `my-cms-backup-${stamp}.json`;
}
