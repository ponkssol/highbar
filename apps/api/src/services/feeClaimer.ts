import BN from "bn.js";
import { PublicKey, type Keypair, type Transaction } from "@solana/web3.js";
import { NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CpAmm, getTokenProgram, getUnClaimLpFee } from "@meteora-ag/cp-amm-sdk";
import { getClient, getConnection } from "@hb/onchain";
import { db } from "../db/pool.js";
import { jobs } from "../jobs/config.js";
import { sendOnce, simulate } from "../jobs/chain.js";
import { canonicalDammPool } from "./creatorLp.js";

export type FeeSource = "dbc_trading" | "dbc_migration" | "dbc_surplus" | "damm_lp";
export interface ClaimResult { source: FeeSource; pool: string; mint: string; lamports: bigint; baseAmount: bigint; sig?: string; status: "claimed" | "would-claim" | "skipped"; note?: string }

const U64_MAX = new BN("18446744073709551615");
const big = (b: BN) => BigInt(b.toString());

/** Claims platform (partner) fees for every indexed token into the treasury.
 *  Verified against @meteora-ag/dynamic-bonding-curve-sdk 2.0.0 and @meteora-ag/cp-amm-sdk 1.5.1 typings:
 *  - DBC curve:  state.getPoolFeeMetrics(pool).current.partnerQuoteFee/partnerBaseFee -> partner.claimPartnerTradingFee({ feeClaimer, payer, pool, maxBaseAmount, maxQuoteAmount, receiver? })
 *  - migrated:   partner.partnerWithdrawMigrationFee({ pool, sender }), state.getPoolSurplus(pool) -> partner.partnerWithdrawSurplus({ feeClaimer, pool })
 *  - DAMM v2 LP: cpAmm.getPositionsByUserAndTokenMint(owner, mint) + getUnClaimLpFee(poolState, positionState) -> cpAmm.claimPositionFee({ owner, position, pool, positionNftAccount, tokenA/B Mint/Vault/Program, receiver?, feePayer? })
 *    getPositionsByUserAndTokenMint matches ANY pool containing the mint, so only positions in the token's own DAMM v2 pool (tokens.damm_pool,
 *    else the canonical pool derived from the config) are claimed. The recorded damm_lp amount is what actually left the pool's SOL vault
 *    in the claim tx (falls back to the pre-claim estimate only if the tx cannot be read back). Fee collect mode is OnlyB, so a base-token
 *    LP fee is unexpected: it is claimed but flagged with an ALERT note (and never rebated, see lpRebate.ts).
 *  `claimer` must be the configs' feeClaimer (and owner of the partner LP position NFTs after migration).
 *  Every tx is simulated first; dry-run stops there. Live claims are recorded in fee_claims (period NULL until the epoch is split). */
export class FeeClaimer {
  private dbc = getClient();
  private amm = new CpAmm(getConnection());
  private feeClaimerOf = new Map<string, string | null>();
  constructor(private claimer: Keypair, private live: boolean) {}
  private get receiver() { return jobs.treasury && jobs.treasury !== this.claimer.publicKey.toBase58() ? new PublicKey(jobs.treasury) : undefined; }

  async runAll(log: (m: string) => void = console.log): Promise<ClaimResult[]> {
    const { rows } = await db.query<{ mint: string; pool: string; config: string; is_migrated: boolean; damm_pool: string | null }>("SELECT mint, pool, config, is_migrated, damm_pool FROM tokens ORDER BY created_at");
    const out: ClaimResult[] = [];
    for (const t of rows) {
      const fc = await this.configFeeClaimer(t.config);
      if (fc !== this.claimer.publicKey.toBase58()) { log(`[fees] skip ${t.mint}: config ${t.config} feeClaimer is ${fc ?? "unknown"}, not ${this.claimer.publicKey.toBase58()}`); continue; }
      for (const r of await this.forToken(t.mint, t.pool, t.is_migrated, t.damm_pool, t.config)) { out.push(r); if (r.status !== "skipped" || r.note) log(`[fees] ${r.status} ${r.source} ${r.pool} ${r.lamports} lamports${r.baseAmount ? ` + ${r.baseAmount} base` : ""}${r.sig ? ` ${r.sig}` : ""}${r.note ? ` (${r.note})` : ""}`); }
    }
    return out;
  }

  private async configFeeClaimer(config: string) {
    if (!this.feeClaimerOf.has(config)) this.feeClaimerOf.set(config, (await this.dbc.state.getPoolConfig(config).catch(() => null))?.feeClaimer.toBase58() ?? null);
    return this.feeClaimerOf.get(config) ?? null;
  }

  /** The token's own DAMM v2 pool: tokens.damm_pool, else derived from the DBC config's migrationFeeOption (DAMM_V2_CONFIG override). */
  private async dammPoolOf(mint: string, dammPool: string | null | undefined, config: string | undefined): Promise<PublicKey | null> {
    if (dammPool) return new PublicKey(dammPool);
    const cfg: any = config ? await this.dbc.state.getPoolConfig(config).catch(() => null) : null;
    return cfg ? canonicalDammPool(mint, Number(cfg.migrationFeeOption)) : null;
  }

  async forToken(mint: string, poolId: string, migrated: boolean, dammPool?: string | null, config?: string): Promise<ClaimResult[]> {
    const pool = new PublicKey(poolId), me = this.claimer.publicKey, out: ClaimResult[] = [];
    const base = { pool: poolId, mint };
    // 1) partner share of curve trading fees
    const m = await this.dbc.state.getPoolFeeMetrics(pool);
    const q = big(m.current.partnerQuoteFee), b = big(m.current.partnerBaseFee);
    if (q > 0n || b > 0n) out.push(await this.exec({ ...base, source: "dbc_trading", lamports: q, baseAmount: b },
      () => this.dbc.partner.claimPartnerTradingFee({ feeClaimer: me, payer: me, pool, maxBaseAmount: U64_MAX, maxQuoteAmount: U64_MAX, receiver: this.receiver })));
    if (!migrated) return out;
    // 2) partner migration fee (program rejects a second withdraw; simulation catches that) + 3) partner surplus
    out.push(await this.exec({ ...base, source: "dbc_migration", lamports: 0n, baseAmount: 0n, measure: "receiver", quietSimFail: true }, () => this.dbc.partner.partnerWithdrawMigrationFee({ pool, sender: me })));
    const s = await this.dbc.state.getPoolSurplus(pool).catch(() => null);
    if (s && !s.partnerWithdrawn && !s.partner.isZero()) out.push(await this.exec({ ...base, source: "dbc_surplus", lamports: big(s.partner), baseAmount: 0n }, () => this.dbc.partner.partnerWithdrawSurplus({ feeClaimer: me, pool })));
    // 4) DAMM v2 LP fees on the platform's (locked) LP position(s) in the token's own DAMM v2 pool
    const ours = await this.dammPoolOf(mint, dammPool, config);
    if (!ours) return [...out, { ...base, source: "damm_lp", lamports: 0n, baseAmount: 0n, status: "skipped", note: "DAMM v2 pool unknown (no tokens.damm_pool, config unreadable)" }];
    for (const p of await this.amm.getPositionsByUserAndTokenMint(me, new PublicKey(mint))) {
      if (!p.pool.equals(ours)) { out.push({ pool: p.pool.toBase58(), mint, source: "damm_lp", lamports: 0n, baseAmount: 0n, status: "skipped", note: `position ${p.position.toBase58()} is in another pool containing this mint, not ${ours.toBase58()}` }); continue; }
      const fee = getUnClaimLpFee(p.poolState, p.positionState);
      const quoteIsB = p.poolState.tokenBMint.equals(NATIVE_MINT);
      const lamports = big(quoteIsB ? fee.feeTokenB : fee.feeTokenA), baseAmount = big(quoteIsB ? fee.feeTokenA : fee.feeTokenB);
      if (lamports === 0n && baseAmount === 0n) continue;
      const st = p.poolState;
      const quoteVault = quoteIsB ? st.tokenBVault : st.tokenAVault;
      const alert = baseAmount > 0n ? `ALERT base-side LP fee ${baseAmount} (pool should collect OnlyB; base fees are not rebated)` : undefined;
      out.push(await this.exec({ pool: p.pool.toBase58(), mint, source: "damm_lp", lamports, baseAmount, measure: { vault: quoteVault }, alert }, () => this.amm.claimPositionFee({
        owner: me, position: p.position, pool: p.pool, positionNftAccount: p.positionNftAccount,
        tokenAMint: st.tokenAMint, tokenBMint: st.tokenBMint, tokenAVault: st.tokenAVault, tokenBVault: st.tokenBVault,
        tokenAProgram: getTokenProgram(st.tokenAFlag), tokenBProgram: getTokenProgram(st.tokenBFlag), receiver: this.receiver, feePayer: me,
      })));
    }
    return out;
  }

  /** measure: "receiver" = SOL the fee receiver gained (migration fee: amount unknown before the claim); { vault } = SOL that left
   *  that pool vault (damm_lp: what was actually paid out, not the pre-claim estimate). quietSimFail: a failed simulation is the normal "nothing to claim". */
  private async exec(r: Omit<ClaimResult, "status"> & { measure?: "receiver" | { vault: PublicKey }; quietSimFail?: boolean; alert?: string }, build: () => Promise<Transaction>): Promise<ClaimResult> {
    const { measure, quietSimFail, alert, ...res } = r;
    if (alert) res.note = alert;
    try {
      const tx = await build();
      // With a SOL quote the SDK unwraps by closing the claimer's WSOL ATA. On devnet the claimer is also the referral wallet,
      // whose WSOL ATA is PLATFORM_REFERRAL_TOKEN_ACCOUNT, so re-create it in the same tx (rent comes back from the close).
      const wsol = getAssociatedTokenAddressSync(NATIVE_MINT, this.claimer.publicKey);
      if (await getConnection().getAccountInfo(wsol)) tx.add(createAssociatedTokenAccountIdempotentInstruction(this.claimer.publicKey, wsol, this.claimer.publicKey, NATIVE_MINT));
      const sim = await simulate(tx, this.claimer.publicKey);
      if (!sim.ok) return { ...res, status: "skipped", note: quietSimFail ? undefined : [alert, `simulation failed: ${sim.err}`].filter(Boolean).join("; ") }; // migration fee: nothing to withdraw is the normal case
      if (!this.live) return { ...res, status: "would-claim", note: measure === "receiver" ? "amount known after claim" : alert };
      const sig = await sendOnce(tx, [this.claimer]);
      let lamports = res.lamports;
      if (measure === "receiver") lamports = await this.received(sig);
      else if (measure) {
        const got = await this.vaultOutflow(sig, measure.vault);
        if (got === null) res.note = [alert, "claim tx not readable: recorded the pre-claim estimate"].filter(Boolean).join("; ");
        else lamports = got;
      }
      await db.query("INSERT INTO fee_claims (sig, source, pool, mint, lamports, base_amount, claimed_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
        [sig, res.source, res.pool, res.mint, lamports.toString(), res.baseAmount.toString(), Date.now()]);
      return { ...res, lamports, sig, status: "claimed" };
    } catch (e) { return { ...res, status: "skipped", note: (e as Error).message }; }
  }

  /** Token amount that left `vault` in tx `sig` (pre - post token balance); null when the tx / balances can't be read. */
  private async vaultOutflow(sig: string, vault: PublicKey): Promise<bigint | null> {
    const tx = await getConnection().getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
    if (!tx?.meta) return null;
    const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta.loadedAddresses });
    let i = -1;
    for (let k = 0; k < keys.length; k++) if (keys.get(k)?.equals(vault)) { i = k; break; }
    if (i < 0) return null;
    const amt = (l: typeof tx.meta.preTokenBalances) => (l ?? []).find((x) => x.accountIndex === i)?.uiTokenAmount.amount;
    const pre = amt(tx.meta.preTokenBalances), post = amt(tx.meta.postTokenBalances);
    if (pre === undefined || post === undefined) return null;
    const d = BigInt(pre) - BigInt(post);
    return d > 0n ? d : 0n;
  }

  /** SOL (native + WSOL) received by the fee receiver in a claim tx; tx fee added back when the receiver also paid it. */
  private async received(sig: string): Promise<bigint> {
    const tx = await getConnection().getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
    if (!tx?.meta) return 0n;
    const owner = (this.receiver ?? this.claimer.publicKey).toBase58();
    const keys = tx.transaction.message.getAccountKeys({ accountKeysFromLookups: tx.meta.loadedAddresses }).staticAccountKeys.map((k) => k.toBase58());
    const i = keys.indexOf(owner);
    const native = i < 0 ? 0n : BigInt(tx.meta.postBalances[i] - tx.meta.preBalances[i]) + (i === 0 ? BigInt(tx.meta.fee) : 0n);
    const wsol = (l: typeof tx.meta.preTokenBalances) => (l ?? []).filter((x) => x.mint === NATIVE_MINT.toBase58() && x.owner === owner).reduce((a, x) => a + BigInt(x.uiTokenAmount.amount), 0n);
    const d = native + wsol(tx.meta.postTokenBalances) - wsol(tx.meta.preTokenBalances);
    return d > 0n ? d : 0n;
  }
}
