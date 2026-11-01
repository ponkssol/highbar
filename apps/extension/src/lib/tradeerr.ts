/** What a CA popup trade error says to the user: short, and never the route or venue (Jupiter, pump.fun AMM, DBC, DAMM...).
 *  The full message stays in Settings > Diagnostics (last trade). */
const VENUE = /jupiter|\bjup\b|pump\.?fun|pumpswap|\bamm\b|\bdbc\b|damm|meteora|raydium|orca|\broute|\bpool\b|\bswap\b|bonding|curve/i;
export function publicTradeError(msg: string): string {
  const m = String(msg ?? "");
  if (/insufficient (funds|lamports)|not enough sol|need .*sol|0x1\b/i.test(m)) return "Not enough SOL for this trade";
  if (/slippage|0x1771|0x1772|exceeds desired|tolerance|price moved|too little|minimum out/i.test(m)) return "Price moved past your slippage. Try again or raise it";
  if (/holds none|nothing to sell|no balance/i.test(m)) return "This wallet holds none of this token";
  if (/mainnet only/i.test(m)) return "This token trades on mainnet only";
  if (/blockhash|expired|timed? ?out|not confirmed/i.test(m)) return "Not confirmed in time. Check the wallet before retrying";
  if (/no (quote|liquidity)|not tradable|could not find any route|no route/i.test(m)) return "This token can't be traded right now";
  if (!m || VENUE.test(m) || m.length > 90) return "Trade failed. Try again";
  return m;
}
