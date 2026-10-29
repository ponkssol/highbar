import { db } from "../db/pool.js";
import { env } from "../lib/env.js";
import { decodeDbcEvents, type DbcEvent, type RawTx } from "./decode.js";

type Tx = { signature: string; slot: number };
const PLATFORM_REFERRAL = env.PLATFORM_REFERRAL_TOKEN_ACCOUNT;

/** Idempotent: re-processing the same tx is a no-op thanks to (sig, ix_idx) PKs. */
export async function ingestTx(raw: RawTx, finalized = false) {
  const events = decodeDbcEvents(raw);
  if (!events.length) return;
  const tx: Tx = { signature: raw.transaction.signatures[0]!, slot: raw.slot };
  const time = new Date((raw.blockTime ?? Date.now() / 1000) * 1000);
  const c = await db.connect();
  try {
    await c.query("BEGIN");
    for (const [i, ev] of events.entries()) {
      const ins = await c.query(
        "INSERT INTO raw_events (sig, ix_idx, slot, block_time, kind, payload) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING",
        [tx.signature, i, tx.slot, time, ev.kind, JSON.stringify(ev, (_k, v) => (typeof v === "bigint" ? v.toString() : v))],
      );
      if (ins.rowCount === 0) continue;
      await apply(c, ev, tx, i, time, finalized);
    }
    await c.query("COMMIT");
  } catch (e) { await c.query("ROLLBACK"); throw e; } finally { c.release(); }
}

async function apply(c: import("pg").PoolClient, ev: DbcEvent, tx: Tx, i: number, time: Date, finalized: boolean) {
  switch (ev.kind) {
    case "init":
      if (!env.DBC_CONFIGS.includes(ev.config)) return; // not a Higher Bar token
      await c.query(
        "INSERT INTO tokens (mint,pool,config,creator,name,symbol,uri,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING",
        [ev.mint, ev.pool, ev.config, ev.creator, ev.name, ev.symbol, ev.uri, time]);
      await c.query("INSERT INTO token_stats (mint) VALUES ($1) ON CONFLICT DO NOTHING", [ev.mint]);
      return;
    case "swap": {
      const t = await c.query("SELECT t.mint, c.threshold_lamports, c.token_decimal FROM tokens t JOIN configs c ON c.pubkey=t.config WHERE t.pool=$1", [ev.pool]);
      if (!t.rowCount) return;
      const { mint, threshold_lamports, token_decimal } = t.rows[0];
      // SOL per whole token at execution.
      const price = ev.tokenAmount > 0n ? (Number(ev.solLamports) / 1e9) / (Number(ev.tokenAmount) / 10 ** token_decimal) : 0;
      const feeValue = ev.feeLamports + (ev.tokenAmount > 0n ? (ev.feeBaseAmount * ev.solLamports) / ev.tokenAmount : 0n);
      await c.query(
        `INSERT INTO trades (sig,ix_idx,time,slot,mint,trader,side,sol_lamports,token_amount,price_sol,quote_reserve_lamports,fee_lamports,
           fee_base_amount,fee_value_lamports,via_ui,finalized)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) ON CONFLICT DO NOTHING`,
        [tx.signature, i, time, tx.slot, mint, ev.trader, ev.side, ev.solLamports, ev.tokenAmount.toString(), price, ev.quoteReserve, ev.feeLamports,
         ev.feeBaseAmount.toString(), feeValue, !!PLATFORM_REFERRAL && ev.referralTokenAccount === PLATFORM_REFERRAL, finalized]);
      const progress = Math.min(10000, Number((ev.quoteReserve * 10000n) / BigInt(threshold_lamports)));
      await c.query(
        `UPDATE token_stats SET price_sol=$2, progress_bps=$3, last_trade_at=$4,
           vol_24h_lamports=(SELECT coalesce(sum(sol_lamports),0) FROM trades WHERE mint=$1 AND time > $4::timestamptz - interval '24 hours')
         WHERE mint=$1 AND (last_trade_at IS NULL OR last_trade_at <= $4)`, [mint, price, progress, time]);
      return;
    }
    case "complete":
      await c.query("UPDATE tokens SET status='completed' WHERE pool=$1", [ev.pool]); return;
    case "migrated":
      await c.query("UPDATE tokens SET status='migrated', damm_pool=$2, migrated_at=$3 WHERE pool=$1", [ev.pool, ev.dammPool, time]); return;
    case "migration_fee": return; // recorded by feeClaimer via fee_claims
  }
}
