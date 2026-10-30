-- 0010: vanity mint pool. Every highbar launch uses a pre-ground mint whose base58 ends in "high" (services/mintPool).
-- secret_enc = AES-256-GCM sealed 32-byte ed25519 seed ("v1.<iv>.<tag>.<ct>", key MINT_POOL_ENC_KEY, AAD = pubkey); never logged.
-- status: available -> reserved -> available (expired AND the mint account is absent on-chain) | used (on-chain). used is final.
-- signed_at: when the API co-signed a launch tx for this reservation (that tx can land until its blockhash expires).
CREATE TABLE IF NOT EXISTS mint_pool (
  pubkey TEXT PRIMARY KEY CHECK (pubkey ~ 'high$'),
  secret_enc TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'used')),
  reserved_at TIMESTAMPTZ,
  reserved_by TEXT,
  reservation_expires_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (status <> 'reserved' OR (reserved_by IS NOT NULL AND reserved_at IS NOT NULL AND reservation_expires_at IS NOT NULL)),
  CHECK (status <> 'used' OR used_at IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS mint_pool_status_idx ON mint_pool (status, created_at);
CREATE INDEX IF NOT EXISTS mint_pool_reserved_by_idx ON mint_pool (reserved_by) WHERE status = 'reserved';

-- A used mint can never go back to the pool.
CREATE OR REPLACE FUNCTION mint_pool_used_is_final() RETURNS trigger AS $$
BEGIN
  IF OLD.status = 'used' AND NEW.status <> 'used' THEN
    RAISE EXCEPTION 'mint_pool: % is used and can never be reused', OLD.pubkey;
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS mint_pool_used_is_final ON mint_pool;
CREATE TRIGGER mint_pool_used_is_final BEFORE UPDATE ON mint_pool FOR EACH ROW EXECUTE FUNCTION mint_pool_used_is_final();
