import type { Metadata } from "next";
import { Plus } from "lucide-react";
import {
  ANTI_SNIPER_SCHEDULE, BUYBACK_DEFAULTS, CASHBACK_MIN_PAYOUT_SOL, CURVE_FEE_BPS, DAMM_V2_POOL_FEE_BPS, DAMM_V2_PROTOCOL_SHARE, LP_REBATE_BPS,
  LP_REBATE_MIN_PAYOUT_SOL, MAINNET_THRESHOLD_SOL, METEORA_MIGRATION_LIQUIDITY_SHARE, METEORA_PROTOCOL_SHARE, REFERRAL_DEFAULTS, REFERRAL_PARAM,
  REFERRAL_SHARE_OF_PROTOCOL, SPLIT_BPS, SUPPLY_ON_MIGRATION_PCT, TIERS, TRADER_CASHBACK_BPS, curveFeeSplit, lpFeeSplit, migrationMcapSol,
  postMigrationSplit, scheduleDurationSeconds, scheduleEndFeeBps, scheduledFeeBps, type TierId,
} from "@hb/shared";
import { Bullets, Code, CodeBlock, DocLink, DocSection, DocTable, DocsHero, DocsPage, Note, Steps, SubHead } from "@/components/docs/Docs";

export const metadata: Metadata = {
  title: "Docs | highbar",
  description: "How highbar works: launch tiers and fees, the bonding curve and DAMM v2 migration, anti-sniper fee, Dev Lock, creator fees, cashback, buyback and burn, and referrals.",
  alternates: { canonical: "/docs" },
};

// Every number below comes from code: packages/shared (tiers, fees, schedules, payouts) and packages/onchain createConfigs.ts
// (token supply, decimals, authority). Nothing is typed in by hand except the token facts createConfigs.ts sets
// (web does not depend on @hb/onchain), and those are noted where they are used.
/** createConfigs.ts buildCurve token.totalTokenSupply */
const TOTAL_SUPPLY = 1_000_000_000;
/** createConfigs.ts buildCurve token.tokenBaseDecimal (TokenDecimal.SIX) */
const TOKEN_DECIMALS = 6;
/** apps/api launchTx.ts DEV_BUY_MAX_SOL (the launch quote also caps it at the tier target) */
const DEV_BUY_MAX_SOL = 20;

const IDS = Object.keys(TIERS) as TierId[];
const num = (v: number, d = 3) => v.toLocaleString("en-US", { maximumFractionDigits: d });
/** bps -> "0.496%" (always a leading zero). */
const bpsPct = (bps: number, d = 3) => `${num(bps / 100, d)}%`;
const share = (frac: number) => `${num(frac * 100)}%`;
const sol = (v: number) => `${num(v, 3)} SOL`;
const curve = (id: TierId) => curveFeeSplit(TIERS[id]);
const post = (id: TierId) => postMigrationSplit(TIERS[id]);
const migFeeSol = (id: TierId) => (MAINNET_THRESHOLD_SOL[id] * TIERS[id].migrationFeePercentage) / 100;
const S = ANTI_SNIPER_SCHEDULE;
const DECAY_S = scheduleDurationSeconds(S);
const referralOfVolumeBps = CURVE_FEE_BPS * METEORA_PROTOCOL_SHARE * REFERRAL_SHARE_OF_PROTOCOL;

const TOC = [
  { id: "what-is-highbar", label: "What highbar is" },
  { id: "launch", label: "Launch a token" },
  { id: "bonding-curve", label: "Bonding curve and migration" },
  { id: "anti-sniper", label: "Anti-sniper fee" },
  { id: "dev-lock", label: "Dev Lock" },
  { id: "creator-fees", label: "Claim creator fees" },
  { id: "lp-rebate", label: "Creator LP rebate" },
  { id: "cashback", label: "Trader cashback" },
  { id: "buyback", label: "Buyback and burn" },
  { id: "referrals", label: "Referrals" },
  { id: "token-supply", label: "Token supply" },
  { id: "faq", label: "FAQ" },
];

export default function DocsPageRoute() {
  return (
    <DocsPage toc={TOC} hero={
      <DocsHero eyebrow="Documentation" title="How highbar works">
        Everything about launching, trading and earning on highbar, in plain words. Every number on this page is read from the same code the app and the on-chain configs use. Building something? See the <DocLink href="/docs/api">public API</DocLink>.
      </DocsHero>
    }>
      <DocSection id="what-is-highbar" eyebrow="Overview" title="What highbar is">
        <p>highbar is a Solana token launchpad in the spirit of pump.fun, with one big difference: the creator picks how high the bar is. Each token starts on a Meteora Dynamic Bonding Curve (DBC) and, once it raises its target, graduates into a Meteora DAMM v2 pool with permanently locked liquidity.</p>
        <p>A higher target means deeper liquidity at migration and a bigger cut of trading fees for the creator. There is no custom token contract. Every launch uses one of six fixed Meteora DBC configs: three tiers, each with the anti-sniper fee on or off.</p>
        <Bullets items={[
          <>Three tiers: {IDS.map((id) => TIERS[id].label).join(", ")}.</>,
          <>A {bpsPct(CURVE_FEE_BPS)} trading fee on the curve, shared by the creator, the platform and Meteora.</>,
          <>Optional Dev Lock for the creator&apos;s own tokens, with a public countdown.</>,
          <>Cashback for traders, a buyback and burn of $HIGHER, and a referral program.</>,
        ]} />
      </DocSection>

      <DocSection id="launch" eyebrow="Creators" title="Launch a token">
        <Steps items={[
          <>Open <DocLink href="/launch">Launch</DocLink> and connect your wallet.</>,
          <>Add a name (up to 32 bytes), a ticker (up to 10 bytes), an image and optional links.</>,
          <>Pick a tier: Standard, Higher or Max. The tier sets the migration target and how fees are shared.</>,
          <>Choose whether the anti-sniper fee is on. It is off by default, so turn it on if you want early bots to pay more.</>,
          <>Optionally add a dev buy of up to {sol(DEV_BUY_MAX_SOL)}. It goes into the same transaction that creates the pool, so you buy first.</>,
          <>Sign the transaction in your wallet. Your token is live the moment it confirms.</>,
        ]} />
        <SubHead>Tiers and fees</SubHead>
        <p>Every trade on the curve pays a {bpsPct(CURVE_FEE_BPS)} fee. Meteora keeps {share(METEORA_PROTOCOL_SHARE)} of it ({bpsPct(curve("standard").protocol)} of the trade) and the rest is split between the creator and the platform by tier.</p>
        <DocTable caption="Tiers and fees" head={["Tier", "Migrates at", "Creator on the curve", "Platform on the curve", "Meteora", "Migration fee", "Creator share of it"]}
          rows={IDS.map((id) => [
            TIERS[id].label, sol(MAINNET_THRESHOLD_SOL[id]), bpsPct(curve(id).creator), bpsPct(curve(id).platform), bpsPct(curve(id).protocol),
            `${TIERS[id].migrationFeePercentage}%${migFeeSol(id) > 0 ? ` (${sol(migFeeSol(id))})` : ""}`, `${TIERS[id].creatorMigrationFeePercentage}%`,
          ])} />
        <p>Fees on the curve are shown as a share of each trade. Higher is stored on-chain as {TIERS.higher.creatorTradingFeePercentage}% of the non Meteora fee because the program only accepts whole numbers, which gives the creator {bpsPct(curve("higher").creator)} of every trade. The migration fee is taken from the SOL raised when the token graduates. On Higher, half of it goes to the creator, which is {sol(migFeeSol("higher") * TIERS.higher.creatorMigrationFeePercentage / 100)}.</p>
        <Note>Traders never pay an extra app fee on top of the {bpsPct(CURVE_FEE_BPS)} curve fee. The ticker HIGHER is reserved for the official token.</Note>
      </DocSection>

      <DocSection id="bonding-curve" eyebrow="Trading" title="Bonding curve and migration">
        <p>Every token trades on its own Meteora bonding curve, priced in SOL. Each buy pushes the price up the curve and each sell moves it back down. The progress bar on a token shows how much SOL the curve holds compared to its tier target.</p>
        <p>When the curve reaches the target, it graduates: the pool migrates to a Meteora DAMM v2 pool. The SOL raised, minus the migration fee, goes into the new pool together with {SUPPLY_ON_MIGRATION_PCT}% of the token supply. Meteora keeps a fixed {share(METEORA_MIGRATION_LIQUIDITY_SHARE)} of the migrated liquidity.</p>
        <DocTable caption="Migration targets" head={["Tier", "Migration target", "Approx. market cap at migration", "Locked LP to creator", "Locked LP to platform"]}
          rows={IDS.map((id) => [TIERS[id].label, sol(MAINNET_THRESHOLD_SOL[id]), sol(migrationMcapSol(id, "mainnet")), `${TIERS[id].lpCreatorPercentage}%`, `${TIERS[id].lpPlatformPercentage}%`])} />
        <p>The liquidity in the DAMM v2 pool is locked forever. It is split into two permanent positions, one for the creator and one for the platform, in the shares above. Nobody can pull it.</p>
        <SubHead>After migration</SubHead>
        <p>The DAMM v2 pool charges a {bpsPct(DAMM_V2_POOL_FEE_BPS)} fee on every trade. Meteora keeps {share(DAMM_V2_PROTOCOL_SHARE)} of it ({bpsPct(lpFeeSplit(TIERS.standard).protocol)} of the trade) and the remaining {bpsPct(lpFeeSplit(TIERS.standard).lp)} goes to the locked LP positions. With the <DocLink href="#lp-rebate">creator LP rebate</DocLink>, creators end up with {IDS.map((id) => `${bpsPct(post(id).creator)} on ${TIERS[id].label}`).join(", ")} of post migration volume.</p>
      </DocSection>

      <DocSection id="anti-sniper" eyebrow="Fair launch" title="Anti-sniper fee">
        <p>Bots like to buy in the first seconds of a launch. When the anti-sniper fee is on, the trading fee starts high and falls quickly, so early sniping is expensive and normal trading is not affected.</p>
        <Bullets items={[
          <>Start fee: {bpsPct(S.cliffFeeBps)} of the trade, the moment the pool goes live.</>,
          <>Decay: exponential, over {S.numberOfPeriod} steps of {S.periodFrequency} second each. Every second the fee drops by {bpsPct(S.reductionFactor, 2)} of its current value.</>,
          <>End fee: about {bpsPct(scheduleEndFeeBps(S), 2)} after {DECAY_S} seconds, the normal curve fee from then on.</>,
          <>The creator&apos;s dev buy in the launch transaction pays the normal minimum fee, not the anti-sniper fee.</>,
          <>With anti-sniper off, the fee is a flat {bpsPct(CURVE_FEE_BPS)} from the first trade.</>,
        ]} />
        <DocTable caption="Anti-sniper fee over time" head={["Seconds after launch", ...[0, 10, 20, 30, 45, 60].map((s) => `${s}s`)]}
          rows={[["Trading fee", ...[0, 10, 20, 30, 45, 60].map((s) => bpsPct(scheduledFeeBps(S, s), 2))]]} />
        <p>The trade panel on a token shows the live fee while the decay is running.</p>
      </DocSection>

      <DocSection id="dev-lock" eyebrow="Trust" title="Dev Lock">
        <p>Creators can lock their own tokens to show they are in it for the long run. Locks use Jupiter Lock, an on-chain escrow, and they are permanent: nobody, including the creator, can cancel a lock or change who receives the tokens.</p>
        <SubHead>Locking</SubHead>
        <Steps items={[
          <>Open your token and press Dev Lock. Only the wallet that created the token sees the button.</>,
          <>Enter the amount, an unlock date (between one minute and ten years from now) and optional linear vesting after the unlock (up to 3650 days).</>,
          <>Confirm that you understand the lock cannot be undone, then sign. A small protocol tip in SOL is shown before you sign.</>,
        ]} />
        <SubHead>The countdown</SubHead>
        <p>Locked tokens show a Dev locked badge on the token page, in token lists and on the leaderboard, with a live countdown to the unlock date. Every lock also has a public page you can share, and all locks are listed on <DocLink href="/locks">Locks</DocLink>.</p>
        <SubHead>Claiming unlocked tokens</SubHead>
        <p>Once the unlock date passes, open the token and use Claim unlocked. With vesting, tokens release step by step after the unlock date and you can claim whatever has released so far. Until then, the button shows how long is left.</p>
      </DocSection>

      <DocSection id="creator-fees" eyebrow="Creators" title="Claim creator fees">
        <p>Your share of trading fees builds up on-chain, in the pool itself. You claim it yourself, whenever you like, from <DocLink href="/portfolio?tab=claim">Portfolio, Claim fees</DocLink>.</p>
        <Steps items={[
          <>Connect the wallet you launched with.</>,
          <>Sign a short message to prove it is your wallet. This is free and sends no transaction.</>,
          <>Review what is claimable per token, then claim one token or all of them. Each claim is a transaction you sign.</>,
        ]} />
        <Bullets items={[
          <>Trading fees from the bonding curve, paid out in SOL.</>,
          <>Your share of the migration fee, once the token has graduated (Higher tier only).</>,
          <>LP fees from your locked DAMM v2 position after migration. These follow the position NFT, so whoever holds it can claim.</>,
        ]} />
      </DocSection>

      <DocSection id="lp-rebate" eyebrow="Creators" title="Creator LP rebate">
        <p>After migration, the platform shares most of its own LP fees with the creator. Each time the platform claims the fees on its locked DAMM v2 position, it forwards a fixed part of that SOL to the token&apos;s creator. The on-chain pool and the LP split do not change. The rebate is paid on top.</p>
        <DocTable caption="Creator LP rebate" head={["Tier", "Rebate of platform LP fees", "Creator LP share", "Creator total", "Platform", "Meteora"]}
          rows={IDS.map((id) => [TIERS[id].label, bpsPct(LP_REBATE_BPS[id], 2), bpsPct(post(id).creatorLp), bpsPct(post(id).creator), bpsPct(post(id).platform), bpsPct(post(id).protocol)])} />
        <p>Shares are of post migration volume. The rebate goes to the token&apos;s creator wallet automatically, with nothing to sign. Payouts start at {sol(LP_REBATE_MIN_PAYOUT_SOL)}. Smaller amounts carry over to the next payout. You can see every rebate and its transaction on <DocLink href="/portfolio?tab=claim">Claim fees</DocLink>.</p>
      </DocSection>

      <DocSection id="cashback" eyebrow="Traders" title="Trader cashback in $HIGHER">
        <p>Trades you make through highbar earn {bpsPct(TRADER_CASHBACK_BPS, 2)} of their volume back. The platform pays it from its own share, so it never touches creators or other traders.</p>
        <Bullets items={[
          <>Cashback is tallied per UTC day.</>,
          <>It is paid in $HIGHER once $HIGHER launches. Until then it is paid in SOL.</>,
          <>Payouts start at {sol(CASHBACK_MIN_PAYOUT_SOL)}. Smaller balances carry over to the next day.</>,
          <>Holding $HIGHER can raise your cashback. The holder tiers are still being finalised and are shown on <DocLink href="/rewards?tab=bar">$HIGHER perks</DocLink>.</>,
          <>Only trades made on highbar count. Every payout links its transaction on <DocLink href="/rewards?tab=cashback">Cashback</DocLink>.</>,
        ]} />
      </DocSection>

      <DocSection id="buyback" eyebrow="$HIGHER" title="Buyback and burn">
        <p>After the creator LP rebate and trader cashback, the platform&apos;s net income is split three ways.</p>
        <DocTable caption="Platform income split" head={["Buyback and burn", "Operations", "Treasury"]}
          rows={[[bpsPct(SPLIT_BPS.buyback, 0), bpsPct(SPLIT_BPS.ops, 0), bpsPct(SPLIT_BPS.treasury, 0)]]} />
        <p>The buyback share buys $HIGHER on the open market and burns every token it buys, on-chain. Orders are kept small to limit price impact: by default at most {sol(BUYBACK_DEFAULTS.maxOrderSol)} per order, at most {bpsPct(BUYBACK_DEFAULTS.maxSlippageBps)} slippage and {bpsPct(BUYBACK_DEFAULTS.maxPriceImpactBps)} price impact, and up to {BUYBACK_DEFAULTS.maxOrdersPerRun} orders per run.</p>
        <p>Until $HIGHER launches, the buyback share accrues and is spent once trading starts. Every buy and burn is listed with its transaction on <DocLink href="/rewards?tab=burn">Burn</DocLink>.</p>
      </DocSection>

      <DocSection id="referrals" eyebrow="Growth" title="Referrals">
        <p>Share your link and earn from the trades of the wallets you bring in. Your link is the site address with your wallet in it:</p>
        <CodeBlock wrap>{`https://highbar.capital/?${REFERRAL_PARAM}=<your wallet address>`}</CodeBlock>
        <Bullets items={[
          <>The first referral link a visitor opens is remembered. When they sign in with their wallet, they are tied to you for good.</>,
          <>Rewards come only from the referral fee Meteora pays highbar on curve trades: {share(REFERRAL_SHARE_OF_PROTOCOL)} of Meteora&apos;s protocol fee, about {bpsPct(referralOfVolumeBps, 2)} of volume. Nothing comes from creators, traders or the platform&apos;s share.</>,
          <>Each UTC day, {REFERRAL_DEFAULTS.rewardBps >= 10_000 ? "all of the" : `${bpsPct(REFERRAL_DEFAULTS.rewardBps, 2)} of the`} referral income your referred wallets generated is shared out by trading volume, never more than was actually received.</>,
          <>Paid in SOL once you reach {sol(REFERRAL_DEFAULTS.minPayoutSol)}. Find your link on <DocLink href="/rewards?tab=referral">Referral</DocLink>.</>,
        ]} />
      </DocSection>

      <DocSection id="token-supply" eyebrow="Tokenomics" title="Token supply">
        <p>Every token launched on highbar is created by the same on-chain config, so they all share these facts.</p>
        <DocTable caption="Token facts" head={["Property", "Value"]} rows={[
          ["Total supply", TOTAL_SUPPLY.toLocaleString("en-US")],
          ["Decimals", String(TOKEN_DECIMALS)],
          ["Mint authority", "Off. No new tokens can ever be minted"],
          ["Metadata", "Immutable"],
          ["Supply into the DAMM v2 pool at migration", `${SUPPLY_ON_MIGRATION_PCT}%`],
          ["Token standard", "SPL Token"],
        ]} />
        <p>There is no team allocation and no presale. The supply is shared between the bonding curve and the {SUPPLY_ON_MIGRATION_PCT}% that goes into the DAMM v2 pool at migration, with nothing left over. Creators get tokens only by buying them, like everyone else.</p>
      </DocSection>

      <DocSection id="faq" eyebrow="Questions" title="FAQ">
        {[
          ["Do I pay anything extra to trade on highbar?", <>No. You only pay the pool&apos;s trading fee. highbar adds nothing on top, and trades made here earn cashback.</>],
          ["Which tier should I pick?", <>Standard migrates at {sol(MAINNET_THRESHOLD_SOL.standard)}. Higher and Max set a higher bar, give the creator a bigger share of fees and leave deeper liquidity after migration.</>],
          ["Can a creator rug the liquidity?", <>No. After migration the LP is permanently locked on Meteora DAMM v2. Creators can only claim the fees it earns.</>],
          ["Can a Dev Lock be cancelled early?", <>No. Locks are permanent. Nobody can cancel them or change the recipient.</>],
          ["When is cashback paid?", <>Once a day, per UTC day, after the day closes. Small balances roll over until they reach the minimum payout.</>],
          ["Is $HIGHER live?", <>Not yet. Until it launches, cashback is paid in SOL and the buyback share accrues. The $HIGHER perks tab shows the current status.</>],
          ["Where can I check the numbers myself?", <>Every payout, buyback and burn links its Solana transaction. The <DocLink href="/docs/api">public API</DocLink> serves the same data the app shows.</>],
        ].map(([q, a], i) => (
          <details key={i} className="group rounded-md border border-border px-4 py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-medium text-ink [&::-webkit-details-marker]:hidden">
              {q}<Plus aria-hidden size={16} strokeWidth={1.5} className="shrink-0 text-ink-3 transition-transform group-open:rotate-45" />
            </summary>
            <p className="mt-2">{a}</p>
          </details>
        ))}
        <p>Still curious? Read the <DocLink href="/settings?tab=about">About</DocLink> page or the <DocLink href="/docs/api">API docs</DocLink>.</p>
      </DocSection>
    </DocsPage>
  );
}
