-- Mess Manager schema (Cloudflare D1 / SQLite). Safe to re-run.
-- Dates are 'YYYY-MM-DD'. Months are 'YYYY-MM-01'. IDs are text UUIDs.

-- users: people who can log in (passwords stored as PBKDF2 hash + per-user salt + iteration count).
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL DEFAULT 20000,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL, -- the member this login belongs to (NULL for non-member logins)
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- sessions: one row per login session; the token is stored in an HttpOnly cookie.
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- members: the people who share the house (active = 0 hides them without deleting history).
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- bazar_entries: one grocery shopping trip paid by a member (amount = total spent).
CREATE TABLE IF NOT EXISTS bazar_entries (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- bazar_items: optional item lines of a bazar entry; when they exist, the entry amount is their sum.
CREATE TABLE IF NOT EXISTS bazar_items (
  id TEXT PRIMARY KEY,
  entry_id TEXT NOT NULL REFERENCES bazar_entries(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  price REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- meals: how many meals a member ate on a date (REAL so 0.5 is possible); one row per member per day.
CREATE TABLE IF NOT EXISTS meals (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  count REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (member_id, date)
);

-- accessories: shared non-food purchases (soap, gas, etc.) paid by one member.
CREATE TABLE IF NOT EXISTS accessories (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL,
  item TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  paid_by TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- bills: the names of recurring monthly bills (rent, electricity, internet, ...).
CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- bill_amounts: the amount of a bill from an effective month onward (latest effective_month <= selected month applies).
CREATE TABLE IF NOT EXISTS bill_amounts (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  effective_month TEXT NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (bill_id, effective_month)
);

-- bill_fixed_shares: a member's fixed share of a bill in a month (the rest is split among the others).
CREATE TABLE IF NOT EXISTS bill_fixed_shares (
  id TEXT PRIMARY KEY,
  bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  fixed_amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (bill_id, month, member_id)
);

-- month_status: whether a month is marked closed (settled).
CREATE TABLE IF NOT EXISTS month_status (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL UNIQUE,
  is_closed INTEGER NOT NULL DEFAULT 0 CHECK (is_closed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes (month queries filter by date/month; foreign keys speed up joins and cascades).
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id); -- one member = one login
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_bazar_entries_date ON bazar_entries(date);
CREATE INDEX IF NOT EXISTS idx_bazar_entries_member_id ON bazar_entries(member_id);
CREATE INDEX IF NOT EXISTS idx_bazar_items_entry_id ON bazar_items(entry_id);
CREATE INDEX IF NOT EXISTS idx_meals_date ON meals(date);
CREATE INDEX IF NOT EXISTS idx_accessories_date ON accessories(date);
CREATE INDEX IF NOT EXISTS idx_accessories_paid_by ON accessories(paid_by);
CREATE INDEX IF NOT EXISTS idx_bill_amounts_month ON bill_amounts(effective_month);
CREATE INDEX IF NOT EXISTS idx_bill_fixed_shares_month ON bill_fixed_shares(month);
CREATE INDEX IF NOT EXISTS idx_bill_fixed_shares_member_id ON bill_fixed_shares(member_id);