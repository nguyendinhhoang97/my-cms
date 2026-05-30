-- =============================================================================
-- Migration: 0001_initial.sql
-- Mô tả: Schema ban đầu cho CMS trên Cloudflare D1 (SQLite).
-- Chạy bằng: npm run db:setup  (local) hoặc npm run db:setup -- --remote
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- users — tài khoản quản trị / tác giả
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'author' CHECK (role IN ('admin', 'editor', 'author')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);

-- -----------------------------------------------------------------------------
-- posts — bài viết
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  featured_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  author_id INTEGER NOT NULL,
  published_at INTEGER,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  view_count INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (author_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS posts_slug_unique ON posts (slug);
CREATE INDEX IF NOT EXISTS posts_author_id_idx ON posts (author_id);
CREATE INDEX IF NOT EXISTS posts_status_idx ON posts (status);

-- -----------------------------------------------------------------------------
-- categories — chuyên mục
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS categories_slug_unique ON categories (slug);

-- -----------------------------------------------------------------------------
-- tags — thẻ
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS tags_slug_unique ON tags (slug);

-- -----------------------------------------------------------------------------
-- post_categories — bài viết ↔ chuyên mục (nhiều-nhiều)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_categories (
  post_id INTEGER NOT NULL,
  category_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, category_id),
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS post_categories_category_id_idx ON post_categories (category_id);

-- -----------------------------------------------------------------------------
-- post_tags — bài viết ↔ thẻ (nhiều-nhiều)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS post_tags (
  post_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS post_tags_tag_id_idx ON post_tags (tag_id);

-- -----------------------------------------------------------------------------
-- comments — bình luận khách
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  author_name TEXT NOT NULL,
  author_email TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'spam', 'trashed')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (post_id) REFERENCES posts (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id);
CREATE INDEX IF NOT EXISTS comments_status_idx ON comments (status);

-- -----------------------------------------------------------------------------
-- settings — cấu hình key-value
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- -----------------------------------------------------------------------------
-- newsletter_emails — đăng ký newsletter
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_emails (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  subscribed_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_emails_email_unique ON newsletter_emails (email);
