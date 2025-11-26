-- Add super admin and blocking capabilities to users
ALTER TABLE users ADD COLUMN is_super_admin INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN is_blocked INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN blocked_at TEXT;
ALTER TABLE users ADD COLUMN blocked_reason TEXT;
ALTER TABLE users ADD COLUMN last_login_at TEXT;

-- Create admin activity log table for audit trail
CREATE TABLE admin_activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index for faster activity log queries
CREATE INDEX idx_admin_activity_log_admin_id ON admin_activity_log(admin_id);
CREATE INDEX idx_admin_activity_log_target ON admin_activity_log(target_type, target_id);
CREATE INDEX idx_admin_activity_log_created_at ON admin_activity_log(created_at);

-- Create index for super admin lookup
CREATE INDEX idx_users_is_super_admin ON users(is_super_admin);
CREATE INDEX idx_users_is_blocked ON users(is_blocked);
