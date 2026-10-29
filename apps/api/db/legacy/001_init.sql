-- Up Migration
CREATE TABLE configs (
  pubkey TEXT PRIMARY KEY, tier TEXT NOT NULL CHECK (tier IN ('standard','higher','max')),
  anti_sniper BOOLEAN NOT NULL, threshold_lamports BIGINT NOT NULL,
  creator_fee_pct NUMERIC NOT NULL, migration_fee_pct NUMERIC NOT NULL, creator_lp_pct NUMERIC NOT NULL
);
CREATE TABLE tokens (
  mint TEXT PRIMARY KEY, pool TEXT UNIQUE NOT NULL, config TEXT NOT NULL REFERENCES configs(pubkey),
  creator TEXT NOT NULL, name TEXT NOT NULL, symbol TEXT NOT NULL, uri TEXT NOT NULL, image_url TEXT,
  description TEXT, socials JSONB NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'curve' CHECK (status IN ('curve','completed','migrated')),
  damm_pool TEXT, created_at TIMESTAMPTZ NOT NULL, migrated_at TIMESTAMPTZ, hidden BOOLEAN NOT NULL DEFAULT false
);
CREATE TABLE raw_events (
  sig TEXT NOT NULL, ix_idx INT NOT NULL, slot BIGINT NOT NULL, block_time TIMESTAMPTZ NOT NULL,
  kind TEXT NOT NULL, payload JSONB NOT NULL, PRIMARY KEY (sig, ix_idx)
);
CREATE TABLE trades (
  sig TEXT NOT NULL, ix_idx INT NOT NULL, time TIMESTAMPTZ NOT NULL, slot BIGINT NOT NULL,
  mint TEXT NOT NULL REFERENCES tokens(mint), trader TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  sol_lamports BIGINT NOT NULL, token_amount NUMERIC NOT NULL, price_sol NUMERIC NOT NULL,
  quote_reserve_lamports BIGINT NOT NULL, fee_lamports BIGINT NOT NULL, venue TEXT NOT NULL DEFAULT 'curve',
  via_ui BOOLEAN NOT NULL DEFAULT false, finalized BOOLEAN NOT NULL DEFAULT false, PRIMARY KEY (sig, ix_idx)
);
CREATE INDEX trades_mint_time ON trades (mint, time DESC);
CREATE INDEX trades_trader_time ON trades (trader, time DESC);
CREATE TABLE token_stats (
  mint TEXT PRIMARY KEY REFERENCES tokens(mint), price_sol NUMERIC, mcap_sol NUMERIC, vol_24h_lamports BIGINT DEFAULT 0,
  progress_bps INT DEFAULT 0, holders INT DEFAULT 0, last_trade_at TIMESTAMPTZ
);
CREATE TABLE holders (mint TEXT NOT NULL, owner TEXT NOT NULL, balance NUMERIC NOT NULL, updated_slot BIGINT NOT NULL, PRIMARY KEY (mint, owner));
CREATE TABLE epochs (id SERIAL PRIMARY KEY, starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ NOT NULL, status TEXT NOT NULL DEFAULT 'open');
CREATE TABLE reward_ledger (
  id BIGSERIAL PRIMARY KEY, epoch_id INT NOT NULL REFERENCES epochs(id), wallet TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('cashback','referral','milestone')), amount_lamports BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'accrued' CHECK (status IN ('accrued','approved','paid','void')), payout_sig TEXT,
  UNIQUE (epoch_id, wallet, kind)
);
CREATE TABLE fee_claims (sig TEXT PRIMARY KEY, source TEXT NOT NULL, pool TEXT, amount_lamports BIGINT NOT NULL, claimed_at TIMESTAMPTZ NOT NULL DEFAULT now());
CREATE TABLE treasury_splits (
  epoch_id INT PRIMARY KEY REFERENCES epochs(id), gross BIGINT NOT NULL, cashback BIGINT NOT NULL,
  buyback BIGINT NOT NULL, ops BIGINT NOT NULL, treasury BIGINT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE buyback_orders (
  id BIGSERIAL PRIMARY KEY, epoch_id INT NOT NULL REFERENCES epochs(id), sol_in BIGINT NOT NULL, bar_out NUMERIC,
  swap_sig TEXT, burn_sig TEXT, status TEXT NOT NULL DEFAULT 'pending', created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Down Migration
DROP TABLE buyback_orders, treasury_splits, fee_claims, reward_ledger, epochs, holders, token_stats, trades, raw_events, tokens, configs;
