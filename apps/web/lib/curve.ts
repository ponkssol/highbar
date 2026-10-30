/** Meteora DBC bonding-curve quotes for the trade panel, read-only: the pool + config accounts are read over RPC and the swap math is a
 *  BigInt port of the DBC SDK (swapQuote, ExactIn): curve segments up to the migration sqrt price, fees from the base fee scheduler.
 *  Byte offsets were checked against the SDK's decoded state on a mainnet pool. No signing, no transaction. */
import { PublicKey, type Connection } from "@solana/web3.js";

const DBC_PROGRAM = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
const FEE_DENOMINATOR = 1_000_000_000n;
const MAX_FEE_NUMERATOR = 990_000_000n;
const Q128 = 1n << 128n;
const BASE_DECIMALS = 6, QUOTE_DECIMALS = 9;
const LAMPORTS = 10 ** QUOTE_DECIMALS, BASE_UNIT = 10 ** BASE_DECIMALS;
/** Total supply in whole tokens (every launch mints 1B). */
export const TOTAL_SUPPLY_TOKENS = 1_000_000_000;

export interface CurveConfig {
  migrationQuoteThreshold: bigint; migrationSqrtPrice: bigint; sqrtStartPrice: bigint;
  curve: { sqrtPrice: bigint; liquidity: bigint }[];
  fee: { cliff: bigint; periods: number; frequency: bigint; reduction: bigint; mode: number };
}
export interface CurvePool { config: string; baseReserve: bigint; quoteReserve: bigint; sqrtPrice: bigint; activationPoint: bigint }
export interface CurveState { pool: CurvePool; cfg: CurveConfig; readAt: number }

const u64 = (d: DataView, o: number) => d.getBigUint64(o, true);
const u128 = (d: DataView, o: number) => d.getBigUint64(o, true) | (d.getBigUint64(o + 8, true) << 64n);
const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);

export function decodePool(data: Uint8Array): CurvePool {
  const d = view(data);
  return { config: new PublicKey(data.subarray(72, 104)).toBase58(), baseReserve: u64(d, 232), quoteReserve: u64(d, 240), sqrtPrice: u128(d, 280), activationPoint: u64(d, 296) };
}
export function decodeConfig(data: Uint8Array): CurveConfig {
  const d = view(data);
  const curve: CurveConfig["curve"] = [];
  for (let i = 0; i < 20; i++) {
    const o = 408 + i * 32;
    if (o + 32 > data.length) break;
    curve.push({ sqrtPrice: u128(d, o), liquidity: u128(d, o + 16) });
  }
  return {
    migrationQuoteThreshold: u64(d, 264), migrationSqrtPrice: u128(d, 280), sqrtStartPrice: u128(d, 392), curve,
    fee: { cliff: u64(d, 104), frequency: u64(d, 112), reduction: u64(d, 120), periods: d.getUint16(128, true), mode: data[130] },
  };
}

const cfgCache = new Map<string, CurveConfig>();
/** Pool state (fresh) + config (cached per address: it never changes after creation). Null when the account is missing or not a DBC pool. */
export async function readCurve(connection: Connection, pool: string): Promise<CurveState | null> {
  const acc = await connection.getAccountInfo(new PublicKey(pool));
  if (!acc || acc.owner.toBase58() !== DBC_PROGRAM || acc.data.length < 312) return null;
  const p = decodePool(acc.data);
  let cfg = cfgCache.get(p.config);
  if (!cfg) {
    const c = await connection.getAccountInfo(new PublicKey(p.config));
    if (!c || c.data.length < 440) return null;
    cfg = decodeConfig(c.data);
    cfgCache.set(p.config, cfg);
  }
  return { pool: p, cfg, readAt: Date.now() };
}

const mulDiv = (x: bigint, y: bigint, den: bigint, up: boolean) => { const p = x * y; return up ? (p + den - 1n) / den : p / den; };
const dQuote = (lo: bigint, hi: bigint, liq: bigint, up: boolean) => { const p = liq * (hi - lo); return up ? (p + Q128 - 1n) / Q128 : p >> 128n; };
const dBase = (lo: bigint, hi: bigint, liq: bigint, up: boolean) => mulDiv(liq, hi - lo, lo * hi, up);
const nextFromQuote = (sp: bigint, liq: bigint, amt: bigint) => sp + (amt << 128n) / liq;
const nextFromBase = (sp: bigint, liq: bigint, amt: bigint) => (amt === 0n ? sp : mulDiv(liq, sp, liq + amt * sp, true));

/** Base fee numerator at `point` (unix seconds for timestamp-activated pools, slot otherwise). Dynamic fee is off on highbar configs. */
export function feeNumerator(s: CurveState, point: bigint): bigint {
  const f = s.cfg.fee;
  if (f.frequency === 0n) return f.cliff < MAX_FEE_NUMERATOR ? f.cliff : MAX_FEE_NUMERATOR;
  const elapsed = point > s.pool.activationPoint ? point - s.pool.activationPoint : 0n;
  const period = Number(elapsed / f.frequency < BigInt(f.periods) ? elapsed / f.frequency : BigInt(f.periods));
  let n: bigint;
  if (f.mode === 0) n = f.cliff - BigInt(period) * f.reduction;
  else n = BigInt(Math.floor(Number(f.cliff) * (1 - Number(f.reduction) / 10_000) ** period)); // exponential scheduler (SDK: Q64 pow, same to ~1e-12)
  return n < MAX_FEE_NUMERATOR ? n : MAX_FEE_NUMERATOR;
}
/** Current point for the fee scheduler: activation points above 1e9 are unix timestamps (slots are ~4e8 today). */
export const currentPoint = (s: CurveState, slot?: number) => (s.pool.activationPoint > 1_000_000_000n || slot == null ? BigInt(Math.floor(Date.now() / 1000)) : BigInt(slot));

/** Quote (lamports, fee excluded) -> base along the curve up to the migration price. `left` > 0 = the buy stops at graduation. */
function quoteToBase(s: CurveState, amountIn: bigint) {
  let out = 0n, sp = s.pool.sqrtPrice, left = amountIn;
  const stop = s.cfg.migrationSqrtPrice;
  for (const pt of s.cfg.curve) {
    if (pt.sqrtPrice === 0n || pt.liquidity === 0n) break;
    const ref = stop < pt.sqrtPrice ? stop : pt.sqrtPrice;
    if (ref <= sp) continue;
    const maxIn = dQuote(sp, ref, pt.liquidity, true);
    if (left < maxIn) { const nx = nextFromQuote(sp, pt.liquidity, left); out += dBase(sp, nx, pt.liquidity, false); sp = nx; left = 0n; break; }
    out += dBase(sp, ref, pt.liquidity, false); sp = ref; left -= maxIn;
    if (ref === stop) break;
  }
  return { out, sqrtPrice: sp, left };
}
/** Base (raw units) -> quote (lamports, before fee) back down the curve. `left` > 0 = more tokens than the curve has sold. */
function baseToQuote(s: CurveState, amountIn: bigint) {
  const c = s.cfg.curve;
  let out = 0n, sp = s.pool.sqrtPrice, left = amountIn;
  for (let i = c.length - 2; i >= 0; i--) {
    const pt = c[i], liq = c[i + 1].liquidity;
    if (pt.sqrtPrice === 0n || pt.liquidity === 0n || pt.sqrtPrice >= sp) continue;
    const maxIn = dBase(pt.sqrtPrice, sp, liq, true);
    if (left < maxIn) { const nx = nextFromBase(sp, liq, left); out += dQuote(nx, sp, liq, false); sp = nx; left = 0n; break; }
    out += dQuote(pt.sqrtPrice, sp, liq, false); sp = pt.sqrtPrice; left -= maxIn;
  }
  if (left > 0n) {
    const liq = c[0].liquidity;
    let nx = nextFromBase(sp, liq, left);
    if (nx < s.cfg.sqrtStartPrice) { nx = s.cfg.sqrtStartPrice; left -= dBase(nx, sp, liq, true); } else left = 0n;
    out += dQuote(nx, sp, liq, false); sp = nx;
  }
  return { out, sqrtPrice: sp, left };
}

/** Spot price in SOL per whole token from a Q64 sqrt price. */
export const spotPrice = (sqrtPrice: bigint) => { const r = Number(sqrtPrice) / 2 ** 64; return r * r * 10 ** (BASE_DECIMALS - QUOTE_DECIMALS); };

export interface Quote {
  side: "buy" | "sell";
  /** Amount the quote is for (SOL for buys, tokens for sells); capped at `max` when the input is above it. */
  amountIn: number; capped: boolean;
  /** Buy: tokens out. Sell: SOL out after fee. */
  out: number; feeSol: number; feeBps: number;
  /** (execution price vs spot price before the trade) - 1, in percent, fee excluded. */
  impactPct: number;
  spotBefore: number; spotAfter: number;
  /** Largest input the curve accepts right now: SOL to graduation (fee included) for buys, sold tokens for sells. */
  max: number;
  /** Buy only: tokens left on the curve before graduation. */
  tokensToGraduation?: number;
}

/** SOL (fee included) that takes the curve exactly to its migration price, and the tokens that buys. */
export function maxBuy(s: CurveState, point: bigint) {
  let net = 0n, tokens = 0n, sp = s.pool.sqrtPrice;
  const stop = s.cfg.migrationSqrtPrice;
  for (const pt of s.cfg.curve) {
    if (pt.sqrtPrice === 0n || pt.liquidity === 0n) break;
    const ref = stop < pt.sqrtPrice ? stop : pt.sqrtPrice;
    if (ref <= sp) continue;
    net += dQuote(sp, ref, pt.liquidity, true); tokens += dBase(sp, ref, pt.liquidity, false); sp = ref;
    if (ref === stop) break;
  }
  const fn = feeNumerator(s, point);
  const gross = net === 0n ? 0n : mulDiv(net, FEE_DENOMINATOR, FEE_DENOMINATOR - fn, true);
  return { lamports: gross, sol: Number(gross) / LAMPORTS, tokens: Number(tokens) / BASE_UNIT };
}
/** Tokens the curve has sold (1B minus the pool's base reserve), the most any wallet can sell back. */
export const soldTokens = (s: CurveState) => Math.max(0, TOTAL_SUPPLY_TOKENS - Number(s.pool.baseReserve) / BASE_UNIT);

/** ExactIn quote. Fees: collect mode 0 (in SOL) on the input for buys, on the output for sells. */
export function quote(s: CurveState, side: "buy" | "sell", amount: number, point: bigint): Quote {
  const fn = feeNumerator(s, point);
  const feeBps = Number(fn) / 100_000;
  const spotBefore = spotPrice(s.pool.sqrtPrice);
  if (side === "buy") {
    const m = maxBuy(s, point);
    const capped = amount > m.sol;
    const lamports = capped ? m.lamports : BigInt(Math.floor(amount * LAMPORTS));
    const fee = mulDiv(lamports, fn, FEE_DENOMINATOR, true);
    const r = quoteToBase(s, lamports - fee);
    const out = Number(r.out) / BASE_UNIT, net = Number(lamports - fee) / LAMPORTS;
    const exec = out > 0 ? net / out : spotBefore;
    return { side, amountIn: Number(lamports) / LAMPORTS, capped, out, feeSol: Number(fee) / LAMPORTS, feeBps, impactPct: spotBefore > 0 ? (exec / spotBefore - 1) * 100 : 0,
      spotBefore, spotAfter: spotPrice(r.sqrtPrice), max: m.sol, tokensToGraduation: m.tokens };
  }
  const sold = soldTokens(s);
  const capped = amount > sold;
  const raw = BigInt(Math.floor((capped ? sold : amount) * BASE_UNIT));
  const r = baseToQuote(s, raw);
  const fee = mulDiv(r.out, fn, FEE_DENOMINATOR, true);
  const outSol = Number(r.out - fee) / LAMPORTS, tokens = Number(raw - r.left) / BASE_UNIT;
  const exec = tokens > 0 ? Number(r.out) / LAMPORTS / tokens : spotBefore;
  return { side, amountIn: tokens, capped, out: outSol, feeSol: Number(fee) / LAMPORTS, feeBps, impactPct: spotBefore > 0 ? (1 - exec / spotBefore) * 100 : 0,
    spotBefore, spotAfter: spotPrice(r.sqrtPrice), max: sold };
}
