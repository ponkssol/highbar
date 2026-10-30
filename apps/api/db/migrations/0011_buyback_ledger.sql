-- 0011: catch-up buyback ledger. The buyback budget is sum(treasury_splits.buyback_lamports) over ALL closed periods minus every
-- buybacks row that is not 'failed' (services/buybackLedger.ts), so periods that closed before $HIGHER launched are bought back
-- (capped per order / per run) once the official mint is live. Rows are inserted as 'pending' reservations under an advisory lock
-- BEFORE signing; a reservation only stops counting once it is 'failed' (never signed, or its buy tx provably did not land).
-- source: 'ledger' = backlog drain (default job path), 'manual' = --budget-sol, 'period' = rows written before 0011 (per-period budget).
ALTER TABLE buybacks ADD COLUMN source TEXT NOT NULL DEFAULT 'period' CHECK (source IN ('period','ledger','manual'));
-- One row per signed buy: a signature can never be recorded (and so counted) twice.
CREATE UNIQUE INDEX buybacks_buy_sig_uidx ON buybacks (buy_sig) WHERE buy_sig IS NOT NULL;
-- Open orders scanned by reconcile on every live run.
CREATE INDEX buybacks_open_idx ON buybacks (bar_mint, id) WHERE status IN ('pending','bought');
