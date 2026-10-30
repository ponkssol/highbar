-- 0008: drop the milestone tracker tables that the original 0004 (commit 547eaee) created. 8bf63b7 removed them from 0004
-- (milestone progress reuses 0003 tokens.migrated_at / damm_pool and the hourly DAMM v2 token_snapshots), but 0004 had
-- already been applied in that form on some databases. Idempotent: a no-op where they were never created.
DROP TABLE IF EXISTS milestone_snapshots;
DROP TABLE IF EXISTS milestone_tokens;