import type { Metadata } from "next";
import { Code, CodeBlock, DocLink, DocSection, DocsHero, DocsPage, Note } from "@/components/docs/Docs";

export const metadata: Metadata = {
  title: "API docs | highbar",
  description: "The highbar public read API: tokens, trades, candles, locks, leaderboards, rewards and creator fees.",
  alternates: { canonical: "/docs/api" },
};

/** Public base: the web app's same-origin proxy (app/hb-api/[...path]/route.ts forwards GET and POST to the server-only API_URL).
 *  Media URLs from the API are built the same way (apps/api media.ts: SITE_URL + "/hb-api/..."). */
const BASE = "https://highbar.capital/hb-api";

type Param = { name: string; where: "path" | "query"; info: string };
type Endpoint = { path: string; desc: string; params?: Param[]; example: string; signedNote?: string };
type Group = { id: string; title: string; intro?: string; items: Endpoint[] };

const MINT = "H8b6hZJyqe1VKTfa8qg5KRhV5kTBQ1gDBkR1S79uhigh";
const W = "EAJC7XzXatieEiaU3or7BQBmXC7kZRu7vskAiuDHzzzz";
const tokenFields = `"mint": "${MINT}",
  "pool": "7WqhU2asg6kQKj8pgaWdPSRhVGK1oL6NJNdMUsKGFBD4",
  "config": "49ZrJxJUqCzovYNGchxMvAivqDPgXY2ThiQai4T1P82y",
  "tier": "standard",
  "antiSniper": true,
  "creator": "${W}",
  "createdAt": 1793370798000,
  "name": "Example",
  "symbol": "EXMPL",
  "uri": "${BASE}/meta/c72b221770a7003baf6b7e04.json",
  "image": "${BASE}/img/${MINT}",
  "quoteReserveSol": 12.5,
  "thresholdSol": 85,
  "progress": 0.147,
  "isMigrated": false,
  "priceSol": 0.000000031,
  "mcapSol": 31.2,
  "mcapUsd": 5460,
  "volumeSol": 48.1,
  "volume24hSol": 9.7,
  "trades": 312,
  "creatorFeesSol": 0.19,
  "feesSol": 0.48,
  "devLocked": true,
  "unlockAt": 1801000000,
  "official": false,
  "score": 71,
  "scoreLabel": "Solid",
  "updatedAt": 1793371000000`;

const limit = (min: number, max: number, def: number): Param => ({ name: "limit", where: "query", info: `${min} to ${max}, default ${def}` });
const mintP: Param = { name: "mint", where: "path", info: "token mint address" };
const walletP = (name = "wallet"): Param => ({ name, where: "path", info: "Solana wallet address" });

const GROUPS: Group[] = [
  { id: "tokens", title: "Tokens and market", items: [
    { path: "/health", desc: "Liveness check with the number of indexed tokens.", example: `{ "ok": true, "tokens": 1240, "dryRun": false, "time": 1793378454406 }` },
    { path: "/stats", desc: "Platform totals for the home page: launches, graduations, volume, fees and burns.", example: `{
  "totalTokens": 1240, "graduated": 38, "graduatedPct": 3.1,
  "launches7d": [{ "date": "2026-10-24", "day": "Sat", "tokens": 41, "graduated": 2 }],
  "launches30d": 412,
  "totalVolumeSol": 18250.4, "volume7dSol": 3120.9, "volumeDelta": 0.12,
  "creatorFeesSol": 91.3, "creatorDelta": 0.08,
  "platformFeesSol": 70.2,
  "platformSplitSol": { "buyback": 28.1, "ops": 35.1, "treasury": 7 },
  "barBurned": 0, "burnDelta": 0, "barLaunched": false,
  "activeTraders24h": 210,
  "updatedAt": 1793378454406
}` },
    { path: "/tokens", desc: "List tokens with filters, search and sorting.", params: [
      limit(0, 200, 50), { name: "offset", where: "query", info: "rows to skip, default 0" },
      { name: "tier", where: "query", info: "standard, higher or max" },
      { name: "status", where: "query", info: "bonding or graduated" },
      { name: "q", where: "query", info: "search by name, symbol or mint, up to 64 characters" },
      { name: "sort", where: "query", info: "createdAt, mcapSol, mcapUsd, priceSol, progress, volumeSol, volume24hSol, trades, quoteReserveSol, feesSol, name, symbol or updatedAt" },
      { name: "order", where: "query", info: "asc or desc" },
    ], example: `{
  "total": 1240,
  "items": [{
  ${tokenFields}
  }]
}` },
    { path: "/tokens/:mint", desc: "One token with its social links. Returns 404 when the mint is unknown.", params: [mintP], example: `{
  ${tokenFields},
  "links": { "website": "https://example.com", "twitter": "https://x.com/example", "telegram": null }
}` },
    { path: "/tokens/:mint/trades", desc: "Latest trades for a token, newest first.", params: [mintP, limit(1, 500, 100)], example: `[{
  "sig": "5h3Q...signature", "pool": "7WqhU2...", "mint": "${MINT}",
  "side": "buy", "sol": 0.5, "tokens": 15820000, "feeSol": 0.005,
  "wallet": "${W}", "viaUi": true, "ts": 1793371000000, "devBuy": false
}]` },
    { path: "/tokens/:mint/candles", desc: "OHLCV candles in SOL and USD. Default 500 buckets, at most 5000 per request.", params: [mintP,
      { name: "tf", where: "query", info: "1m, 5m, 15m, 1h, 4h or 1d, default 1m" },
      { name: "from", where: "query", info: "start time in ms" }, { name: "to", where: "query", info: "end time in ms" },
    ], example: `{
  "mint": "${MINT}", "tf": "5m", "from": 1793300000000, "to": 1793378400000,
  "solUsd": 175, "solUsdSource": "jupiter",
  "candles": [{
    "t": 1793378100000, "o": 0.000000029, "h": 0.000000032, "l": 0.000000028, "c": 0.000000031,
    "v": 42000000, "vSol": 1.3, "n": 12,
    "oUsd": 0.0000051, "hUsd": 0.0000056, "lUsd": 0.0000049, "cUsd": 0.0000054, "vUsd": 227.5
  }]
}` },
    { path: "/tokens/:mint/score", desc: "The token's health score and how it was built.", params: [mintP], example: `{ "mint": "${MINT}", "score": 71, "label": "Solid", "breakdown": { "holders": 18, "liquidity": 20 }, "max": 100, "updatedAt": 1793371000000 }` },
    { path: "/tokens/:mint/holders", desc: "Top holders with their share of supply. The creator wallet is flagged.", params: [mintP, limit(1, 200, 50)], example: `{
  "mint": "${MINT}", "source": "curve trades",
  "items": [{ "wallet": "${W}", "balance": 25000000, "pct": 2.5, "creator": true }]
}` },
    { path: "/activity", desc: "Live feed of launches, trades, graduations and burns.", params: [{ name: "since", where: "query", info: "only events after this time in ms" }, limit(1, 500, 200)], example: `[{
  "id": "trade:5h3Q...", "type": "trade", "mint": "${MINT}", "symbol": "EXMPL",
  "ts": 1793371000000, "amount": 0.5, "side": "buy", "wallet": "${W}", "sig": "5h3Q..."
}]` },
    { path: "/official-token", desc: "Status of the official $HIGHER token.", example: `{ "mint": null, "source": null, "symbol": "HIGHER", "creator": null, "pool": null, "launchedAt": null, "launched": false, "verified": false }` },
  ] },
  { id: "launch-quote", title: "Launch quote", intro: "A read only preview. Building and sending the launch itself is a signed request and is not part of the public API.", items: [
    { path: "/tx/launch/quote", desc: "Estimate what a dev buy gets at launch, including the fee and the cap.", params: [
      { name: "tier", where: "query", info: "standard, higher or max" },
      { name: "antiSniper", where: "query", info: "true or false" },
      { name: "devBuySol", where: "query", info: "SOL to spend on the dev buy" },
      { name: "slippageBps", where: "query", info: "slippage in bps" },
    ], example: `{ "devBuySol": 1, "estTokens": 34500000, "minTokens": 34155000, "supplyPct": 3.45, "feeSol": 0.01, "feePct": 1, "minFeeApplied": true, "thresholdSol": 85, "maxDevBuySol": 20 }` },
  ] },
  { id: "leaderboards", title: "Leaderboards", items: [
    { path: "/leaderboard/:kind", desc: "Ranked lists as a JSON array. Token kinds share the token basics (mint, name, symbol, tier, mcapUsd, progress, isMigrated, score, devLocked, unlockAt, official) and add their own fields.", params: [
      { name: "kind", where: "path", info: "tokens, creators, traders, scores, migrations or survivors" },
      { name: "window", where: "query", info: "24h, 7d, week or all" },
      { name: "week", where: "query", info: "a past week as YYYY-MM-DD" },
      limit(1, 200, 50),
    ], example: `// kind=creators
[{ "creator": "${W}", "tokens": 4, "graduated": 1, "volumeSol": 812.4, "feesEarnedSol": 3.2, "avgScore": 64 }]

// kind=traders
[{ "wallet": "${W}", "volumeSol": 140.2, "trades": 37, "buys": 20, "sells": 17, "lastTs": 1793371000000 }]

// kind=tokens (also: scores, migrations, survivors)
[{ "mint": "${MINT}", "name": "Example", "symbol": "EXMPL", "tier": "standard", "mcapUsd": 5460, "progress": 0.147,
   "isMigrated": false, "score": 71, "devLocked": true, "unlockAt": 1801000000, "official": false,
   "volumeSol": 48.1, "trades": 312, "volume24hSol": 9.7 }]` },
  ] },
  { id: "wallets", title: "Wallets", items: [
    { path: "/wallet/:address/trades", desc: "Recent trades by a wallet across all tokens, up to 200.", params: [walletP("address")], example: `[{ "sig": "5h3Q...", "mint": "${MINT}", "symbol": "EXMPL", "side": "sell", "sol": 1.2, "tokens": 30000000, "feeSol": 0.012, "wallet": "${W}", "viaUi": true, "ts": 1793371000000 }]` },
    { path: "/wallet/:address/created", desc: "Tokens launched by a wallet, in the same shape as /tokens items.", params: [walletP("address")], example: `[{ "mint": "${MINT}", "name": "Example", "symbol": "EXMPL", "tier": "standard", "mcapUsd": 5460, "isMigrated": false }]` },
  ] },
  { id: "locks", title: "Dev Locks", items: [
    { path: "/tokens/:mint/locks", desc: "Jupiter Lock escrows for one token, with totals.", params: [mintP, { name: "fresh", where: "query", info: "1 to skip the cache" }], example: `{
  "programId": "LocpQgucEQHbqNABEYvBvwoxCPsSbG91A1QaQhQQqjn", "tipSol": 0.005,
  "locks": [{
    "escrow": "9xk2...", "mint": "${MINT}", "recipient": "${W}", "creator": "${W}",
    "cancelMode": 0, "updateRecipientMode": 0,
    "cliffTime": 1801000000, "frequency": 86400, "numberOfPeriod": 30, "vestingStartTime": 1801000000, "endTime": 1803592000,
    "total": "50000000000000", "claimed": "0", "unlocked": "0", "claimable": "0", "locked": "50000000000000", "cancelled": false
  }],
  "totalTokens": 50000000, "lockedTokens": 50000000, "claimableTokens": 0
}` },
    { path: "/locks", desc: "All locks, newest first, with token details.", params: [{ name: "page", where: "query", info: "page number, default 1" }, limit(1, 100, 15)], example: `{
  "total": 64, "page": 1, "limit": 15, "tipSol": 0.005,
  "items": [{
    "id": "9xk2...", "escrow": "9xk2...", "mint": "${MINT}",
    "totalTokens": 50000000, "lockedTokens": 50000000, "claimableTokens": 0,
    "supplyPct": 5, "unlockedPct": 0, "status": "locked", "lockedAt": 1793371000000,
    "token": { "name": "Example", "symbol": "EXMPL", "tier": "standard", "creator": "${W}", "image": "${BASE}/img/${MINT}" }
  }]
}` },
    { path: "/locks/:id", desc: "A single lock in the same shape as a /locks item.", params: [{ name: "id", where: "path", info: "lock escrow address" }], example: `{ "id": "9xk2...", "status": "vesting", "supplyPct": 5, "unlockedPct": 40, "token": { "symbol": "EXMPL" } }` },
  ] },
  { id: "rewards", title: "Rewards", items: [
    { path: "/cashback/:wallet", desc: "A trader's cashback: accrued, paid and pending, with a daily ledger.", params: [walletP()], example: `{
  "wallet": "${W}", "network": "mainnet", "bps": 5, "live": true, "closedThrough": "2026-10-29",
  "volumeSol": 120.5, "accruedSol": 0.06, "paidSol": 0.05, "unpaidSol": 0.01, "pendingSol": 0.004, "minPayoutSol": 0.001,
  "trades": 48, "otherTrades": 3,
  "ledger": [{ "period": "2026-10-29", "trades": 6, "volumeSol": 14.2, "amountSol": 0.0071, "paidSig": "3Fq...", "paidAt": 1793320000000, "pending": false, "paidUrl": "https://solscan.io/tx/3Fq..." }]
}` },
    { path: "/referrals/:wallet", desc: "A referrer's stats, earnings ledger and referred wallets.", params: [walletP()], example: `{
  "wallet": "${W}", "network": "mainnet", "param": "ref", "rewardBps": 10000, "minPayoutSol": 0.001,
  "live": true, "closedThrough": "2026-10-29", "referredBy": null, "referees": 3,
  "referredVolumeSol": 210, "earnedSol": 0.08, "paidSol": 0.07, "unpaidSol": 0.01, "pendingSol": 0.002,
  "ledger": [{ "period": "2026-10-29", "referees": 2, "trades": 9, "volumeSol": 31, "referralFeeSol": 0.0124, "amountSol": 0.0124, "paidSig": null, "paidAt": null, "pending": true, "paidUrl": null }],
  "items": [{ "wallet": "7pQ...", "joinedAt": 1793000000000, "trades": 22, "volumeSol": 140 }]
}` },
    { path: "/buybacks", desc: "Buyback orders with their buy and burn transactions.", params: [limit(1, 200, 50), { name: "offset", where: "query", info: "rows to skip" }], example: `{
  "network": "mainnet", "barMint": null, "barMintUrl": null, "mode": "accrue",
  "totals": { "orders": 0, "solSpent": 0, "barBurned": 0 }, "limit": 50, "offset": 0,
  "items": [{ "id": 1, "period": "2026-10-29", "mode": "live", "barMint": "...", "solSpent": 1, "barBought": 820000, "buySig": "2a...", "burnSig": "4b...", "status": "burned", "error": null, "ts": 1793320000000, "buyUrl": "https://solscan.io/tx/2a...", "burnUrl": "https://solscan.io/tx/4b..." }]
}` },
    { path: "/burn", desc: "The public buyback and burn record: totals, the income split and recent runs.", example: `{
  "network": "mainnet", "barMint": null, "barLaunched": false, "barMintUrl": null, "mode": "accrue", "dryRun": false, "estimated": true,
  "barBurned": 0, "burnOrders": 0, "solSpent": 0,
  "platformFeesSol": 70.2, "unsplitFeesSol": 0.4, "creatorRebateSol": 2.1, "cashbackSol": 0.9,
  "split": { "buyback": 26.7, "ops": 33.4, "treasury": 6.7 },
  "pendingBuybackSol": 26.7, "maxOrderSol": 1, "maxSlippageBps": 100,
  "runs": [{ "id": 1, "ts": 1793320000000, "period": "2026-10-29", "mode": "accrue", "status": "accrued", "sol": 0.8, "amount": 0, "sig": null, "buySig": null, "burnSig": null, "buyUrl": null, "burnUrl": null }]
}` },
    { path: "/bar", desc: "$HIGHER holder program settings: tiers, cashback base and limits.", example: `{
  "network": "mainnet", "barMint": null, "barMintUrl": null, "enabled": false, "symbol": "HIGHER", "launched": false, "officialSource": null,
  "tiers": [{ "id": "base", "minBar": 0, "cashbackMultiplier": 1 }],
  "baseCashbackBps": 5, "maxTierMinBar": 0, "gateMaxTier": false,
  "feeShareBps": 2000, "opsSplitBps": 5000, "feeShareLive": false, "limits": []
}` },
    { path: "/bar/:wallet", desc: "A wallet's $HIGHER balance, holder tier and fee share status.", params: [walletP()], example: `{ "wallet": "${W}", "network": "mainnet", "enabled": false, "balance": 0, "tier": { "id": "base" }, "next": null, "maxTierAccess": false, "ledger": [] }` },
    { path: "/milestones", desc: "Creator milestone bonuses for graduated tokens.", params: [{ name: "creator", where: "query", info: "filter by creator wallet" }, { name: "limit", where: "query", info: "number of tokens" }], example: `{
  "network": "mainnet", "dryRun": false, "milestones": [{ "id": "hold-1k-7d", "mcapSol": 1000, "days": 7, "bonusSol": 1 }], "minSamplesPerDay": 12, "today": "2026-10-30",
  "tokens": [{ "mint": "${MINT}", "name": "Example", "symbol": "EXMPL", "creator": "${W}", "migratedAt": 1793000000000, "dammPool": "Bq...", "mcapSol": 1210, "sampledAt": 1793370000000, "progress": [] }],
  "bonuses": [], "totals": { "paidSol": 0, "unpaidSol": 0 }
}` },
    { path: "/milestones/:mint", desc: "Milestone progress for one token.", params: [mintP], example: `{ "mint": "${MINT}", "migrated": true, "migratedAt": 1793000000000, "dammPool": "Bq...", "mcapSol": 1210, "sampledAt": 1793370000000, "milestones": [], "minSamplesPerDay": 12, "progress": [], "days": [], "bonuses": [] }` },
  ] },
  { id: "creator-fees", title: "Creator fees", intro: "Read only views of what a creator can claim. Claiming itself is a signed request and is not part of the public API.", items: [
    { path: "/claim/:creator", desc: "Claimable fees per token: curve trading fees, the migration fee share and DAMM v2 LP fees.", params: [walletP("creator")], example: `{
  "creator": "${W}",
  "tokens": [{
    "mint": "${MINT}", "pool": "7WqhU2...", "name": "Example", "symbol": "EXMPL", "tier": "higher", "image": "${BASE}/img/${MINT}",
    "migrated": false, "tradingFeeSol": 0.42, "tradingFeeToken": 0,
    "migrationFeeSharePct": 50, "migrationFeeSol": 0, "migrationFeeEstimateSol": 0.75, "migrationFeeWithdrawn": false,
    "lp": null, "lpFeeSol": 0, "lpFeeToken": 0, "error": null
  }],
  "totalSol": 0.42, "totalTradingSol": 0.42, "totalMigrationSol": 0, "totalLpSol": 0, "updatedAt": 1793371000000
}` },
    { path: "/claim/:creator/rebates", desc: "Creator LP rebates: paid and pending, with each payout.", params: [walletP("creator")], example: `{
  "creator": "${W}",
  "rebateBps": { "standard": 6875, "higher": 6875, "max": 7500 }, "minPayoutSol": 0.01, "pendingSol": 0.004, "paidSol": 0.31,
  "rows": [{
    "claimSig": "6Rt...", "pool": "Bq...", "mint": "${MINT}", "symbol": "EXMPL", "name": "Example", "tier": "higher",
    "claimedSol": 0.18, "rebateBps": 6875, "rebateSol": 0.124, "period": "2026-10-29",
    "paidSig": "8Kp...", "paidAt": 1793320000000, "pending": false, "skipReason": null, "createdAt": 1793310000000,
    "claimUrl": "https://solscan.io/tx/6Rt...", "paidUrl": "https://solscan.io/tx/8Kp..."
  }]
}` },
  ] },
  { id: "media", title: "Media", items: [
    { path: "/img/:mint", desc: "The token image. Returns image bytes, not JSON.", params: [mintP], example: `HTTP/1.1 200 OK\ncontent-type: image/png` },
    { path: "/meta/:file", desc: "Token metadata JSON, the file a token's uri points to.", params: [{ name: "file", where: "path", info: "metadata id ending in .json" }], example: `{ "name": "Example", "symbol": "EXMPL", "description": "An example token", "image": "${BASE}/media/c72b221770a7003baf6b7e04.png" }` },
    { path: "/media/:file", desc: "Uploaded token media files.", params: [{ name: "file", where: "path", info: "media file name" }], example: `HTTP/1.1 200 OK\ncontent-type: image/png` },
  ] },
];

const TOC = [{ id: "overview", label: "Overview" }, ...GROUPS.map((g) => ({ id: g.id, label: g.title })), { id: "not-covered", label: "Not covered" }];

function EndpointCard({ e }: { e: Endpoint }) {
  return (
    <article className="rounded-md border border-border p-4" aria-label={`GET ${e.path}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-[5px] border border-gold-line bg-gold-soft px-1.5 py-px font-mono text-[11px] font-semibold tracking-wide text-gold-text">GET</span>
        <code className="break-all font-mono text-[13.5px] font-medium text-ink">{e.path}</code>
      </div>
      <p className="mt-2">{e.desc}</p>
      {e.params && (
        <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-[13px] sm:grid-cols-[minmax(110px,auto)_1fr]">
          {e.params.map((p) => (
            <div key={p.name} className="contents">
              <dt className="font-mono text-ink">{p.name}<span className="ml-1.5 text-[11px] text-ink-3">{p.where}</span></dt>
              <dd className="text-ink-2">{p.info}</dd>
            </div>
          ))}
        </dl>
      )}
      <div className="mt-3"><CodeBlock label="Example response">{e.example}</CodeBlock></div>
    </article>
  );
}

export default function ApiDocsPage() {
  return (
    <DocsPage toc={TOC} hero={
      <DocsHero eyebrow="Developers" title="highbar public API">
        Read only JSON endpoints for everything the app shows: tokens, trades, candles, locks, leaderboards and rewards. No key needed. Looking for how the platform works? Read the <DocLink href="/docs">docs</DocLink>.
      </DocsHero>
    }>
      <DocSection id="overview" eyebrow="Start here" title="Overview">
        <p>All endpoints on this page are plain <Code>GET</Code> requests that return JSON, unless noted. Use this base URL:</p>
        <CodeBlock label="Base URL">{BASE}</CodeBlock>
        <CodeBlock label="Example">{`curl "${BASE}/tokens?limit=5&sort=volume24hSol&order=desc"`}</CodeBlock>
        <p>SOL amounts are numbers in SOL and times are Unix milliseconds, unless a field says otherwise. Lock fields in raw token units are strings. Addresses in the path are checked, and an invalid one returns <Code>400</Code> with an <Code>error</Code> message. An unknown token returns <Code>404</Code>.</p>
        <Note>Requests are rate limited per IP. Please cache what you can and poll gently. The example values on this page are made up to show the shape of each response.</Note>
      </DocSection>
      {GROUPS.map((g) => (
        <DocSection key={g.id} id={g.id} eyebrow="Endpoints" title={g.title}>
          {g.intro && <p>{g.intro}</p>}
          <div className="flex flex-col gap-3">{g.items.map((e) => <EndpointCard key={e.path} e={e} />)}</div>
        </DocSection>
      ))}
      <DocSection id="not-covered" eyebrow="Scope" title="Not covered">
        <p>Anything that builds a transaction, needs a wallet signature or a sign in token, or is meant for operators is left out on purpose. That includes swaps, launches, locks, claims, metadata uploads, referral binding, sign in and admin tools. The app uses these for you when you sign in your wallet.</p>
      </DocSection>
    </DocsPage>
  );
}
