-- 0005: $BAR utility (BUILD_BRIEF step 8 / section 7): holder tiers by $BAR balance, bigger cashback + fee rebate, holder fee share.
-- All perks are off-chain (DBC trading fees are fixed per config on-chain); see apps/api/BAR_UTILITY.md.
-- Timestamps are epoch ms (BIGINT), amounts in lamports, $BAR balances in raw base units (NUMERIC, u64-safe).

-- Cashback boost per ledger row. amount_lamports stays the TOTAL owed (base 0.05% + bonus), so payouts and the
-- treasury waterfall are unchanged; bonus_lamports = holder multiplier extra + fee rebate. Old rows: bonus 0, tier NULL.
ALTER TABLE cashback_ledger
  ADD COLUMN bonus_lamports BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN bar_tier TEXT,
  ADD COLUMN bar_balance_raw NUMERIC(40,0);

-- Periodic $BAR holder snapshots (jobs:barsnap). Only wallets at or above the lowest paid tier are stored; a wallet missing
-- from any snapshot in a period counts as 0 for that period (tier = minimum balance over the period, anti buy-before-snapshot).
CREATE TABLE bar_holder_snapshots (
  taken_at BIGINT NOT NULL,
  wallet TEXT NOT NULL,
  balance_raw NUMERIC(40,0) NOT NULL,
  PRIMARY KEY (taken_at, wallet)
);
CREATE INDEX bar_holder_snapshots_wallet_idx ON bar_holder_snapshots (wallet, taken_at);

-- Holder fee share per closed period: BAR_FEE_SHARE_BPS of the period's ops allocation (treasury_splits.ops_lamports),
-- pro-rata by $BAR balance among fee-share-eligible holders. Written once per period (idempotent).
CREATE TABLE bar_fee_share_periods (
  period TEXT PRIMARY KEY,
  bar_mint TEXT NOT NULL,
  ops_lamports BIGINT NOT NULL,
  share_bps INT NOT NULL,
  pool_lamports BIGINT NOT NULL,
  allocated_lamports BIGINT NOT NULL,
  holders INT NOT NULL,
  total_balance_raw NUMERIC(40,0) NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('snapshots','current')),
  snapshots INT NOT NULL DEFAULT 0,
  created_at BIGINT NOT NULL
);

-- Per-wallet fee share accruals; payout columns mirror cashback_ledger (pending_sig = signed/sent, not yet confirmed).
CREATE TABLE bar_fee_share_ledger (
  wallet TEXT NOT NULL,
  period TEXT NOT NULL REFERENCES bar_fee_share_periods (period),
  balance_raw NUMERIC(40,0) NOT NULL,
  amount_lamports BIGINT NOT NULL,
  pending_sig TEXT,
  pending_at BIGINT,
  paid_sig TEXT,
  paid_at BIGINT,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (wallet, period)
);
CREATE INDEX bar_fee_share_ledger_unpaid_idx ON bar_fee_share_ledger (wallet) WHERE paid_sig IS NULL;
