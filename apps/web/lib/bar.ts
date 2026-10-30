/** $HIGHER utility (step 8) API shapes: GET /bar and GET /bar/:wallet. */
import { BAR_TIERS, MAX_TIER_MIN_BAR, type BarTier } from "@hb/shared";
import { useApiData } from "./pagesData";

export type BarInfo = {
  network: "devnet" | "mainnet"; barMint: string | null; barMintUrl: string | null; enabled: boolean; tiers: BarTier[]; baseCashbackBps: number;
  maxTierMinBar: number; gateMaxTier: boolean; symbol?: string; launched?: boolean; officialSource?: "env" | "override" | "detected" | null; feeShareBps: number; opsSplitBps: number; feeShareLive: boolean; limits: string[];
};
export type FeeShareRow = { period: string; balanceRaw: string; amountSol: number; poolSol: number; paidSig: string | null; paidAt: number | null; pending: boolean; paidUrl: string | null };
export type BarWallet = {
  wallet: string; network: "devnet" | "mainnet"; enabled: boolean; balance: number; tier: BarTier; next: { tier: BarTier; needBar: number } | null; maxTierAccess: boolean;
  paidSol: number; unpaidSol: number; cashbackBonusSol: number; cashbackBonusPaidSol: number; ledger: FeeShareRow[];
};
export const BAR_INFO_FALLBACK: BarInfo = {
  network: "devnet", barMint: null, barMintUrl: null, enabled: false, tiers: [...BAR_TIERS], baseCashbackBps: 5, maxTierMinBar: MAX_TIER_MIN_BAR,
  gateMaxTier: false, feeShareBps: 2000, opsSplitBps: 5000, feeShareLive: false, limits: [],
};

export const useBarInfo = () => useApiData<BarInfo>("/bar", BAR_INFO_FALLBACK, 60_000);
export const useBarWallet = (address: string | null) => useApiData<BarWallet | null>(address ? `/bar/${address}` : null, null, 60_000);
export const fmtBar = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
/** "1.5x cashback", "+0.05% rebate" etc. */
export const perkLines = (t: BarTier) => [
  `${(t.cashbackMultiplierBps / 10_000).toLocaleString("en-US", { maximumFractionDigits: 2 })}x cashback`,
  ...(t.feeRebateBps ? [`+${t.feeRebateBps / 100}% fee rebate`] : []),
  ...(t.maxTierAccess ? ["Max tier launches"] : []),
  ...(t.feeShare ? ["Fee share"] : []),
];
