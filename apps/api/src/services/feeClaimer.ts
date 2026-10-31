import BN from "bn.js";
import { PublicKey, type Connection, type Keypair, type Transaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, NATIVE_MINT, createAssociatedTokenAccountIdempotentInstruction, createCloseAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { CpAmm, getUnClaimLpFee } from "@meteora-ag/cp-amm-sdk";
import { getClient, getConnection } from "@hb/onchain";
import { db, type Q } from "../db/pool.js";
import { jobs } from "../jobs/config.js";
import { sendOnce, simulate } from "../jobs/chain.js";
import { canonicalDammPool, claimPositionFeeTx } from "./creatorLp.js";

export type FeeSource = "dbc_trading" | "dbc_migration" | "dbc_surplus" | "damm_lp";
export interface ClaimResult { source: FeeSource; pool: string; mint: string; lamports: bigint; baseAmount: bigint; sig?: string; status: "claimed" | "would-claim" | "skipped"; note?: string }

/** Optional overrides (autoclaim / tests). Unset = the epoch behaviour: TREASURY_PUBKEY receiver, shared db / RPC, no threshold, no cap. */
export interface FeeClaimerOpts {
  /** Fee receiver. undefined = TREASURY_PUBKEY (epoch default); null = always the signer (autoclaim); a key = that wallet. */
  receiver?: PublicKey | null;
  /** Claim a DBC trading fee / DAMM v2 LP fee only when its SOL side is >= this (or it has a base-side amount). Default 0 = any amount. */
  minLamports?: bigint;
  /** Per-run cap shared by every tx this claimer builds: each would-claim / claimed result takes one; at 0 the rest are skipped. */
  budget?: { left: number };
  q?: Q;
  conn?: Pick<Connection, "getAccountInfo" | "getTransaction">;
  dbc?: ReturnType<typeof getClient>;
  amm?: CpAmm;
  simulate?: typeof simulate;
  send?: typeof sendOnce;
}
/** Pre-read partner fee of the DBC pool (autoclaim batch read): forToken then skips its own getPoolFeeMetrics RPC.
 *  baseAtaExists: whether the receiver's base-token ATA existed in that batched read (undefined = not read; the SDK's own
 *  existence check, i.e. whether it emitted a create instruction, is then the only signal). */
export interface ForTokenOpts { partner?: { quote: bigint; base: bigint }; baseMint?: string; baseAtaExists?: boolean }

const U64_MAX = new BN("18446744073709551615");
const big = (b: BN) => BigInt(b.toString());
/** The threshold rule shared by the DBC trading and DAMM v2 LP claims. */
export const meetsMin = (lamports: bigint, base: bigint, min: bigint) => base > 0n || (lamports > 0n && lamports >= min);

/** claimPartnerTradingFee (DBC SDK 2.0.0 resolveTradingFeeAccounts -> getOrCreateATAs) ALWAYS adds a createIdempotent for the
 *  receiver's base-token ATA when it is missing, whatever maxBaseAmount is (the program needs an initialized token_a_account).
 *  With a zero base fee that ATA stays empty and its rent (~0.0015 SOL) is stranded. When the claim moves no base tokens
 *  (maxBaseAmount = 0) and the ATA was created by THIS tx, close it again at the end of the same tx (destination + authority =
 *  owner): net rent 0. Pre-existing ATAs are never touched (no create in the tx = nothing to close). Returns the closed ATA. */
export function closeFreshBaseAta(tx: Transaction, owner: PublicKey, baseMint?: PublicKey): PublicKey | null {
  const create = tx.instructions.find((ix) => ix.programId.equals(ASSOCIATED_TOKEN_PROGRAM_ID) && ix.keys.length >= 6
    && ix.keys[2].pubkey.equals(owner) && !ix.keys[3].pubkey.equals(NATIVE_MINT) && (!baseMint || ix.keys[3].pubkey.equals(baseMint)));
  if (!create) return null;
  const ata = create.keys[1].pubkey, tokenProgram = create.keys[5].pubkey;
  tx.add(createCloseAccountInstruction(ata, owner, owner, [], tokenProgram));
  return ata;
}

/** Claims platform (partner) fees for every indexed token into the treasury.
 *  Verified against @meteora-ag/dynamic-bonding-curve-sdk 2.0.0 and @meteora-ag/cp-amm-sdk 1.5.1 typings:
 *  - DBC curve:  state.getPoolFeeMetrics(pool).current.partnerQuoteFee/partnerBaseFee -> partner.claimPartnerTradingFee({ feeClaimer, payer, pool, maxBaseAmount, maxQuoteAmount, receiver? })
 *  - migrated:   partner.partnerWithdrawMigrationFee({ pool, sender }), state.getPoolSurplus(pool) -> partner.partnerWithdrawSurplus({ feeClaimer, pool })
 *  - DAMM v2 LP: cpAmm.getPositionsByUserAndTokenMint(owner, mint) + getUnClaimLpFee(poolState, positionState) -> claimPositionFeeTx (creatorLp.ts):
 *    cpAmm.claimPositionFee2({ ..., receiver: treasury }) when the treasury is a different wallet (claimPositionFee with a receiver but
 *    no tempWSolAccount throws in 1.5.1), else cpAmm.claimPositionFee({ owner, position, pool, positionNftAccount, tokenA/B Mint/Vault/Program, feePayer })
 *    getPositionsByUserAndTokenMint matches ANY pool containing the mint, so only positions in the token's own DAMM v2 pool (tokens.damm_pool,
 *    else the canonical pool derived from the config) are claimed. The recorded damm_lp amount is what actually left the pool's SOL vault
 *    in the claim tx (falls back to the pre-claim estimate only if the tx cannot be read back). Fee collect mode is OnlyB, so a base-token
 *    LP fee is unexpected: it is claimed but flagged with an ALERT note (and never rebated, see lpRebate.ts).
 *  `claimer` must be the configs' feeClaimer (and owner of the partner LP position NFTs after migration).
 *  Every tx is simulated first; dry-run stops there. Live claims are recorded in fee_claims (period NULL until the epoch is split).
 *  The hourly autoclaim job (services/autoClaim.ts) uses the same builders with opts.receiver = null (fees stay with the signer). */
export class FeeClaimer {
  private dbc: ReturnType<typeof getClient>;
  private ammClient?: CpAmm;
  private feeClaimerOf = new Map<string, string | null>();
  private q: Q;
  private conn: Pick<Connection, "getAccountInfo" | "getTransaction">;
  private sim: typeof simulate;
  private send: typeof sendOnce;
  private min: bigint;
  constructor(private claimer: Keypair, private live: boolean, private opts: FeeClaimerOpts = {}) {
    this.dbc = opts.dbc ?? getClient();
    this.q = opts.q ?? db;
    this.conn = opts.conn ?? getConnection();
    this.sim = opts.simulate ?? simulate;
    this.send = opts.send ?? sendOnce;
    this.min = opts.minLamports ?? 0n;
  }
  private get amm(): CpAmm { return (this.ammClient ??= this.opts.amm ?? new CpAmm(getConnection())); }
  /** Receiver passed to the SDK; undefined = the claimer itself (SDK default). */
  get receiver(): PublicKey | undefined {
    const r = this.opts.receiver !== undefined ? this.opts.receiver : jobs.treasury ? new PublicKey(jobs.treasury) : null;
    return r && !r.equals(this.claimer.publicKey) ? r : undefined;
  }

  async runAll(log: (m: string) => void = console.log): Promise<ClaimResult[]> {
    const { rows } = await this.q.query<{ mint: string; pool: string; config: string; is_migrated: boolean; damm_pool: string | null }>("SELECT mint, pool, config, is_migrated, damm_pool FROM tokens ORDER BY created_at");
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

  async forToken(mint: string, poolId: string, migrated: boolean, dammPool?: string | null, config?: string, o: ForTokenOpts = {}): Promise<ClaimResult[]> {
    const pool = new PublicKey(poolId), me = this.claimer.publicKey, out: ClaimResult[] = [];
    const base = { pool: poolId, mint };
    // 1) partner share of curve trading fees
    let q: bigint, b: bigint;
    if (o.partner) ({ quote: q, base: b } = o.partner);
    else { const m = await this.dbc.state.getPoolFeeMetrics(pool); q = big(m.current.partnerQuoteFee); b = big(m.current.partnerBaseFee); }
    if (meetsMin(q, b, this.min)) out.push(await this.exec({ ...base, source: "dbc_trading", lamports: q, baseAmount: b }, () => this.tradingTx(pool, b, o)));
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
      if (!meetsMin(lamports, baseAmount, this.min)) { out.push({ pool: p.pool.toBase58(), mint, source: "damm_lp", lamports, baseAmount, status: "skipped" }); continue; } // below the threshold: next run
      const st = p.poolState;
      const quoteVault = quoteIsB ? st.tokenBVault : st.tokenAVault;
      const alert = baseAmount > 0n ? `ALERT base-side LP fee ${baseAmount} (pool should collect OnlyB; base fees are not rebated)` : undefined;
      out.push(await this.exec({ pool: p.pool.toBase58(), mint, source: "damm_lp", lamports, baseAmount, measure: { vault: quoteVault }, alert }, () => claimPositionFeeTx(this.amm, {
        owner: me, feePayer: me, receiver: this.receiver, position: p.position, pool: p.pool, positionNftAccount: p.positionNftAccount, poolState: st,
      })));
    }
    return out;
  }

  /** Partner trading fee claim. Base fee 0: maxBaseAmount = 0 (no base transfer) and a base ATA the SDK creates for this claim
   *  is closed in the same tx (closeFreshBaseAta), unless the batched read saw it already existing. Base fee > 0: unchanged
   *  (ATA created if needed, receives the tokens). Close needs the owner's signature, so only when the receiver is the signer. */
  private async tradingTx(pool: PublicKey, baseFee: bigint, o: ForTokenOpts): Promise<Transaction> {
    const me = this.claimer.publicKey;
    const tx = await this.dbc.partner.claimPartnerTradingFee({ feeClaimer: me, payer: me, pool, maxBaseAmount: baseFee > 0n ? U64_MAX : new BN(0), maxQuoteAmount: U64_MAX, receiver: this.receiver });
    if (baseFee === 0n && o.baseAtaExists !== true && !this.receiver) closeFreshBaseAta(tx, me, o.baseMint ? new PublicKey(o.baseMint) : undefined);
    return tx;
  }

  /** measure: "receiver" = SOL the fee receiver gained (migration fee: amount unknown before the claim); { vault } = SOL that left
   *  that pool vault (damm_lp: what was actually paid out, not the pre-claim estimate). quietSimFail: a failed simulation is the normal "nothing to claim". */
  private async exec(r: Omit<ClaimResult, "status"> & { measure?: "receiver" | { vault: PublicKey }; quietSimFail?: boolean; alert?: string }, build: () => Promise<Transaction>): Promise<ClaimResult> {
    const { measure, quietSimFail, alert, ...res } = r;
    if (alert) res.note = alert;
    const budget = this.opts.budget;
    if (budget && budget.left <= 0) return { ...res, status: "skipped", note: [alert, "CLAIM_MAX_PER_RUN reached: next run"].filter(Boolean).join("; ") };
    try {
      const tx = await build();
      // With a SOL quote the SDK unwraps by closing the claimer's WSOL ATA. On devnet the claimer is also the referral wallet,
      // whose WSOL ATA is PLATFORM_REFERRAL_TOKEN_ACCOUNT, so re-create it in the same tx (rent comes back from the close).
      const wsol = getAssociatedTokenAddressSync(NATIVE_MINT, this.claimer.publicKey);
      if (await this.conn.getAccountInfo(wsol)) tx.add(createAssociatedTokenAccountIdempotentInstruction(this.claimer.publicKey, wsol, this.claimer.publicKey, NATIVE_MINT));
      const sim = await this.sim(tx, this.claimer.publicKey);
      if (!sim.ok) return { ...res, status: "skipped", note: quietSimFail ? undefined : [alert, `simulation failed: ${sim.err}`].filter(Boolean).join("; ") }; // migration fee: nothing to withdraw is the normal case
      if (budget) budget.left--;
      if (!this.live) return { ...res, status: "would-claim", note: measure === "receiver" ? "amount known after claim" : alert };
      const sig = await this.send(tx, [this.claimer]);
      let lamports = res.lamports;
      if (measure === "receiver") lamports = await this.received(sig);
      else if (measure) {
        const got = await this.vaultOutflow(sig, measure.vault);
        if (got === null) res.note = [alert, "claim tx not readable: recorded the pre-claim estimate"].filter(Boolean).join("; ");
        else lamports = got;
      }
      await recordClaim(this.q, { sig, source: res.source, pool: res.pool, mint: res.mint, lamports, baseAmount: res.baseAmount });
      return { ...res, lamports, sig, status: "claimed" };
    } catch (e) { return { ...res, status: "skipped", note: (e as Error).message }; }
  }

  /** Token amount that left `vault` in tx `sig` (pre - post token balance); null when the tx / balances can't be read. */
  private async vaultOutflow(sig: string, vault: PublicKey): Promise<bigint | null> {
    const tx = await this.conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" }).catch(() => null);
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
    const tx = await this.conn.getTransaction(sig, { maxSupportedTransactionVersion: 0, commitment: "confirmed" });
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

/** One fee_claims row per landed claim tx. UNIQUE (sig, source, pool) + ON CONFLICT DO NOTHING: a re-run / retry never double-counts.
 *  period stays NULL until the epoch split; Open Book (openbook/read.ts) and the treasury split read these rows. Returns true when inserted. */
export async function recordClaim(q: Q, c: { sig: string; source: FeeSource; pool: string; mint: string; lamports: bigint; baseAmount: bigint; at?: number }): Promise<boolean> {
  const r = await q.query("INSERT INTO fee_claims (sig, source, pool, mint, lamports, base_amount, claimed_at) VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING",
    [c.sig, c.source, c.pool, c.mint, c.lamports.toString(), c.baseAmount.toString(), c.at ?? Date.now()]);
  return (r.rowCount ?? 0) > 0;
}
