import { DocTable } from "@/components/docs/Docs";
import { ANTI_ROWS, FACT, TIERS_FACT } from "@/lib/guideFacts";

export function CurveFeeTable() {
  return (
    <DocTable caption="Curve trading fee by tier" head={["Tier", "Graduates at", "Creator", "Platform", "Meteora"]}
      rows={TIERS_FACT.map((t) => [t.label, t.target, t.curveCreator, t.curvePlatform, t.curveMeteora])} />
  );
}

export function MigrationTable() {
  return (
    <DocTable caption="Migration targets" head={["Tier", "Target", "Approx. market cap", "Locked LP, creator", "Locked LP, platform", "Migration fee"]}
      rows={TIERS_FACT.map((t) => [t.label, t.target, t.mcap, t.lpCreator, t.lpPlatform, t.migFeeSol === "none" ? t.migFeePct : `${t.migFeePct} (${t.migFeeSol})`])} />
  );
}

export function PostMigrationTable() {
  return (
    <DocTable caption="Post-migration share of volume" head={["Tier", "Creator, with rebate", "Platform", "Meteora", "Rebate of platform LP fees"]}
      rows={TIERS_FACT.map((t) => [t.label, t.postCreator, t.postPlatform, t.postMeteora, t.rebate])} />
  );
}

export function AntiSniperTable() {
  return (
    <DocTable transpose caption="Anti-sniper fee over time" head={["Seconds after launch", ...ANTI_ROWS.map((r) => `${r.seconds}s`)]}
      rows={[["Trading fee", ...ANTI_ROWS.map((r) => r.fee)]]} />
  );
}

export function feeIntro() {
  return `Every trade on the curve pays ${FACT.curveFee}. Meteora keeps ${FACT.meteoraShareOfFee} of that fee. The rest is split by tier.`;
}
