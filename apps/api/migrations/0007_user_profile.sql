-- User profile fields
ALTER TABLE users ADD COLUMN salutation TEXT; -- mr, ms, mrs, mx, dr, prof, other
ALTER TABLE users ADD COLUMN first_name TEXT;
ALTER TABLE users ADD COLUMN last_name TEXT;
ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'es'; -- ISO 639-1 code

-- Email change verification tokens
CREATE TABLE IF NOT EXISTS email_change_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    new_email TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at TEXT NOT NULL,
    verified_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Extend invitations with profile fields (prefilled by inviter)
ALTER TABLE invitations ADD COLUMN salutation TEXT;
ALTER TABLE invitations ADD COLUMN first_name TEXT;
ALTER TABLE invitations ADD COLUMN last_name TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_change_tokens_user_id ON email_change_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_change_tokens_token ON email_change_tokens(token);
