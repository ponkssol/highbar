import { TIERS, type TierId } from "@hb/shared";

export interface TokenRow {
  devLocked?: boolean;
  unlockAt?: number | null;
  mint: string;
  name: string;
  ticker: string;
  tier: TierId;
  mcapUsd: number;
  raisedSol: number;
  volume24hSol: number;
  createdAt: number;
  creator: string;
  antiSniper: boolean;
  description: string;
}

export interface Trade { sig: string; side: "buy" | "sell"; sol: number; tokens: number; wallet: string; ts: number }
export interface BurnTx { sig: string; bar: number; ts: number }

// deterministic pseudo-random so SSR and client match
let seed = 42;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const addr = (len = 44) => Array.from({ length: len }, () => B58[Math.floor(rnd() * 58)]).join("");

const NOW = 1793280000000; // fixed reference time for mock data
const names: [string, string][] = [
  ["Bar Raiser", "RAISE"], ["Neon Goat", "NGOAT"], ["Higher Cat", "HCAT"], ["Ascent Dog", "ADOG"],
  ["Solar Frog", "SFROG"], ["Max Pain", "MPAIN"], ["Jakarta Moon", "JKTM"], ["Burn Baby", "BURNB"],
  ["Pixel Ape", "PXAPE"], ["Krem Coin", "KREM"], ["Mono Bull", "MBULL"], ["Hatch Bird", "HATCH"],
];
const tiers: TierId[] = ["standard", "higher", "max"];

export const TOKENS: TokenRow[] = names.map(([name, ticker], i) => {
  const tier = tiers[i % 3];
  const target = TIERS[tier].migrationQuoteThresholdSol;
  const pct = i === 2 || i === 7 ? 1 : i % 4 === 1 ? 0.8 + rnd() * 0.19 : rnd() * 0.75;
  const raised = +(target * pct).toFixed(2);
  return {
    mint: addr(),
    name,
    ticker,
    tier,
    raisedSol: raised,
    mcapUsd: Math.round(4000 + raised * 1900 + rnd() * 3000),
    volume24hSol: +(raised * (0.6 + rnd() * 2)).toFixed(1),
    createdAt: NOW - Math.floor(rnd() * 3 * 86400_000),
    creator: addr(),
    antiSniper: rnd() > 0.45,
    description: `${name} is a community token launched on Higher Bar.`,
  };
});

export const NOW_TS = NOW;
export const progressOf = (t: TokenRow) => Math.min(1, t.raisedSol / TIERS[t.tier].migrationQuoteThresholdSol);

export const STATS = {
  totalVolumeSol: 18_420.6,
  volumeDelta: 12.4,
  creatorFeesSol: 64.47,
  creatorDelta: 8.1,
  barBurned: 1_284_950,
  burnDelta: 3.2,
  graduatedPct: 0.18,
  graduated: 46,
  totalTokens: 256,
  newPerDay: [
    { day: "Mon", tokens: 32, graduated: 6 },
    { day: "Tue", tokens: 41, graduated: 9 },
    { day: "Wed", tokens: 28, graduated: 4 },
    { day: "Thu", tokens: 55, graduated: 12 },
    { day: "Fri", tokens: 47, graduated: 8 },
    { day: "Sat", tokens: 36, graduated: 5 },
    { day: "Sun", tokens: 17, graduated: 2 },
  ],
};

export function pricesFor(mint: string, n = 60): number[] {
  let s = [...mint].reduce((a, c) => a + c.charCodeAt(0), 0) || 1;
  const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  let p = 0.00001;
  return Array.from({ length: n }, () => (p = Math.max(0.000002, p * (0.96 + r() * 0.1))));
}

export function tradesFor(mint: string): Trade[] {
  return Array.from({ length: 12 }, (_, i) => ({
    sig: addr(88),
    side: rnd() > 0.4 ? "buy" : "sell",
    sol: +(rnd() * 2).toFixed(3),
    tokens: Math.round(rnd() * 5_000_000),
    wallet: addr(),
    ts: NOW - i * 97_000 - Math.floor(rnd() * 60_000),
  }));
}

export const BURNS: BurnTx[] = Array.from({ length: 10 }, (_, i) => ({
  sig: addr(88),
  bar: Math.round(20_000 + rnd() * 180_000),
  ts: NOW - i * 6 * 3600_000 - Math.floor(rnd() * 3600_000),
}));

export const tierCounts = () =>
  tiers.map((t) => ({ tier: t, count: TOKENS.filter((x) => x.tier === t).length }));
export const findToken = (mint: string) => TOKENS.find((t) => t.mint === mint);