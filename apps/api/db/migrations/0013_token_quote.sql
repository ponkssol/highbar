-- 0013: quote asset per token. Existing rows are SOL pairs (WSOL). Amounts in the *_sol columns are in the quote's own units
-- (SOL for WSOL pairs); only reviewed quotes exist (packages/onchain/src/quotes.ts), non-SOL quotes are devnet only for now.
ALTER TABLE tokens ADD COLUMN IF NOT EXISTS quote_mint TEXT NOT NULL DEFAULT 'So11111111111111111111111111111111111111112';
