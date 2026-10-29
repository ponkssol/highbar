import fs from "node:fs";
import path from "node:path";

export interface TradePoint { mint: string; sig: string; ixIdx: number; ts: number; priceSol: number; amount: number; side: "buy" | "sell"; /** SOL volume (optional, derived from priceSol*amount when absent) */ sol?: number }

/** JSON-file trade store for candles. Dedupe on sig+ixIdx, atomic writes (tmp + rename), debounced flush. */
export class TradeStore {
  private byMint = new Map<string, TradePoint[]>();
  private keys = new Set<string>();
  private dirty = false;
  private timer: NodeJS.Timeout | null = null;
  constructor(readonly file: string, private flushMs = 2000) {
    try {
      const rows = JSON.parse(fs.readFileSync(file, "utf8")) as TradePoint[];
      for (const r of rows) this.insert(r);
    } catch { /* new store */ }
    this.dirty = false;
  }
  private insert(p: TradePoint) {
    const k = `${p.sig}:${p.ixIdx}`;
    if (this.keys.has(k)) return false;
    if (!(p.priceSol > 0) || !Number.isFinite(p.ts)) return false;
    this.keys.add(k);
    const arr = this.byMint.get(p.mint) ?? [];
    // keep sorted by ts (append is the common case)
    if (!arr.length || arr[arr.length - 1].ts <= p.ts) arr.push(p);
    else { let i = arr.length; while (i > 0 && arr[i - 1].ts > p.ts) i--; arr.splice(i, 0, p); }
    this.byMint.set(p.mint, arr);
    return true;
  }
  add(p: TradePoint) {
    const ok = this.insert(p);
    if (ok) { this.dirty = true; this.schedule(); }
    return ok;
  }
  trades(mint: string) { return this.byMint.get(mint) ?? []; }
  get size() { return this.keys.size; }
  private schedule() {
    if (this.timer || this.flushMs < 0) return;
    this.timer = setTimeout(() => { this.timer = null; this.flush(); }, this.flushMs);
    this.timer.unref?.();
  }
  flush() {
    if (!this.dirty) return;
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    const tmp = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify([...this.byMint.values()].flat()));
    fs.renameSync(tmp, this.file);
    this.dirty = false;
  }
}

export const tradeStore = new TradeStore(path.resolve(process.env.TRADES_FILE ?? "./data/trades.json"));
process.on("exit", () => { try { tradeStore.flush(); } catch { /* ignore */ } });