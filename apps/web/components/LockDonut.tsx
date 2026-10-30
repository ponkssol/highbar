/** Tokenomics donut for one Jupiter Lock escrow: this lock (still locked, claimed, unlocked not yet claimed) versus the rest of the supply. Plain SVG, server-renderable. */
import type { LockView } from "@/lib/lockData";

const TOTAL_SUPPLY = 1_000_000_000; // every launch mints 1B tokens (apps/api TOTAL_SUPPLY)
const DECIMALS = 1e6; // 6 decimals, same as TOKEN_DECIMALS in lib/lock.ts (raw u64 strings -> UI amounts)

type Slice = { key: string; label: string; amount: number; color: string };

/** Raw base-unit string -> UI amount, or null when missing or not a number. */
const raw = (s: unknown) => (typeof s === "string" && s.trim() !== "" && Number.isFinite(Number(s)) ? Number(s) / DECIMALS : null);
const ui = (n: unknown) => (typeof n === "number" && Number.isFinite(n) ? n : null);

/** Percent with a leading zero and no trailing zeros: 0.5%, 0.04%, 1.25%, 12.3%, under 0.01% shows as <0.01%. */
export const fmtPct = (v: number) => (v <= 0 ? "0%" : v < 0.01 ? "<0.01%" : `${Number(v.toFixed(v < 10 ? 2 : 1))}%`);

export function lockSlices(l: Partial<LockView>) {
  const total = raw(l.total) ?? ui(l.totalTokens);
  if (total === null || total <= 0) return null;
  const lockedRaw = raw(l.locked) ?? ui(l.lockedTokens);
  const unlockedRaw = raw(l.unlocked) ?? (lockedRaw !== null ? total - lockedRaw : null);
  const unlocked = unlockedRaw === null ? null : Math.min(total, Math.max(0, unlockedRaw));
  const locked = Math.min(total, Math.max(0, lockedRaw ?? (unlocked !== null ? total - unlocked : total)));
  const claimedRaw = raw(l.claimed);
  const claimed = unlocked === null || claimedRaw === null ? null : Math.min(unlocked, Math.max(0, claimedRaw));
  const slices: Slice[] = [{ key: "locked", label: "Locked in this lock", amount: locked, color: "var(--hb-gold)" }];
  if (claimed !== null && unlocked !== null) {
    if (claimed > 0) slices.push({ key: "claimed", label: "Unlocked and claimed", amount: claimed, color: "var(--hb-bronze)" });
    if (unlocked - claimed > 0) slices.push({ key: "claimable", label: "Claimable now", amount: unlocked - claimed, color: "color-mix(in srgb, var(--hb-bronze) 55%, var(--hb-gold))" });
  } else if (unlocked !== null && unlocked > 0) slices.push({ key: "unlocked", label: "Unlocked so far", amount: unlocked, color: "var(--hb-bronze)" });
  const rest = Math.max(0, TOTAL_SUPPLY - total);
  slices.push({ key: "rest", label: "Rest of supply", amount: rest, color: "color-mix(in srgb, var(--hb-silver) 38%, transparent)" });
  return { slices, total, partial: unlocked === null || claimed === null };
}

const R = 42, SW = 13, C = 2 * Math.PI * R, MIN_FRAC = 0.03, GAP = 1.4; // tiny slices get at least 3% of the ring, hairline gaps between slices

export function LockDonut({ lock, symbol, fmt }: { lock: Partial<LockView>; symbol: string; fmt: (n: number) => string }) {
  const data = lockSlices(lock);
  if (!data) {
    return (
      <section aria-label="Lock tokenomics" className="rounded-lg border border-border bg-muted p-4 text-sm text-ink-3">
        <h3 className="text-[13px] font-medium text-ink-2">Tokenomics</h3>
        <p className="mt-1">Lock amounts are not available right now. Try again in a moment.</p>
      </section>
    );
  }
  const { slices, partial } = data;
  const sum = slices.reduce((s, x) => s + x.amount, 0) || 1;
  const visible = slices.filter((s) => s.amount > 0);
  // Visual only: tiny slices get a minimum arc so they stay visible, then the rest is scaled to fit. Legend shows the exact shares.
  const fr = visible.map((s) => Math.max(MIN_FRAC, s.amount / sum));
  const frSum = fr.reduce((a, b) => a + b, 0);
  let offset = 0;
  const arcs = visible.map((s, i) => {
    const len = (fr[i] / frSum) * C;
    const a = { ...s, dash: Math.max(0.001, len - (visible.length > 1 ? GAP : 0)), offset: offset + (visible.length > 1 ? GAP / 2 : 0) };
    offset += len;
    return a;
  });
  const lockedPct = (slices[0].amount / TOTAL_SUPPLY) * 100;
  const summary = slices.map((s) => `${s.label} ${fmt(s.amount)} (${fmtPct((s.amount / TOTAL_SUPPLY) * 100)})`).join(", ");
  return (
    <section aria-labelledby="lock-pie-title" className="rounded-lg border border-border p-4 md:p-5">
      <h3 id="lock-pie-title" className="text-[13px] font-medium text-ink-2">Tokenomics <span className="text-ink-3">of {fmt(TOTAL_SUPPLY)} ${symbol} supply</span></h3>
      <div className="mt-4 flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
        <div className="relative h-40 w-40 shrink-0 md:h-44 md:w-44">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" role="img" aria-label={`Supply split for $${symbol}: ${summary}`}>
            <title>{`Supply split for $${symbol}: ${summary}`}</title>
            <defs><filter id="lock-pie-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.3" /></filter></defs>
            <circle cx="50" cy="50" r={R} fill="none" stroke="var(--hb-border)" strokeWidth={SW + 4} />
            <g filter="url(#lock-pie-soft)">
              {arcs.map((a) => <circle key={a.key} cx="50" cy="50" r={R} fill="none" stroke={a.color} strokeWidth={SW} strokeDasharray={`${a.dash} ${C}`} strokeDashoffset={-a.offset} />)}
            </g>
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" aria-hidden="true">
            <span className="num text-xl font-semibold tracking-tight">{fmtPct(lockedPct)}</span>
            <span className="text-[11px] text-ink-3">still locked</span>
          </div>
        </div>
        <ul className="grid w-full min-w-0 gap-2 text-sm">
          {slices.map((s) => (
            <li key={s.key} className="flex min-w-0 items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
              <span className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.color }} /><span className="text-ink-2">{s.label}</span></span>
              <span className="num shrink-0 text-right">{fmt(s.amount)} <span className="text-ink-3">{fmtPct((s.amount / TOTAL_SUPPLY) * 100)}</span></span>
            </li>
          ))}
          {partial && <li className="text-xs text-ink-3">Unlock and claim details are not available for this lock yet.</li>}
        </ul>
      </div>
    </section>
  );
}
