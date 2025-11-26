-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    hash_id TEXT UNIQUE NOT NULL,
    email TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Source feeds table (external XML URLs)
CREATE TABLE IF NOT EXISTS source_feeds (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    r2_key TEXT,
    property_count INTEGER DEFAULT 0,
    last_fetched_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Customer property selections (which properties each customer can see)
CREATE TABLE IF NOT EXISTS customer_selections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    feed_id INTEGER NOT NULL,
    property_id TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    FOREIGN KEY (feed_id) REFERENCES source_feeds(id) ON DELETE CASCADE,
    UNIQUE(customer_id, feed_id, property_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_hash_id ON customers(hash_id);
CREATE INDEX IF NOT EXISTS idx_selections_customer_feed ON customer_selections(customer_id, feed_id);
CREATE INDEX IF NOT EXISTS idx_selections_property ON customer_selections(property_id);
