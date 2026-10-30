/** Plain-text copy of the /docs FAQ (app/docs/page.tsx shows the same sentences with links) for FAQPage JSON-LD and /llms-full.txt. */
import { MAINNET_THRESHOLD_SOL } from "@hb/shared";

const sol = (v: number) => `${v.toLocaleString("en-US", { maximumFractionDigits: 3 })} SOL`;
export const FAQ_TEXT: [string, string][] = [
  ["Do I pay anything extra to trade on highbar?", "No. You only pay the pool's trading fee. highbar adds nothing on top, and trades made here earn cashback."],
  ["Which tier should I pick?", `Standard migrates at ${sol(MAINNET_THRESHOLD_SOL.standard)}. Higher and Max set a higher bar, give the creator a bigger share of fees and leave deeper liquidity after migration.`],
  ["Can a creator rug the liquidity?", "No. After migration the LP is permanently locked on Meteora DAMM v2. Creators can only claim the fees it earns."],
  ["Can a Dev Lock be cancelled early?", "No. Locks are permanent. Nobody can cancel them or change the recipient."],
  ["When is cashback paid?", "Once a day, per UTC day, after the day closes. Small balances roll over until they reach the minimum payout."],
  ["Is $HIGHER live?", "Not yet. Until it launches, cashback is paid in SOL and the buyback share accrues. The $HIGHER perks tab shows the current status."],
  ["Where can I check the numbers myself?", "Every payout, buyback and burn links its Solana transaction. The public API serves the same data the app shows."],
];
