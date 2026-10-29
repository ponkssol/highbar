-- 0001: app store (replaces data/db.json + data/trades.json). Timestamps are epoch ms (BIGINT) to match the API shapes.
CREATE TABLE tokens (
  mint TEXT PRIMARY KEY,
  pool TEXT NOT NULL UNIQUE,
  config TEXT NOT NULL,
  tier TEXT NOT NULL CHECK (tier IN ('standard','higher','max')),
  anti_sniper BOOLEAN NOT NULL DEFAULT false,
  creator TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  quote_reserve_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  threshold_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  progress DOUBLE PRECISION NOT NULL DEFAULT 0,
  is_migrated BOOLEAN NOT NULL DEFAULT false,
  price_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  mcap_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  name TEXT NOT NULL DEFAULT '',
  symbol TEXT NOT NULL DEFAULT '',
  uri TEXT NOT NULL DEFAULT '',
  volume_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  volume_24h_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  trades INT NOT NULL DEFAULT 0,
  creator_fees_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  fees_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  updated_at BIGINT NOT NULL
);
CREATE INDEX tokens_creator_idx ON tokens (creator, created_at DESC);
CREATE INDEX tokens_created_idx ON tokens (created_at DESC, mint);
CREATE INDEX tokens_tier_idx ON tokens (tier, created_at DESC);
CREATE INDEX tokens_migrated_idx ON tokens (is_migrated, created_at DESC);
CREATE INDEX tokens_mcap_idx ON tokens (mcap_sol DESC);
CREATE INDEX tokens_vol24_idx ON tokens (volume_24h_sol DESC);

-- Indexed curve swaps (one row per swap event; ix_idx = event index inside the tx).
CREATE TABLE trades (
  sig TEXT NOT NULL,
  ix_idx INT NOT NULL,
  pool TEXT NOT NULL,
  mint TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  sol DOUBLE PRECISION NOT NULL,
  tokens DOUBLE PRECISION NOT NULL,
  fee_sol DOUBLE PRECISION NOT NULL DEFAULT 0,
  wallet TEXT NOT NULL,
  via_ui BOOLEAN NOT NULL DEFAULT false,
  dev_buy BOOLEAN NOT NULL DEFAULT false,
  ts BIGINT NOT NULL,
  PRIMARY KEY (sig, ix_idx)
);
CREATE INDEX trades_mint_ts_idx ON trades (mint, ts DESC);
CREATE INDEX trades_wallet_ts_idx ON trades (wallet, ts DESC);
CREATE INDEX trades_ts_idx ON trades (ts DESC);

-- Candle source points (price per swap), deduped on sig+ix_idx.
CREATE TABLE trade_points (
  sig TEXT NOT NULL,
  ix_idx INT NOT NULL,
  mint TEXT NOT NULL,
  ts BIGINT NOT NULL,
  price_sol DOUBLE PRECISION NOT NULL CHECK (price_sol > 0),
  amount DOUBLE PRECISION NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  sol DOUBLE PRECISION,
  PRIMARY KEY (sig, ix_idx)
);
CREATE INDEX trade_points_mint_ts_idx ON trade_points (mint, ts);

-- Indexer cursor: newest processed signature per pool.
CREATE TABLE pool_cursors (
  pool TEXT PRIMARY KEY,
  last_sig TEXT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Activity feed (launch/graduate/trade) and buyback burn runs (kind = 'burn').
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL DEFAULT 'activity' CHECK (kind IN ('activity','burn')),
  type TEXT NOT NULL CHECK (type IN ('launch','burn','graduate','trade')),
  mint TEXT NOT NULL,
  symbol TEXT NOT NULL DEFAULT '',
  ts BIGINT NOT NULL,
  amount DOUBLE PRECISION,
  side TEXT CHECK (side IN ('buy','sell')),
  wallet TEXT,
  sig TEXT
);
CREATE INDEX activity_ts_idx ON activity (ts DESC);
CREATE INDEX activity_mint_ts_idx ON activity (mint, ts DESC);

-- Jupiter Lock escrows per mint (built via /tx/lock or found on-chain) + last seen state.
CREATE TABLE lock_escrows (
  escrow TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  creator TEXT,
  cliff_time BIGINT,
  end_time BIGINT,
  total TEXT,
  locked TEXT,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  locked_at BIGINT,
  seen_at BIGINT,
  added_at BIGINT NOT NULL
);
CREATE INDEX lock_escrows_mint_idx ON lock_escrows (mint);
CREATE INDEX lock_escrows_creator_idx ON lock_escrows (creator);
CREATE INDEX lock_escrows_locked_at_idx ON lock_escrows (locked_at DESC NULLS LAST);

-- Sign-In With Solana nonces and issued sessions (token hash only).
CREATE TABLE auth_nonces (
  address TEXT PRIMARY KEY,
  nonce TEXT NOT NULL,
  expires_at BIGINT NOT NULL
);
CREATE INDEX auth_nonces_exp_idx ON auth_nonces (expires_at);
CREATE TABLE auth_sessions (
  token_hash TEXT PRIMARY KEY,
  address TEXT NOT NULL,
  expires_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
CREATE INDEX auth_sessions_address_idx ON auth_sessions (address);

-- Creator fee-claim transactions built by /claim/build.
CREATE TABLE claims (
  id BIGSERIAL PRIMARY KEY,
  creator TEXT NOT NULL,
  pool TEXT NOT NULL,
  mint TEXT,
  kind TEXT NOT NULL CHECK (kind IN ('trading','migration')),
  created_at BIGINT NOT NULL
);
CREATE INDEX claims_creator_idx ON claims (creator, created_at DESC);

-- Free-form settings / job state.
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Uploaded logos + metadata JSON (POST /metadata) and the resolved logo cache per token uri.
CREATE TABLE media_files (
  id TEXT NOT NULL,
  ext TEXT NOT NULL,
  content_type TEXT NOT NULL,
  data BYTEA NOT NULL,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (id, ext)
);
CREATE TABLE logo_cache (
  uri_hash TEXT PRIMARY KEY,
  uri TEXT NOT NULL,
  content_type TEXT,
  data BYTEA,
  fetched_at BIGINT NOT NULL
);