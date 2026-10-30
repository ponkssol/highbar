-- 0004: user referrals + referrer rewards, and the post-migration milestone bonus for creators (BUILD_BRIEF step 8).
-- Same conventions as 0002: periods are UTC days ('YYYY-MM-DD'), timestamps epoch ms (BIGINT), amounts in lamports.

-- One referrer per wallet, set once (first ?ref= link the wallet signs in with). Only trades after created_at earn rewards.
CREATE TABLE referrals (
  referee TEXT PRIMARY KEY,
  referrer TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'link',
  created_at BIGINT NOT NULL,
  CHECK (referee <> referrer)
);
CREATE INDEX referrals_referrer_idx ON referrals (referrer, created_at DESC);

-- Referrer reward per closed period: REFERRAL_REWARD_BPS of the platform fee share of referees' via_ui trades.
-- pending_sig = payout tx signed/sent but not yet confirmed (same lifecycle as cashback_ledger).
CREATE TABLE referral_rewards (
  referrer TEXT NOT NULL,
  period TEXT NOT NULL,
  period_start BIGINT NOT NULL,
  period_end BIGINT NOT NULL,
  referees INT NOT NULL,
  trades INT NOT NULL,
  volume_lamports BIGINT NOT NULL,
  platform_fee_lamports BIGINT NOT NULL,
  amount_lamports BIGINT NOT NULL,
  pending_sig TEXT,
  pending_at BIGINT,
  paid_sig TEXT,
  paid_at BIGINT,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (referrer, period)
);
CREATE INDEX referral_rewards_unpaid_idx ON referral_rewards (referrer) WHERE paid_sig IS NULL;
CREATE INDEX referral_rewards_period_idx ON referral_rewards (period);

-- Milestone progress reuses 0003: tokens.migrated_at / tokens.damm_pool and the hourly DAMM v2 token_snapshots (source = 'damm')
-- written by the score job; a UTC day counts toward a milestone when its lowest snapshot mcap is >= the threshold.

-- One bonus per (token, milestone) once qualified; paid to the creator by the treasury / platform keypair.
CREATE TABLE milestone_bonuses (
  mint TEXT NOT NULL,
  milestone TEXT NOT NULL,
  creator TEXT NOT NULL,
  mcap_sol DOUBLE PRECISION NOT NULL,
  days INT NOT NULL,
  amount_lamports BIGINT NOT NULL,
  qualified_day TEXT NOT NULL,
  pending_sig TEXT,
  pending_at BIGINT,
  paid_sig TEXT,
  paid_at BIGINT,
  created_at BIGINT NOT NULL,
  PRIMARY KEY (mint, milestone)
);
CREATE INDEX milestone_bonuses_unpaid_idx ON milestone_bonuses (creator) WHERE paid_sig IS NULL;
CREATE INDEX milestone_bonuses_created_idx ON milestone_bonuses (created_at DESC);
