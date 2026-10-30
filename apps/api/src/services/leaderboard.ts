/** Leaderboard windows and post-migration survival (pure, no I/O). Times in epoch ms, weeks are UTC Monday 00:00. */
export const DAY_MS = 86_400_000;
/** A migrated token "survives" a day while its DAMM v2 mcap stays >= this share of its mcap at migration. */
export const SURVIVAL_MIN_RATIO = Number(process.env.SURVIVAL_MIN_RATIO ?? 0.5);

export function weekStartUtc(ms: number) {
  const d = new Date(ms); d.setUTCHours(0, 0, 0, 0);
  return d.getTime() - ((d.getUTCDay() + 6) % 7) * DAY_MS;
}

/** window = 24h | 7d | week (current UTC week) | all; week=YYYY-MM-DD picks the UTC week containing that date. */
export function windowRange(q: { window?: string; week?: string }, now = Date.now()): { from: number; to: number; label: string } {
  if (q.week && /^\d{4}-\d{2}-\d{2}$/.test(q.week)) {
    const from = weekStartUtc(Date.parse(`${q.week}T00:00:00Z`));
    if (Number.isFinite(from)) return { from, to: from + 7 * DAY_MS, label: `week of ${new Date(from).toISOString().slice(0, 10)}` };
  }
  if (q.window === "24h") return { from: now - DAY_MS, to: Infinity, label: "24h" };
  if (q.window === "7d") return { from: now - 7 * DAY_MS, to: Infinity, label: "7d" };
  if (q.window === "week") { const from = weekStartUtc(now); return { from, to: from + 7 * DAY_MS, label: `week of ${new Date(from).toISOString().slice(0, 10)}` }; }
  return { from: 0, to: Infinity, label: "all" };
}

export interface Snap { ts: number; mcapSol: number }
/** Whole days after migration in which every snapshot held >= ratio x baseMcap, counted until the first breach
 *  (a day with no snapshot ends the streak unless it is today). */
export function survival(snaps: Snap[], migratedAt: number, baseMcapSol: number, now = Date.now(), ratio = SURVIVAL_MIN_RATIO) {
  const after = snaps.filter((s) => s.ts >= migratedAt).sort((a, b) => a.ts - b.ts);
  const latest = after.at(-1) ?? null;
  const floor = baseMcapSol * ratio;
  const days = Math.floor((now - migratedAt) / DAY_MS);
  let streak = 0;
  for (let d = 0; d < days; d++) {
    const inDay = after.filter((s) => s.ts >= migratedAt + d * DAY_MS && s.ts < migratedAt + (d + 1) * DAY_MS);
    if (!inDay.length || inDay.some((s) => s.mcapSol < floor)) break;
    streak++;
  }
  const ratioNow = latest && baseMcapSol > 0 ? latest.mcapSol / baseMcapSol : null;
  return { daysSinceMigration: days, survivedDays: streak, ratioNow, nowMcapSol: latest?.mcapSol ?? null, alive: ratioNow == null ? null : ratioNow >= ratio };
}
