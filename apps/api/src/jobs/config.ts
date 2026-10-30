import "dotenv/config";
import { BUYBACK_DEFAULTS, CASHBACK_MIN_PAYOUT_SOL, networkOf } from "@hb/shared";
import { officialMint } from "../services/officialToken.js";
import { parseGoPublic } from "./goPublic.js";

const num = (k: string, d: number) => {
  const v = process.env[k], n = v === undefined || v === "" ? d : Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`${k} must be a non-negative number`);
  return n;
};
const lamports = (k: string, dSol: number) => BigInt(Math.round(num(k, dSol) * 1e9));
const list = (k: string) => (process.env[k] ?? "").split(",").map((s) => s.trim()).filter(Boolean);

/** Env for the fee / cashback / buyback jobs (all optional; defaults are devnet + dry-run). */
export const jobs = {
  network: networkOf(process.env.NETWORK),
  /** Live sends on mainnet also need ALLOW_MAINNET=true. */
  allowMainnet: process.env.ALLOW_MAINNET === "true",
  dryRun: (process.env.DRY_RUN ?? "true").toLowerCase() !== "false",
  /** Fee receiver (Squads vault later). Unset = the platform keypair (= config feeClaimer on devnet). */
  treasury: process.env.TREASURY_PUBKEY || null,
  cashbackMinPayout: lamports("CASHBACK_MIN_PAYOUT_SOL", CASHBACK_MIN_PAYOUT_SOL),
  cashbackBatch: Math.max(1, Math.min(10, num("CASHBACK_BATCH", 8))),
  /** Wallets that never earn cashback (platform, referral, treasury, ...), besides the ones the job adds itself. */
  cashbackExclude: list("CASHBACK_EXCLUDE_WALLETS"),
  /** GO_PUBLIC_DATE (UTC YYYY-MM-DD): cashback accrues from this day only (unset = none), and fee claims / splits before it are
   *  left out of the buyback backlog and stats (unset = no date filter). Read by the api (routes/rewards.ts, /stats) and the jobs. jobs/goPublic.ts */
  goPublic: parseGoPublic(process.env.GO_PUBLIC_DATE),
  /** Official $HIGHER mint (shared resolver: BAR_MINT override, else the detected official launch). */
  get barMint(): string | null { return officialMint(); },
  /** jupiter | mock; default mock on devnet (Jupiter does not route devnet), jupiter on mainnet. */
  buybackMode: (process.env.BUYBACK_MODE === "jupiter" || process.env.BUYBACK_MODE === "mock" ? process.env.BUYBACK_MODE : undefined) as "jupiter" | "mock" | undefined,
  maxOrder: lamports("BUYBACK_MAX_ORDER_SOL", BUYBACK_DEFAULTS.maxOrderSol),
  maxOrdersPerRun: Math.max(1, num("BUYBACK_MAX_ORDERS_PER_RUN", BUYBACK_DEFAULTS.maxOrdersPerRun)),
  orderDelayMs: num("BUYBACK_ORDER_DELAY_MS", 60_000),
  /** SOL the buyback wallet always keeps (tx fees, ATA / WSOL rent) on top of its unpaid cashback / LP rebate / fee share. */
  buybackReserve: lamports("BUYBACK_WALLET_RESERVE_SOL", 0.05),
  maxSlippageBps: num("BUYBACK_MAX_SLIPPAGE_BPS", BUYBACK_DEFAULTS.maxSlippageBps),
  maxPriceImpactBps: num("BUYBACK_MAX_PRICE_IMPACT_BPS", BUYBACK_DEFAULTS.maxPriceImpactBps),
  /** Mock buyback (devnet): SOL per whole mock $HIGHER, and where the "spent" SOL goes (default: stays with the platform keypair). */
  mockPriceSol: num("BAR_MOCK_PRICE_SOL", 0.000001),
  mockSolSink: process.env.BAR_MOCK_SOL_SINK || null,
  jupiterUrl: (process.env.JUPITER_API_URL || "https://api.jup.ag/swap/v1").replace(/\/$/, ""),
  jupiterKey: process.env.JUPITER_API_KEY || "",
};
export const buybackMode = () => jobs.buybackMode ?? (jobs.network === "devnet" ? "mock" : "jupiter");
