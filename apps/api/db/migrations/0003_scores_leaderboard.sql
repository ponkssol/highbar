-- 0003: Higher Bar score, holders, post-migration snapshots (BUILD_BRIEF sections 7-8).
-- When the token graduated (first seen migrated by the indexer) and its DAMM v2 pool (found by the score job).
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS migrated_at BIGINT;
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS damm_pool TEXT;
UPDATE tokens t SET migrated_at = a.ts FROM activity a WHERE a.id = 'graduate:' || t.mint AND t.is_migrated AND t.migrated_at IS NULL;
CREATE INDEX IF NOT EXISTS tokens_migrated_at_idx ON tokens (migrated_at DESC) WHERE migrated_at IS NOT NULL;

-- Holder balances derived from indexed curve trades (net buys - sells; creator balance net of its locked tokens).
CREATE TABLE holders (
  mint TEXT NOT NULL,
  wallet TEXT NOT NULL,
  balance DOUBLE PRECISION NOT NULL,
  updated_at BIGINT NOT NULL,
  PRIMARY KEY (mint, wallet)
);
CREATE INDEX holders_mint_balance_idx ON holders (mint, balance DESC);
CREATE INDEX holders_wallet_idx ON holders (wallet);

-- Higher Bar score per token (0-100) and the inputs that produced it.
CREATE TABLE scores (
  mint TEXT PRIMARY KEY,
  score INT NOT NULL CHECK (score BETWEEN 0 AND 100),
  breakdown_json JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX scores_score_idx ON scores (score DESC, mint);

-- Hourly price / mcap snapshots: source 'curve' while bonding, 'damm' (DAMM v2 pool price) after migration.
CREATE TABLE token_snapshots (
  mint TEXT NOT NULL,
  ts BIGINT NOT NULL,
  price_sol DOUBLE PRECISION NOT NULL,
  mcap_sol DOUBLE PRECISION NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('curve','damm')),
  PRIMARY KEY (mint, ts)
);
CREATE INDEX token_snapshots_mint_ts_idx ON token_snapshots (mint, ts DESC);
