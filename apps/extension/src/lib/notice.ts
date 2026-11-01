/** The drawer footer shows at most ONE short notice, inline in the summary row: the most important problem wins and the
 *  full detail goes into its hover title. Pure, so the choice and the dedupe are unit tested. */
import { fmtSol } from "./format";
import { isShort } from "./multi";

export interface Notice { text: string; title: string; blocking: boolean }
export interface NoticeWallet { label: string; sol: number | null | undefined; needsMigration?: boolean }

export const notice = (text: string, title = text, blocking = true): Notice => ({ text, title, blocking });

/** The wallet side: a pending update, then SOL. One wallet short: "Need ~0.53 SOL in Wallet 1". Several checked: "2 wallets
 *  short of SOL" (none can launch, blocking) or "1 of 3 short of SOL, skipped" (the rest launch). Null when all is fine. */
export function walletNotice(ws: NoticeWallet[], need: number): Notice | null {
  const pend = ws.find((w) => w.needsMigration);
  if (pend) return notice(`Finish the update of ${pend.label} first`, `Finish the update of ${pend.label} in the side panel first, or uncheck it`);
  const low = ws.filter((w) => isShort(w.sol, need));
  if (!low.length) return null;
  const need$ = fmtSol(need), bal = (w: NoticeWallet) => `${w.label} has ${fmtSol(w.sol ?? 0)} SOL`;
  const detail = `${low.map(bal).join(", ")}. Each launch needs about ${need$} SOL (dev buy, fees and rent).`;
  if (ws.length === 1) return notice(`Need ~${fmtSol(Math.ceil(need * 100) / 100)} SOL in ${low[0].label}`, `${detail} Top it up first.`);
  const all = low.length === ws.length;
  return all ? notice(`${low.length} wallets short of SOL`, `${detail} Top one up or lower the dev buy.`)
    : notice(`${low.length} of ${ws.length} short of SOL, skipped`, `${detail} ${low.length === 1 ? "It is" : "They are"} skipped, the others launch.`, false);
}

/** The first notice that is set, by priority (form problems before wallets). Returns one or none, never a stack. Notices
 *  with the same text count once. */
export function pickNotice(...list: (Notice | null | undefined | false)[]): Notice | null {
  return (list.find((n): n is Notice => !!n && !!n.text.trim()) ?? null);
}
