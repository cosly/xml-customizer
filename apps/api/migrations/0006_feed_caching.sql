-- Add caching metadata fields to source_feeds
-- These fields help with conditional fetching to save bandwidth

-- Last-Modified header from the source server
ALTER TABLE source_feeds ADD COLUMN source_last_modified TEXT;

-- ETag header from the source server (alternative to Last-Modified)
ALTER TABLE source_feeds ADD COLUMN source_etag TEXT;

-- When we last checked the source for updates (even if unchanged)
ALTER TABLE source_feeds ADD COLUMN source_checked_at TEXT;

-- Whether a newer version is available at the source
ALTER TABLE source_feeds ADD COLUMN update_available INTEGER DEFAULT 0;

-- Create index for feeds that need checking
CREATE INDEX idx_source_feeds_checked_at ON source_feeds(source_checked_at);
