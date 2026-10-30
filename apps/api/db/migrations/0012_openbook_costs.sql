-- 0012: Open Book bookkeeping (per-trade costs, failed attempts, per-token running aggregates).
-- !! WRITTEN, NOT RUN. The api runs every pending migration at boot (server.ts -> migrate()), so deploying this commit APPLIES it. !!
-- Everything is additive: new tables, nullable columns on trades (no default = catalog-only change, no table rewrite) and indexes.
-- The CREATE INDEX on trades takes a SHARE lock on trades while it builds (writes wait); on a large table build it by hand
-- first with CREATE INDEX CONCURRENTLY under the same name (IF NOT EXISTS then makes this statement a no-op).

-- Per-swap exact fee parts and chain position, filled by the indexer going forward and by scripts/backfillTradeCosts.ts.
-- NULL = row indexed before 0012: the API derives the split from fee_sol (source 'derived').
ALTER TABLE trades ADD COLUMN IF NOT EXISTS slot BIGINT;
ALTER TABLE trades ADD COLUMN IF NOT EXISTS tx_idx INT;                       -- position in the block when the RPC returns it
ALTER TABLE trades ADD COLUMN IF NOT EXISTS fee_lamports BIGINT;              -- exact total DBC fee (= trading + protocol + referral)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS trading_fee_lamports BIGINT;      -- EvtSwap* trading_fee (creator + platform part)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS protocol_fee_lamports BIGINT;     -- EvtSwap* protocol_fee (Meteora, net of referral)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS anti_sniper_fee_lamports BIGINT;  -- fee above the 1% base (0 on _off configs)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS price_pre_sol DOUBLE PRECISION;   -- derived pool price before the swap, SOL per token
ALTER TABLE trades ADD COLUMN IF NOT EXISTS price_post_sol DOUBLE PRECISION;  -- pool price after the swap (event next_sqrt_price)
ALTER TABLE trades ADD COLUMN IF NOT EXISTS min_out_raw TEXT;                 -- swap ix minimum_amount_out (exact-in) in raw units
-- Keyset pagination of a token's trades (and the early-buyer window): ORDER BY ts DESC, sig DESC, ix_idx DESC.
CREATE INDEX IF NOT EXISTS trades_mint_keyset_idx ON trades (mint, ts DESC, sig DESC, ix_idx DESC);
-- Ledger filters (?wallet=, ?side=, ?sniper=1) + dev activity / early-buyer lookups, same keyset order as above.
CREATE INDEX IF NOT EXISTS trades_mint_wallet_keyset_idx ON trades (mint, wallet, ts DESC, sig DESC, ix_idx DESC);
CREATE INDEX IF NOT EXISTS trades_mint_side_keyset_idx ON trades (mint, side, ts DESC, sig DESC, ix_idx DESC);

-- Per-transaction costs (one row per signature; a tx with several swaps of one pool shares it).
CREATE TABLE IF NOT EXISTS trade_costs (
  sig TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  pool TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('swap','create','create_swap')),
  slot BIGINT NOT NULL,
  tx_idx INT,
  block_time BIGINT,                                  -- unix seconds
  fee_payer TEXT NOT NULL,
  signatures INT NOT NULL,
  fee_lamports BIGINT NOT NULL,                       -- meta.fee as charged (raw)
  base_fee_lamports BIGINT NOT NULL,                  -- signatures x 5000
  priority_fee_lamports BIGINT NOT NULL,              -- meta.fee - base
  priority_fee_budget_lamports BIGINT NOT NULL,       -- ceil(CU price x CU limit / 1e6) (cross-check)
  cu_limit INT,
  cu_price_micro_lamports BIGINT,
  cu_consumed INT,
  tips_lamports BIGINT NOT NULL DEFAULT 0,
  tips JSONB NOT NULL DEFAULT '[]',                   -- [{to, provider, lamports, inner}]
  other_transfer_lamports BIGINT NOT NULL DEFAULT 0,
  other_transfers JSONB NOT NULL DEFAULT '[]',        -- [{to, lamports, kind, inner}] ('other transfer')
  setup_lamports BIGINT NOT NULL DEFAULT 0,           -- rent / wrap into accounts the swap or launch uses
  signer_sol_delta_lamports BIGINT,                   -- fee payer post - pre
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS trade_costs_mint_idx ON trade_costs (mint, slot DESC);
CREATE INDEX IF NOT EXISTS trade_costs_payer_idx ON trade_costs (fee_payer, mint);

-- Failed transactions that touched one of our pools, from the getSignaturesForAddress page the poller already pulls (err != null).
-- wallet / fee_lamports are only known when the tx was fetched (launch window or backfill), else NULL.
CREATE TABLE IF NOT EXISTS failed_attempts (
  sig TEXT PRIMARY KEY,
  mint TEXT NOT NULL,
  pool TEXT NOT NULL,
  slot BIGINT NOT NULL,
  wallet TEXT,
  err JSONB,
  fee_lamports BIGINT,
  ts BIGINT NOT NULL,                                 -- epoch ms (blockTime)
  -- 'duplicate' = the same fee payer landed a successful trade on this mint within 2 slots (a re-send of one order through several
  -- relays where one copy landed); set when both the wallet and the landed trade are known (whichever is indexed last flips it).
  status TEXT NOT NULL DEFAULT 'failed' CHECK (status IN ('failed','duplicate')),
  duplicate_of TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS failed_attempts_mint_idx ON failed_attempts (mint, ts DESC, sig DESC);
CREATE INDEX IF NOT EXISTS failed_attempts_wallet_idx ON failed_attempts (mint, wallet, ts DESC, sig DESC);
CREATE INDEX IF NOT EXISTS failed_attempts_status_idx ON failed_attempts (mint, status, ts DESC, sig DESC);
CREATE INDEX IF NOT EXISTS failed_attempts_dup_idx ON failed_attempts (duplicate_of) WHERE duplicate_of IS NOT NULL;

-- Running per-token totals, bumped in the SAME transaction as the trade / cost / failed insert and only when that insert added a row
-- (ON CONFLICT DO NOTHING), under pg_advisory_xact_lock(727012, hashtext(mint)). Rebuilt from stored rows by the backfill.
-- The API reads these rows and never sums trades per request.
CREATE TABLE IF NOT EXISTS token_openbook_agg (
  mint TEXT PRIMARY KEY,
  trades BIGINT NOT NULL DEFAULT 0,
  buys BIGINT NOT NULL DEFAULT 0,
  sells BIGINT NOT NULL DEFAULT 0,
  volume_lamports BIGINT NOT NULL DEFAULT 0,
  buy_volume_lamports BIGINT NOT NULL DEFAULT 0,
  sell_volume_lamports BIGINT NOT NULL DEFAULT 0,
  ui_trades BIGINT NOT NULL DEFAULT 0,
  ui_volume_lamports BIGINT NOT NULL DEFAULT 0,
  fee_total_lamports BIGINT NOT NULL DEFAULT 0,
  fee_protocol_lamports BIGINT NOT NULL DEFAULT 0,
  fee_referral_lamports BIGINT NOT NULL DEFAULT 0,
  fee_trading_lamports BIGINT NOT NULL DEFAULT 0,
  fee_creator_lamports BIGINT NOT NULL DEFAULT 0,
  fee_platform_lamports BIGINT NOT NULL DEFAULT 0,
  fee_anti_sniper_lamports BIGINT NOT NULL DEFAULT 0,
  fee_exact_trades BIGINT NOT NULL DEFAULT 0,          -- trades whose protocol / trading parts came from the event
  cost_txs BIGINT NOT NULL DEFAULT 0,
  tx_fee_lamports BIGINT NOT NULL DEFAULT 0,           -- sum meta.fee
  base_fee_lamports BIGINT NOT NULL DEFAULT 0,
  priority_fee_lamports BIGINT NOT NULL DEFAULT 0,
  tips_lamports BIGINT NOT NULL DEFAULT 0,
  other_transfer_lamports BIGINT NOT NULL DEFAULT 0,
  tip_txs BIGINT NOT NULL DEFAULT 0,                   -- txs that paid any tip
  max_tip_lamports BIGINT NOT NULL DEFAULT 0,          -- largest single-tx tip total
  max_tip_sig TEXT,
  -- sniper = a swap tx landing within OPENBOOK_SNIPER_SLOTS (openbook/math.ts, 2) slots of the create slot, not paid by the creator
  sniper_txs BIGINT NOT NULL DEFAULT 0,
  sniper_tip_txs BIGINT NOT NULL DEFAULT 0,
  sniper_tips_lamports BIGINT NOT NULL DEFAULT 0,
  failed_attempts BIGINT NOT NULL DEFAULT 0,          -- incl. duplicates
  duplicate_attempts BIGINT NOT NULL DEFAULT 0,
  failed_fee_lamports BIGINT NOT NULL DEFAULT 0,
  create_slot BIGINT,                                  -- slot of the pool-creation tx (slot offsets, sniper window)
  create_sig TEXT,
  first_ts BIGINT,
  last_ts BIGINT,
  last_slot BIGINT,
  rebuilt_at BIGINT,                                   -- last full recompute (backfill); NULL = incremental only
  updated_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS token_tip_agg (
  mint TEXT NOT NULL,
  provider TEXT NOT NULL,
  lamports BIGINT NOT NULL DEFAULT 0,
  txs BIGINT NOT NULL DEFAULT 0,
  sniper_lamports BIGINT NOT NULL DEFAULT 0,
  sniper_txs BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (mint, provider)
);
CREATE INDEX IF NOT EXISTS token_tip_agg_provider_idx ON token_tip_agg (provider);
-- Per-token per-UTC-day totals (cashback attribution after GO_PUBLIC_DATE, period filters). Same write path as token_openbook_agg.
CREATE TABLE IF NOT EXISTS token_openbook_daily (
  mint TEXT NOT NULL,
  day TEXT NOT NULL,                                   -- 'YYYY-MM-DD' (UTC)
  trades BIGINT NOT NULL DEFAULT 0,
  volume_lamports BIGINT NOT NULL DEFAULT 0,
  buy_volume_lamports BIGINT NOT NULL DEFAULT 0,
  sell_volume_lamports BIGINT NOT NULL DEFAULT 0,
  ui_trades BIGINT NOT NULL DEFAULT 0,
  ui_volume_lamports BIGINT NOT NULL DEFAULT 0,
  fee_lamports BIGINT NOT NULL DEFAULT 0,
  fee_protocol_lamports BIGINT NOT NULL DEFAULT 0,
  fee_referral_lamports BIGINT NOT NULL DEFAULT 0,
  fee_creator_lamports BIGINT NOT NULL DEFAULT 0,
  fee_platform_lamports BIGINT NOT NULL DEFAULT 0,
  fee_anti_sniper_lamports BIGINT NOT NULL DEFAULT 0,
  sniper_tips_lamports BIGINT NOT NULL DEFAULT 0,
  cost_txs BIGINT NOT NULL DEFAULT 0,
  base_fee_lamports BIGINT NOT NULL DEFAULT 0,
  priority_fee_lamports BIGINT NOT NULL DEFAULT 0,
  tips_lamports BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (mint, day)
);
CREATE INDEX IF NOT EXISTS token_openbook_daily_day_idx ON token_openbook_daily (day);
-- Wallet balance snapshots (treasury / platform / fee claimer / referral / lock-tip wallets) appended by the openbook snapshot loop every
-- OPENBOOK_SNAPSHOT_MS (ONE getMultipleAccounts call per run; rows older than 35 days are pruned). The API never reads balances live.
CREATE TABLE IF NOT EXISTS wallet_snapshots (
  address TEXT NOT NULL,
  taken_at BIGINT NOT NULL,                            -- epoch ms
  roles TEXT NOT NULL,                                 -- comma list: treasury,platform,feeClaimer,leftoverReceiver,referral,lockTip
  lamports BIGINT,                                     -- NULL = account not found
  wsol_lamports BIGINT,                                -- its WSOL ATA (referral fees land there), NULL = none
  bar_raw TEXT,                                        -- its official-token ATA balance (raw units), NULL = none / not launched
  slot BIGINT,
  PRIMARY KEY (address, taken_at)
);
CREATE INDEX IF NOT EXISTS wallet_snapshots_taken_idx ON wallet_snapshots (taken_at DESC);
