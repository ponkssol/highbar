-- 0006: official ecosystem token ($HIGHER). Single row (id = TRUE). Written once by the indexer for the FIRST launch by
-- OFFICIAL_TOKEN_CREATOR with symbol OFFICIAL_TOKEN_SYMBOL (INSERT ... ON CONFLICT DO NOTHING), or by the ADMIN_TOKEN
-- override endpoint. BAR_MINT in the env still wins over this row (see apps/api/src/services/officialToken.ts).
CREATE TABLE official_token (
  id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id),
  mint TEXT NOT NULL,
  symbol TEXT NOT NULL,
  creator TEXT,
  pool TEXT,
  source TEXT NOT NULL CHECK (source IN ('detected', 'override')),
  launched_at BIGINT,
  recorded_at BIGINT NOT NULL
);
