-- Run ONCE on an existing database (before using the new code). Fresh databases use db/schema.sql instead.
-- Local:   npx wrangler d1 execute <DB_NAME> --local  --file=db/migration-member-account.sql
-- Remote:  npx wrangler d1 execute <DB_NAME> --remote --file=db/migration-member-account.sql
ALTER TABLE users ADD COLUMN member_id TEXT REFERENCES members(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_member_id ON users(member_id);
