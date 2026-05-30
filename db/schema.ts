/**
 * @file db/schema.ts
 * Định nghĩa schema Drizzle ORM cho Cloudflare D1 (SQLite).
 *
 * Mọi bảng dùng INTEGER PRIMARY KEY AUTOINCREMENT cho id (trừ `settings` dùng `key` làm PK).
 * Timestamp lưu dạng Unix epoch (giây) — phù hợp SQLite và D1.
 *
 * Quan hệ:
 * - posts.author_id → users.id
 * - comments.post_id → posts.id
 * - post_categories / post_tags: bảng nối many-to-many
 */

import { relations, sql } from 'drizzle-orm';
import {
	index,
	integer,
	primaryKey,
	sqliteTable,
	text,
	uniqueIndex,
} from 'drizzle-orm/sqlite-core';

// ---------------------------------------------------------------------------
// users — tài khoản CMS (admin, editor, author, …)
// ---------------------------------------------------------------------------

/**
 * Vai trò người dùng trong hệ thống CMS.
 * - admin: toàn quyền
 * - editor: quản lý nội dung
 * - author: chỉ sửa bài của mình
 */
export const userRoles = ['admin', 'editor', 'author'] as const;
export type UserRole = (typeof userRoles)[number];

export const users = sqliteTable(
	'users',
	{
		/** Khóa chính tự tăng */
		id: integer('id').primaryKey({ autoIncrement: true }),
		/** Tên đăng nhập duy nhất */
		username: text('username').notNull(),
		/** Email duy nhất */
		email: text('email').notNull(),
		/** Mật khẩu đã băm (bcrypt) */
		passwordHash: text('password_hash').notNull(),
		/** Vai trò: admin | editor | author */
		role: text('role').$type<UserRole>().notNull().default('author'),
		/** Thời điểm tạo tài khoản */
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [
		uniqueIndex('users_username_unique').on(table.username),
		uniqueIndex('users_email_unique').on(table.email),
	],
);

// ---------------------------------------------------------------------------
// posts — bài viết / trang nội dung
// ---------------------------------------------------------------------------

/** Trạng thái xuất bản bài viết */
export const postStatuses = ['draft', 'published', 'archived'] as const;
export type PostStatus = (typeof postStatuses)[number];

export const posts = sqliteTable(
	'posts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		title: text('title').notNull(),
		/** URL slug duy nhất, dùng cho route công khai */
		slug: text('slug').notNull(),
		/** Nội dung đầy đủ (HTML hoặc Markdown) */
		content: text('content').notNull(),
		/** Đoạn tóm tắt hiển thị trên listing */
		excerpt: text('excerpt'),
		/** URL ảnh đại diện */
		featuredImage: text('featured_image'),
		status: text('status').$type<PostStatus>().notNull().default('draft'),
		/** Tham chiếu tác giả (users.id) */
		authorId: integer('author_id')
			.notNull()
			.references(() => users.id, { onDelete: 'restrict' }),
		/** Thời điểm xuất bản (null nếu draft) */
		publishedAt: integer('published_at', { mode: 'timestamp' }),
		/** Cập nhật lần cuối */
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
		/** Số lượt xem (tăng khi đọc bài) */
		viewCount: integer('view_count').notNull().default(0),
	},
	(table) => [
		uniqueIndex('posts_slug_unique').on(table.slug),
		index('posts_author_id_idx').on(table.authorId),
		index('posts_status_idx').on(table.status),
	],
);

// ---------------------------------------------------------------------------
// categories & tags — phân loại nội dung
// ---------------------------------------------------------------------------

export const categories = sqliteTable(
	'categories',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		description: text('description'),
	},
	(table) => [uniqueIndex('categories_slug_unique').on(table.slug)],
);

export const tags = sqliteTable(
	'tags',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
	},
	(table) => [uniqueIndex('tags_slug_unique').on(table.slug)],
);

// ---------------------------------------------------------------------------
// post_categories & post_tags — quan hệ many-to-many
// ---------------------------------------------------------------------------

export const postCategories = sqliteTable(
	'post_categories',
	{
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		categoryId: integer('category_id')
			.notNull()
			.references(() => categories.id, { onDelete: 'cascade' }),
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.categoryId] }),
		index('post_categories_category_id_idx').on(table.categoryId),
	],
);

export const postTags = sqliteTable(
	'post_tags',
	{
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		tagId: integer('tag_id')
			.notNull()
			.references(() => tags.id, { onDelete: 'cascade' }),
	},
	(table) => [
		primaryKey({ columns: [table.postId, table.tagId] }),
		index('post_tags_tag_id_idx').on(table.tagId),
	],
);

// ---------------------------------------------------------------------------
// comments — bình luận khách (chưa đăng nhập)
// ---------------------------------------------------------------------------

export const commentStatuses = ['pending', 'approved', 'spam', 'trashed'] as const;
export type CommentStatus = (typeof commentStatuses)[number];

export const comments = sqliteTable(
	'comments',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		postId: integer('post_id')
			.notNull()
			.references(() => posts.id, { onDelete: 'cascade' }),
		authorName: text('author_name').notNull(),
		authorEmail: text('author_email').notNull(),
		content: text('content').notNull(),
		status: text('status').$type<CommentStatus>().notNull().default('pending'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [
		index('comments_post_id_idx').on(table.postId),
		index('comments_status_idx').on(table.status),
	],
);

// ---------------------------------------------------------------------------
// settings — cấu hình key-value (site title, logo, …)
// ---------------------------------------------------------------------------

export const settings = sqliteTable('settings', {
	/** Khóa cấu hình, ví dụ: site_name, posts_per_page */
	key: text('key').primaryKey(),
	value: text('value').notNull(),
});

// ---------------------------------------------------------------------------
// newsletter_emails — đăng ký nhận bản tin
// ---------------------------------------------------------------------------

export const newsletterEmails = sqliteTable(
	'newsletter_emails',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		email: text('email').notNull(),
		subscribedAt: integer('subscribed_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex('newsletter_emails_email_unique').on(table.email)],
);

// ---------------------------------------------------------------------------
// contacts — form liên hệ
// ---------------------------------------------------------------------------

export const contactStatuses = ['pending', 'handled'] as const;
export type ContactStatus = (typeof contactStatuses)[number];

export const contacts = sqliteTable(
	'contacts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		name: text('name').notNull(),
		email: text('email').notNull(),
		message: text('message').notNull(),
		status: text('status').$type<ContactStatus>().notNull().default('pending'),
		createdAt: integer('created_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [
		index('contacts_status_idx').on(table.status),
		index('contacts_created_at_idx').on(table.createdAt),
	],
);

// ---------------------------------------------------------------------------
// sessions — phiên đăng nhập (cookie httpOnly → id session trong D1)
// ---------------------------------------------------------------------------

export const sessions = sqliteTable(
	'sessions',
	{
		/** UUID session — giá trị lưu trong cookie */
		id: text('id').primaryKey(),
		userId: integer('user_id')
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		/** Token CSRF gắn với phiên — validate mọi form POST */
		csrfToken: text('csrf_token').notNull(),
		/** Hết hạn (Unix epoch giây) */
		expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
	},
	(table) => [
		index('sessions_user_id_idx').on(table.userId),
		index('sessions_expires_at_idx').on(table.expiresAt),
	],
);

// ---------------------------------------------------------------------------
// login_attempts — rate limit đăng nhập (5 lần sai → khóa 15 phút)
// ---------------------------------------------------------------------------

export const loginAttempts = sqliteTable(
	'login_attempts',
	{
		id: integer('id').primaryKey({ autoIncrement: true }),
		/**
		 * Khóa duy nhất: `ip:username` hoặc `ip:*` khi chưa có username.
		 * Giúp giới hạn theo cặp IP + tài khoản.
		 */
		identifier: text('identifier').notNull(),
		failedCount: integer('failed_count').notNull().default(0),
		/** Thời điểm hết khóa (null = không bị khóa) */
		lockedUntil: integer('locked_until', { mode: 'timestamp' }),
		updatedAt: integer('updated_at', { mode: 'timestamp' })
			.notNull()
			.default(sql`(unixepoch())`),
	},
	(table) => [uniqueIndex('login_attempts_identifier_unique').on(table.identifier)],
);

// ---------------------------------------------------------------------------
// Drizzle relations (tùy chọn — tiện cho query với `.with()`)
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
	posts: many(posts),
	sessions: many(sessions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
	user: one(users, {
		fields: [sessions.userId],
		references: [users.id],
	}),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
	author: one(users, {
		fields: [posts.authorId],
		references: [users.id],
	}),
	comments: many(comments),
	postCategories: many(postCategories),
	postTags: many(postTags),
}));

export const categoriesRelations = relations(categories, ({ many }) => ({
	postCategories: many(postCategories),
}));

export const tagsRelations = relations(tags, ({ many }) => ({
	postTags: many(postTags),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
	post: one(posts, {
		fields: [comments.postId],
		references: [posts.id],
	}),
}));

// ---------------------------------------------------------------------------
// Kiểu TypeScript suy ra từ schema (Insert / Select)
// ---------------------------------------------------------------------------

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Tag = typeof tags.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type NewsletterEmail = typeof newsletterEmails.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
