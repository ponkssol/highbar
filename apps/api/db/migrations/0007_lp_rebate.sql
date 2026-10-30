-- 0007: creator LP rebate (post-migration). The platform forwards LP_REBATE_BPS (packages/shared; 6875 / 6875 / 7500 bps for
-- Standard / Higher / Max) of the DAMM v2 LP SOL it actually claimed on its own locked position to the token's creator.
-- Same conventions as 0002 / 0004: timestamps epoch ms (BIGINT), amounts in lamports, periods are UTC days ('YYYY-MM-DD').

-- One row per platform damm_lp fee claim (fee_claims sig + pool), so accrual is idempotent.
-- creator = the on-chain DBC pool creator read at accrual time (follows transferPoolCreator; independent of who holds the creator LP NFT).
-- rebate_lamports = floor(claimed_lamports * rebate_bps / 10000); 0 when skip_reason is set (platform / treasury / referral creator, ...).
-- base_amount = base-token fees in the same claim (OnlyB pools should have none; never rebated, the job alerts when > 0).
-- period = the treasury split that deducted this rebate from gross (set when that period is closed).
-- pending_sig = payout tx signed/sent but not yet confirmed (same lifecycle as cashback_ledger / referral_rewards).
CREATE TABLE creator_lp_rebates (
  claim_sig TEXT NOT NULL,
  pool TEXT NOT NULL,
  mint TEXT NOT NULL,
  tier TEXT NOT NULL,
  creator TEXT NOT NULL,
  claimed_lamports BIGINT NOT NULL,
  base_amount TEXT NOT NULL DEFAULT '0',
  rebate_bps INT NOT NULL,
  rebate_lamports BIGINT NOT NULL,
  period TEXT,
  pending_sig TEXT,
  pending_at BIGINT,
  paid_sig TEXT,
  paid_at BIGINT,
  skip_reason TEXT,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (claim_sig, pool)
);
CREATE INDEX creator_lp_rebates_unpaid_idx ON creator_lp_rebates (creator) WHERE paid_sig IS NULL AND skip_reason IS NULL;
CREATE INDEX creator_lp_rebates_creator_idx ON creator_lp_rebates (creator, created_at DESC);
CREATE INDEX creator_lp_rebates_period_idx ON creator_lp_rebates (period);

-- Waterfall: the rebate comes out of the platform's claimed gross before cashback and the 40/50/10 split.
ALTER TABLE treasury_splits ADD COLUMN creator_rebate_lamports BIGINT NOT NULL DEFAULT 0;