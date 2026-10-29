-- Up Migration
ALTER TABLE configs ADD COLUMN token_decimal INT NOT NULL DEFAULT 6, ADD COLUMN collect_fee_mode INT NOT NULL DEFAULT 0;
-- fee_lamports = quote-side fee; fee_base_amount = fee charged in base token (raw units);
-- fee_value_lamports = total fee valued in SOL at the trade's execution price.
ALTER TABLE trades ADD COLUMN fee_base_amount NUMERIC NOT NULL DEFAULT 0, ADD COLUMN fee_value_lamports BIGINT NOT NULL DEFAULT 0;
ALTER TABLE fee_claims ADD COLUMN base_mint TEXT, ADD COLUMN base_amount NUMERIC NOT NULL DEFAULT 0, ADD COLUMN value_lamports BIGINT NOT NULL DEFAULT 0;
-- Down Migration
ALTER TABLE fee_claims DROP COLUMN base_mint, DROP COLUMN base_amount, DROP COLUMN value_lamports;
ALTER TABLE trades DROP COLUMN fee_base_amount, DROP COLUMN fee_value_lamports;
ALTER TABLE configs DROP COLUMN token_decimal, DROP COLUMN collect_fee_mode;
