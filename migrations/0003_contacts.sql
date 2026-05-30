-- Migration: 0003_contacts.sql — form liên hệ
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS contacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'handled')),
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS contacts_status_idx ON contacts (status);
CREATE INDEX IF NOT EXISTS contacts_created_at_idx ON contacts (created_at);

-- Cấu hình mặc định
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_title', 'my-cms Blog');
INSERT OR IGNORE INTO settings (key, value) VALUES ('site_description', 'Blog chia sẻ kiến thức, công nghệ và trải nghiệm.');
INSERT OR IGNORE INTO settings (key, value) VALUES ('logo', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('ga_id', '');
INSERT OR IGNORE INTO settings (key, value) VALUES ('contact_email', '');
