/** The /docs page as Markdown for /llms-full.txt. Same text as app/docs/page.tsx and every number from the same
 *  @hb/shared constants, so the two cannot drift on figures. Keep the prose in step when the docs page changes. */
import {
  ANTI_SNIPER_SCHEDULE, BUYBACK_DEFAULTS, CASHBACK_MIN_PAYOUT_SOL, CURVE_FEE_BPS, DAMM_V2_POOL_FEE_BPS, DAMM_V2_PROTOCOL_SHARE, LP_REBATE_BPS,
  LP_REBATE_MIN_PAYOUT_SOL, MAINNET_THRESHOLD_SOL, METEORA_MIGRATION_LIQUIDITY_SHARE, METEORA_PROTOCOL_SHARE, REFERRAL_DEFAULTS, REFERRAL_PARAM,
  REFERRAL_SHARE_OF_PROTOCOL, SPLIT_BPS, SUPPLY_ON_MIGRATION_PCT, TIERS, TRADER_CASHBACK_BPS, curveFeeSplit, lpFeeSplit, migrationMcapSol,
  postMigrationSplit, scheduleDurationSeconds, scheduleEndFeeBps, scheduledFeeBps, type TierId,
} from "@hb/shared";
import { FAQ_TEXT } from "./docsFaq";

const TOTAL_SUPPLY = 1_000_000_000, TOKEN_DECIMALS = 6, DEV_BUY_MAX_SOL = 20; // same sources as app/docs/page.tsx
const IDS = Object.keys(TIERS) as TierId[];
const num = (v: number, d = 3) => v.toLocaleString("en-US", { maximumFractionDigits: d });
const bpsPct = (bps: number, d = 3) => `${num(bps / 100, d)}%`;
const share = (frac: number) => `${num(frac * 100)}%`;
const sol = (v: number) => `${num(v, 3)} SOL`;
const curve = (id: TierId) => curveFeeSplit(TIERS[id]);
const post = (id: TierId) => postMigrationSplit(TIERS[id]);
const migFeeSol = (id: TierId) => (MAINNET_THRESHOLD_SOL[id] * TIERS[id].migrationFeePercentage) / 100;
const S = ANTI_SNIPER_SCHEDULE;
const table = (head: string[], rows: string[][]) => [`| ${head.join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.join(" | ")} |`)].join("\n");
const list = (items: string[], ordered = false) => items.map((x, i) => `${ordered ? `${i + 1}.` : "-"} ${x}`).join("\n");

export function docsMarkdown(site: string): string {
  const u = (p: string) => `${site}${p}`;
  const referralOfVolumeBps = CURVE_FEE_BPS * METEORA_PROTOCOL_SHARE * REFERRAL_SHARE_OF_PROTOCOL;
  return [
    `# How the highbar Solana launchpad works`,
    `Everything about launching, trading and earning on highbar, in plain words. Source: ${u("/docs")}`,
    `## What highbar is`,
    `highbar is a Solana token launchpad in the spirit of pump.fun, with one big difference: the creator picks how high the bar is. Each token starts on a Meteora Dynamic Bonding Curve (DBC) and, once it raises its target, graduates into a Meteora DAMM v2 pool with permanently locked liquidity.`,
    `A higher target means deeper liquidity at migration and a bigger cut of trading fees for the creator. There is no custom token contract. Every launch uses one of six fixed Meteora DBC configs: three tiers, each with the anti-sniper fee on or off.`,
    list([`Three tiers: ${IDS.map((id) => TIERS[id].label).join(", ")}.`, `A ${bpsPct(CURVE_FEE_BPS)} trading fee on the curve, shared by the creator, the platform and Meteora.`,
      "Optional Dev Lock for the creator's own tokens, with a public countdown.", "Cashback for traders, a buyback and burn of $HIGHER, and a referral program."]),
    `## Launch a token`,
    list([`Open [Launch](${u("/launch")}) and connect your wallet.`, "Add a name (up to 32 bytes), a ticker (up to 10 bytes), an image and optional links.",
      "Pick a tier: Standard, Higher or Max. The tier sets the migration target and how fees are shared.", "Choose whether the anti-sniper fee is on. It is off by default, so turn it on if you want early bots to pay more.",
      `Optionally add a dev buy of up to ${sol(DEV_BUY_MAX_SOL)}. It goes into the same transaction that creates the pool, so you buy first.`, "Sign the transaction in your wallet. Your token is live the moment it confirms."], true),
    `### Tiers and fees`,
    `Every trade on the curve pays a ${bpsPct(CURVE_FEE_BPS)} fee. Meteora keeps ${share(METEORA_PROTOCOL_SHARE)} of it (${bpsPct(curve("standard").protocol)} of the trade) and the rest is split between the creator and the platform by tier.`,
    table(["Tier", "Migrates at", "Creator on the curve", "Platform on the curve", "Meteora", "Migration fee", "Creator share of it"], IDS.map((id) => [
      TIERS[id].label, sol(MAINNET_THRESHOLD_SOL[id]), bpsPct(curve(id).creator), bpsPct(curve(id).platform), bpsPct(curve(id).protocol),
      `${TIERS[id].migrationFeePercentage}%${migFeeSol(id) > 0 ? ` (${sol(migFeeSol(id))})` : ""}`, `${TIERS[id].creatorMigrationFeePercentage}%`])),
    `Fees on the curve are shown as a share of each trade. Higher is stored on-chain as ${TIERS.higher.creatorTradingFeePercentage}% of the non Meteora fee because the program only accepts whole numbers, which gives the creator ${bpsPct(curve("higher").creator)} of every trade. The migration fee is taken from the SOL raised when the token graduates. On Higher, half of it goes to the creator, which is ${sol((migFeeSol("higher") * TIERS.higher.creatorMigrationFeePercentage) / 100)}.`,
    `> Traders never pay an extra app fee on top of the ${bpsPct(CURVE_FEE_BPS)} curve fee. The ticker HIGHER is reserved for the official token.`,
    `## Meteora DBC bonding curve and DAMM v2 migration`,
    "Every token trades on its own Meteora bonding curve, priced in SOL. Each buy pushes the price up the curve and each sell moves it back down. The progress bar on a token shows how much SOL the curve holds compared to its tier target.",
    `When the curve reaches the target, it graduates: the pool migrates to a Meteora DAMM v2 pool. The SOL raised, minus the migration fee, goes into the new pool together with ${SUPPLY_ON_MIGRATION_PCT}% of the token supply. Meteora keeps a fixed ${share(METEORA_MIGRATION_LIQUIDITY_SHARE)} of the migrated liquidity.`,
    table(["Tier", "Migration target", "Approx. market cap at migration", "Locked LP to creator", "Locked LP to platform"],
      IDS.map((id) => [TIERS[id].label, sol(MAINNET_THRESHOLD_SOL[id]), sol(migrationMcapSol(id, "mainnet")), `${TIERS[id].lpCreatorPercentage}%`, `${TIERS[id].lpPlatformPercentage}%`])),
    "The liquidity in the DAMM v2 pool is locked forever. It is split into two permanent positions, one for the creator and one for the platform, in the shares above. Nobody can pull it.",
    `### After migration`,
    `The DAMM v2 pool charges a ${bpsPct(DAMM_V2_POOL_FEE_BPS)} fee on every trade. Meteora keeps ${share(DAMM_V2_PROTOCOL_SHARE)} of it (${bpsPct(lpFeeSplit(TIERS.standard).protocol)} of the trade) and the remaining ${bpsPct(lpFeeSplit(TIERS.standard).lp)} goes to the locked LP positions. With the creator LP rebate, creators end up with ${IDS.map((id) => `${bpsPct(post(id).creator)} on ${TIERS[id].label}`).join(", ")} of post migration volume.`,
    `## Anti-sniper fee`,
    "Bots like to buy in the first seconds of a launch. When the anti-sniper fee is on, the trading fee starts high and falls quickly, so early sniping is expensive and normal trading is not affected.",
    list([`Start fee: ${bpsPct(S.cliffFeeBps)} of the trade, the moment the pool goes live.`,
      `Decay: exponential, over ${S.numberOfPeriod} steps of ${S.periodFrequency} second each. Every second the fee drops by ${bpsPct(S.reductionFactor, 2)} of its current value.`,
      `End fee: about ${bpsPct(scheduleEndFeeBps(S), 2)} after ${scheduleDurationSeconds(S)} seconds, the normal curve fee from then on.`,
      "The creator's dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee.", `With anti-sniper off, the fee is a flat ${bpsPct(CURVE_FEE_BPS)} from the first trade.`]),
    table(["Seconds after launch", ...[0, 10, 20, 30, 45, 60].map((s) => `${s}s`)], [["Trading fee", ...[0, 10, 20, 30, 45, 60].map((s) => bpsPct(scheduledFeeBps(S, s), 2))]]),
    "The trade panel on a token shows the live fee while the decay is running.",
    `## Dev Lock`,
    "Creators can lock their own tokens to show they are in it for the long run. Locks use Jupiter Lock, an on-chain escrow, and they are permanent: nobody, including the creator, can cancel a lock or change who receives the tokens.",
    list(["Open your token and press Dev Lock. Only the wallet that created the token sees the button.", "Enter the amount, an unlock date (between one minute and ten years from now) and optional linear vesting after the unlock (up to 3650 days).",
      "Confirm that you understand the lock cannot be undone, then sign. A small protocol tip in SOL is shown before you sign."], true),
    `Locked tokens show a Dev locked badge on the token page, in token lists and on the leaderboard, with a live countdown to the unlock date. Every lock also has a public page you can share, and all locks are listed on [Locks](${u("/locks")}).`,
    "Once the unlock date passes, open the token and use Claim unlocked. With vesting, tokens release step by step after the unlock date and you can claim whatever has released so far.",
    `## Claim creator fees`,
    "Your share of trading fees builds up on-chain, in the pool itself. You claim it yourself, whenever you like, from Portfolio, Claim fees: connect the wallet you launched with, sign a short free message to prove it is your wallet, then claim one token or all of them.",
    list(["Trading fees from the bonding curve, paid out in SOL.", "Your share of the migration fee, once the token has graduated (Higher tier only).",
      "LP fees from your locked DAMM v2 position after migration. These follow the position NFT, so whoever holds it can claim."]),
    `## Creator LP rebate`,
    "After migration, the platform shares most of its own LP fees with the creator. Each time the platform claims the fees on its locked DAMM v2 position, it forwards a fixed part of that SOL to the token's creator. The on-chain pool and the LP split do not change. The rebate is paid on top.",
    table(["Tier", "Rebate of platform LP fees", "Creator LP share", "Creator total", "Platform", "Meteora"],
      IDS.map((id) => [TIERS[id].label, bpsPct(LP_REBATE_BPS[id], 2), bpsPct(post(id).creatorLp), bpsPct(post(id).creator), bpsPct(post(id).platform), bpsPct(post(id).protocol)])),
    `Shares are of post migration volume. The rebate goes to the token's creator wallet automatically, with nothing to sign. Payouts start at ${sol(LP_REBATE_MIN_PAYOUT_SOL)}. Smaller amounts carry over to the next payout.`,
    `## Trader cashback in $HIGHER`,
    `Trades you make through highbar earn ${bpsPct(TRADER_CASHBACK_BPS, 2)} of their volume back. The platform pays it from its own share, so it never touches creators or other traders.`,
    list(["Cashback is tallied per UTC day.", "It is paid in $HIGHER once $HIGHER launches. Until then it is paid in SOL.", `Payouts start at ${sol(CASHBACK_MIN_PAYOUT_SOL)}. Smaller balances carry over to the next day.`,
      "Holding $HIGHER can raise your cashback. The holder tiers are still being finalised.", "Only trades made on highbar count. Every payout links its transaction."]),
    `## Buyback and burn`,
    "After the creator LP rebate and trader cashback, the platform's net income is split three ways.",
    table(["Buyback and burn", "Operations", "Treasury"], [[bpsPct(SPLIT_BPS.buyback, 0), bpsPct(SPLIT_BPS.ops, 0), bpsPct(SPLIT_BPS.treasury, 0)]]),
    `The buyback share buys $HIGHER on the open market and burns every token it buys, on-chain. Orders are kept small to limit price impact: by default at most ${sol(BUYBACK_DEFAULTS.maxOrderSol)} per order, at most ${bpsPct(BUYBACK_DEFAULTS.maxSlippageBps)} slippage and ${bpsPct(BUYBACK_DEFAULTS.maxPriceImpactBps)} price impact, and up to ${BUYBACK_DEFAULTS.maxOrdersPerRun} orders per run.`,
    "Until $HIGHER launches, the buyback share accrues and is spent once trading starts. Every buy and burn is listed with its transaction. This is not an investment and no returns are promised.",
    `## Referrals`,
    `Share your link and earn from the trades of the wallets you bring in. Your link is the site address with your wallet in it: \`${site}/?${REFERRAL_PARAM}=<your wallet address>\``,
    list(["The first referral link a visitor opens is remembered. When they sign in with their wallet, they are tied to you for good.",
      `Rewards come only from the referral fee Meteora pays highbar on curve trades: ${share(REFERRAL_SHARE_OF_PROTOCOL)} of Meteora's protocol fee, about ${bpsPct(referralOfVolumeBps, 2)} of volume. Nothing comes from creators, traders or the platform's share.`,
      `Each UTC day, ${REFERRAL_DEFAULTS.rewardBps >= 10_000 ? "all of the" : `${bpsPct(REFERRAL_DEFAULTS.rewardBps, 2)} of the`} referral income your referred wallets generated is shared out by trading volume, never more than was actually received.`,
      `Paid in SOL once you reach ${sol(REFERRAL_DEFAULTS.minPayoutSol)}.`]),
    `## Token supply`,
    "Every token launched on highbar is created by the same on-chain config, so they all share these facts.",
    table(["Property", "Value"], [["Total supply", TOTAL_SUPPLY.toLocaleString("en-US")], ["Decimals", String(TOKEN_DECIMALS)], ["Mint authority", "Off. No new tokens can ever be minted"],
      ["Metadata", "Immutable"], ["Supply into the DAMM v2 pool at migration", `${SUPPLY_ON_MIGRATION_PCT}%`], ["Token standard", "SPL Token"]]),
    `There is no team allocation and no presale. The supply is shared between the bonding curve and the ${SUPPLY_ON_MIGRATION_PCT}% that goes into the DAMM v2 pool at migration, with nothing left over. Creators get tokens only by buying them, like everyone else.`,
    `## FAQ`,
    ...FAQ_TEXT.map(([q, a]) => `### ${q}\n\n${a}`),
  ].join("\n\n") + "\n";
}
