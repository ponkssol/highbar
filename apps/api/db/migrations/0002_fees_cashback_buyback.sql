-- 0002: platform fee claims, trader cashback ledger, per-period treasury splits and $BAR buyback & burn proofs (BUILD_BRIEF step 7).
-- Periods are UTC days ('YYYY-MM-DD'); timestamps are epoch ms (BIGINT) like 0001; amounts in lamports / raw token units.

-- Platform fees claimed into the treasury (DBC partner trading fee, migration fee, surplus, DAMM v2 LP fees).
-- period = the epoch these claims were counted in (set when that period is closed; NULL = not yet split).
CREATE TABLE fee_claims (
  id BIGSERIAL PRIMARY KEY,
  sig TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('dbc_trading','dbc_migration','dbc_surplus','damm_lp')),
  pool TEXT NOT NULL,
  mint TEXT,
  lamports BIGINT NOT NULL DEFAULT 0,
  base_amount TEXT NOT NULL DEFAULT '0',
  period TEXT,
  claimed_at BIGINT NOT NULL,
  UNIQUE (sig, source, pool)
);
CREATE INDEX fee_claims_unsplit_idx ON fee_claims (claimed_at) WHERE period IS NULL;
CREATE INDEX fee_claims_period_idx ON fee_claims (period);

-- 0.05% cashback per wallet per period on via_ui trades. pending_sig = payout tx signed/sent but not yet confirmed.
CREATE TABLE cashback_ledger (
  wallet TEXT NOT NULL,
  period TEXT NOT NULL,
  period_start BIGINT NOT NULL,
  period_end BIGINT NOT NULL,
  trades INT NOT NULL,
  volume_lamports BIGINT NOT NULL,
  amount_lamports BIGINT NOT NULL,
  pending_sig TEXT,
  pending_at BIGINT,
  paid_sig TEXT,
  paid_at BIGINT,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (wallet, period)
);
CREATE INDEX cashback_ledger_unpaid_idx ON cashback_ledger (wallet) WHERE paid_sig IS NULL;
CREATE INDEX cashback_ledger_period_idx ON cashback_ledger (period);

-- Waterfall per closed period: gross claimed fees - cashback, then 40 buyback / 50 ops / 10 treasury (SPLIT_BPS).
CREATE TABLE treasury_splits (
  period TEXT PRIMARY KEY,
  gross_lamports BIGINT NOT NULL,
  cashback_lamports BIGINT NOT NULL,
  buyback_lamports BIGINT NOT NULL,
  ops_lamports BIGINT NOT NULL,
  treasury_lamports BIGINT NOT NULL,
  shortfall_lamports BIGINT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

-- One row per capped buyback order: SOL in, $BAR bought, then burned (Solscan proofs on /burn).
CREATE TABLE buybacks (
  id BIGSERIAL PRIMARY KEY,
  period TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('jupiter','mock')),
  bar_mint TEXT NOT NULL,
  bar_decimals INT NOT NULL,
  sol_spent_lamports BIGINT NOT NULL,
  bar_bought TEXT NOT NULL DEFAULT '0',
  buy_sig TEXT,
  burn_sig TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','bought','burned','failed')),
  error TEXT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);
CREATE INDEX buybacks_created_idx ON buybacks (created_at DESC);
CREATE INDEX buybacks_period_idx ON buybacks (period);
