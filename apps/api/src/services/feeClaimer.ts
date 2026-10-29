import { Connection, Keypair, PublicKey, type Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { CpAmm, getTokenProgram } from "@meteora-ag/cp-amm-sdk";
import { db } from "../db/pool.js";
import { env } from "../lib/env.js";

const U64_MAX = new BN("18446744073709551615");
type Source = "partner_curve" | "migration" | "damm_lp";

/** Verified against @meteora-ag/dynamic-bonding-curve-sdk@2.0.0 and @meteora-ag/cp-amm-sdk@1.5.1:
 *  - client.partner.claimPartnerTradingFee({ feeClaimer, payer, pool, maxBaseAmount, maxQuoteAmount, receiver? })
 *  - client.partner.partnerWithdrawMigrationFee({ pool, sender })
 *  - cpAmm.getUserPositionByPool(pool, owner) + cpAmm.claimPositionFee({ owner, position, pool, positionNftAccount,
 *    tokenAMint, tokenBMint, tokenAVault, tokenBVault, tokenAProgram, tokenBProgram, receiver?, feePayer? })
 *  `claimer` = the partner fee-claimer key on our configs (also LP position owner). DRY_RUN only logs. */
export class FeeClaimer {
  private conn = new Connection(env.RPC_URL, "confirmed");
  private dbc = new DynamicBondingCurveClient(this.conn, "confirmed");
  private amm = new CpAmm(this.conn);
  constructor(private claimer: Keypair) {}
  private get receiver() { return env.TREASURY_PUBKEY ? new PublicKey(env.TREASURY_PUBKEY) : undefined; }

  async runAll() {
    const { rows } = await db.query<{ pool: string; status: string; damm_pool: string | null }>("SELECT pool, status, damm_pool FROM tokens");
    for (const t of rows) {
      await this.safe("partner_curve", t.pool, () => this.partnerTradingFee(t.pool));
      if (t.status !== "curve") await this.safe("migration", t.pool, () => this.migrationFee(t.pool));
      if (t.damm_pool) await this.safe("damm_lp", t.damm_pool, () => this.dammLpFees(t.damm_pool!));
    }
  }

  partnerTradingFee(pool: string) {
    return this.dbc.partner.claimPartnerTradingFee({ pool: new PublicKey(pool), feeClaimer: this.claimer.publicKey, payer: this.claimer.publicKey,
      maxBaseAmount: U64_MAX, maxQuoteAmount: U64_MAX, receiver: this.receiver });
  }

  async migrationFee(pool: string) {
    // Program errors with MigrationFeeHasBeenWithdraw on repeat; safe() swallows + logs. Config with 0% migration fee (max tier) also no-ops.
    return this.dbc.partner.partnerWithdrawMigrationFee({ pool: new PublicKey(pool), sender: this.claimer.publicKey });
  }

  async dammLpFees(dammPool: string): Promise<Transaction[]> {
    const pool = new PublicKey(dammPool);
    const st = await this.amm.fetchPoolState(pool);
    const positions = await this.amm.getUserPositionByPool(pool, this.claimer.publicKey);
    return Promise.all(positions.map((p) => this.amm.claimPositionFee({
      owner: this.claimer.publicKey, position: p.position, pool, positionNftAccount: p.positionNftAccount,
      tokenAMint: st.tokenAMint, tokenBMint: st.tokenBMint, tokenAVault: st.tokenAVault, tokenBVault: st.tokenBVault,
      tokenAProgram: getTokenProgram(st.tokenAFlag), tokenBProgram: getTokenProgram(st.tokenBFlag),
      receiver: this.receiver, feePayer: this.claimer.publicKey,
    })));
  }

  private async safe(source: Source, pool: string, build: () => Promise<Transaction | Transaction[]>) {
    try {
      const built = await build();
      for (const tx of Array.isArray(built) ? built : [built]) {
        if (env.DRY_RUN) { console.log(`[dry-run] ${source}`, pool, tx.instructions.length, "ixs"); continue; }
        const sig = await this.conn.sendTransaction(tx, [this.claimer]);
        await this.conn.confirmTransaction(sig, "finalized");
        const r = await this.received(sig, pool);
        await db.query(
          "INSERT INTO fee_claims (sig, source, pool, amount_lamports, base_mint, base_amount, value_lamports) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
          [sig, source, pool, r.lamports, r.baseMint, r.baseAmount.toString(), r.valueLamports]);
      }
    } catch (e) { console.warn(`[fee-claim] ${source} ${pool} skipped:`, (e as Error).message); }
  }

  /** Quote (WSOL) + base-token amounts received by the receiver, from pre/post token balances.
   *  Base tokens are valued at the token's last indexed price (SOL per whole token). */
  private async received(sig: string, poolOrDamm: string) {
    const tx = await this.conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "finalized" });
    const owner = (this.receiver ?? this.claimer.publicKey).toBase58();
    const { rows: [t] } = await db.query(
      `SELECT t.mint, c.token_decimal, s.price_sol FROM tokens t JOIN configs c ON c.pubkey=t.config LEFT JOIN token_stats s ON s.mint=t.mint
       WHERE t.pool=$1 OR t.damm_pool=$1`, [poolOrDamm]);
    return valueBalanceDelta(tx?.meta?.preTokenBalances ?? [], tx?.meta?.postTokenBalances ?? [], owner, t?.mint, t?.token_decimal ?? 6, Number(t?.price_sol ?? 0));
  }
}

type Bal = { mint: string; owner?: string; uiTokenAmount: { amount: string } };
const WSOL = "So11111111111111111111111111111111111111112";
export function valueBalanceDelta(pre: Bal[], post: Bal[], owner: string, baseMint: string | undefined, decimals: number, priceSol: number) {
  const sum = (l: Bal[], m?: string) => l.filter((b) => b.mint === m && b.owner === owner).reduce((s, b) => s + BigInt(b.uiTokenAmount.amount), 0n);
  const lamports = sum(post, WSOL) - sum(pre, WSOL);
  const baseAmount = baseMint ? sum(post, baseMint) - sum(pre, baseMint) : 0n;
  const baseValue = BigInt(Math.floor((Number(baseAmount) / 10 ** decimals) * priceSol * 1e9));
  return { lamports, baseMint: baseMint ?? null, baseAmount, valueLamports: lamports + baseValue };
}
