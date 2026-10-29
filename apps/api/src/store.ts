import fs from "node:fs";
import path from "node:path";

export interface Token {
  mint: string; pool: string; config: string; tier: "standard" | "higher" | "max"; antiSniper: boolean;
  creator: string; createdAt: number; quoteReserveSol: number; thresholdSol: number; progress: number;
  isMigrated: boolean; priceSol: number; mcapSol: number; name: string; symbol: string; uri: string;
  volumeSol: number; volume24hSol: number; trades: number; creatorFeesSol: number; feesSol: number; updatedAt: number;
}
export interface TradeRow { sig: string; pool: string; mint: string; side: "buy" | "sell"; sol: number; tokens: number; feeSol: number; wallet: string; viaUi: boolean; ts: number; /** first buy inside the pool-creation tx (Block 0) */ devBuy?: boolean }
export type ActivityType = "launch" | "burn" | "graduate" | "trade";
export interface Activity { id: string; type: ActivityType; mint: string; symbol: string; ts: number; amount?: number; side?: "buy" | "sell"; wallet?: string; sig?: string }
interface Db { tokens: Record<string, Token>; trades: Record<string, TradeRow>; lastSig: Record<string, string>; activity: Activity[]; burns: Activity[]; /** Jupiter Lock escrows per mint (built via /tx/lock or found on-chain) */ locks?: Record<string, string[]>; /** confirmed lock records (escrow -> summary), written by /tx/lock/confirm and the locks indexer */ lockMeta?: Record<string, LockMeta> }
export interface LockMeta { mint: string; creator: string; cliffTime: number; endTime: number; total: string; locked: string; cancelled: boolean; seenAt: number }

const file = path.resolve(process.env.DATA_FILE ?? "./data/db.json");
const db: Db = { tokens: {}, trades: {}, lastSig: {}, activity: [], burns: [] };
try { Object.assign(db, JSON.parse(fs.readFileSync(file, "utf8"))); } catch {}

let dirty = false;
export const store = {
  db,
  markDirty() { dirty = true; },
  upsertToken(t: Token) { db.tokens[t.mint] = t; dirty = true; },
  addTrade(t: TradeRow) { if (db.trades[t.sig]) return false; db.trades[t.sig] = t; dirty = true; return true; },
  addActivity(a: Activity) {
    if (db.activity.some((x) => x.id === a.id)) return;
    db.activity.push(a); if (db.activity.length > 5000) db.activity.splice(0, db.activity.length - 5000); dirty = true;
  },
  tokens: () => Object.values(db.tokens),
  tradesFor: (mint: string) => Object.values(db.trades).filter((t) => t.mint === mint).sort((a, b) => b.ts - a.ts),
  allTrades: () => Object.values(db.trades),
  flush() {
    if (!dirty) return;
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file + ".tmp", JSON.stringify(db));
    fs.renameSync(file + ".tmp", file);
    dirty = false;
  },
};