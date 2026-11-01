/** Trading terminal links for a launched token (Solana mint). Icons ship inside the extension (static/terminals), never loaded
 *  from the terminals' sites at runtime. URL patterns as the terminals document or publish them:
 *  GMGN gmgn.ai/sol/token/<mint>, Axiom axiom.trade/meme/<address>?chain=sol, Padre trade.padre.gg/trade/solana/<mint>.
 *  Trojan and Based Bot are Telegram bots whose documented token deep links need a referral code
 *  (t.me/solana_trojanbot?start=r-<ref>-<mint>, t.me/based_eth_bot?start=r_<ref>_b_<mint>). There is no referral code here, so
 *  those open the bot and the drawer copies the CA first, to paste in the chat. */
export type TerminalId = "highbar" | "gmgn" | "axiom" | "trojan" | "padre" | "basebot";
export interface TerminalLink { id: TerminalId; name: string; url: string; icon: string; copyCa: boolean; title: string }

const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export const isMint = (s: unknown): s is string => typeof s === "string" && B58.test(s);

export function terminalLinks(mint: string, tokenUrl?: string | null): TerminalLink[] {
  if (!isMint(mint)) return [];
  const m = encodeURIComponent(mint);
  const site = tokenUrl && /^https:\/\//.test(tokenUrl) ? tokenUrl : `https://highbar.capital/token/${m}`;
  return [
    { id: "highbar", name: "highbar", url: site, icon: "icons/icon-32.png", copyCa: false, title: "Token page on highbar" },
    { id: "gmgn", name: "GMGN", url: `https://gmgn.ai/sol/token/${m}`, icon: "terminals/gmgn.png", copyCa: false, title: "Open on GMGN" },
    { id: "axiom", name: "Axiom", url: `https://axiom.trade/meme/${m}?chain=sol`, icon: "terminals/axiom.png", copyCa: false, title: "Open on Axiom" },
    { id: "trojan", name: "Trojan", url: "https://t.me/solana_trojanbot", icon: "terminals/trojan.png", copyCa: true, title: "Open Trojan on Telegram, the CA is copied to paste in the chat" },
    { id: "padre", name: "Padre", url: `https://trade.padre.gg/trade/solana/${m}`, icon: "terminals/padre.png", copyCa: false, title: "Open on Padre" },
    { id: "basebot", name: "BaseBot", url: "https://t.me/based_eth_bot", icon: "terminals/basebot.png", copyCa: true, title: "Open BaseBot on Telegram, the CA is copied to paste in the chat" },
  ];
}
