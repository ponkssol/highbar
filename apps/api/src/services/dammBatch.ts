/** Pure helpers for the scores job's DAMM v2 reads (scoreJob.ts; tests in dammBatch.test.ts). */

/** getMultipleAccounts takes at most 100 keys per call. */
export const GMA_MAX = 100;

/** Fetch `keys` in chunks of `size` (one RPC call each); the result is aligned with `keys` (null = account missing). */
export async function batchFetch<K, V>(keys: K[], getMany: (chunk: K[]) => Promise<(V | null)[]>, size = GMA_MAX): Promise<(V | null)[]> {
  const out: (V | null)[] = [];
  for (let i = 0; i < keys.length; i += size) {
    const chunk = keys.slice(i, i + size);
    const got = await getMany(chunk);
    for (let j = 0; j < chunk.length; j++) out.push(got[j] ?? null);
  }
  return out;
}

/** Which graduated tokens need a DAMM v2 read in this run.
 *  Hourly price snapshot: every graduated token, once per hour bucket (first run in the hour).
 *  Any run: a graduated token without a known DAMM pool yet (fresh migration), so the pool address (Open Book
 *  "migrating" -> "migrated") and its first price land within one scores interval, not up to an hour later. */
export function planDammReads(graduated: { mint: string; dammPool: string | null }[], bucket: number, lastPriced: number | null): { mints: string[]; hourly: boolean } {
  const hourly = lastPriced !== bucket;
  return { hourly, mints: graduated.filter((g) => hourly || !g.dammPool).map((g) => g.mint) };
}
