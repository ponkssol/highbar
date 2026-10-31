/** Test launches left out of every public token listing (API lists, search, hot coins, leaderboards, activity feed,
 *  Open Book per-token table, web sitemap). Their DB rows, trades, fee claims and Open Book history are kept, platform
 *  totals still include them (real on-chain volume and fees), and the direct token page keeps working (noindex).
 *  QUCKSOL, COINY, MINECAT, TESTLA. */
export const HIDDEN_TOKEN_MINTS: readonly string[] = [
  "6eREHTBRYzqBVm3BX4NJFom9z1n7TdKkcfEnzhw4high",
  "EXA3yCkvSUf7KHHdcb6P5LZ29k1JoXvA8sF1ob3whigh",
  "AVCQDHkXj4GA69xrySrmaoJqMW6oTs8SU3QCyRFFhigh",
  "H8b6hZJyqe1VKTfa8qg5KRhV5kTBQ1gDBkR1S79uhigh",
];

const ADDR = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Comma / whitespace separated mint list (the server-side HIDDEN_TOKEN_MINTS env var); anything that is not a base58 address is dropped. */
export function parseMintList(v: string | null | undefined): string[] {
  if (!v) return [];
  return [...new Set(v.split(/[\s,]+/).map((s) => s.trim()).filter((s) => ADDR.test(s)))];
}

/** Built-in list merged with an optional extra list (pass process.env.HIDDEN_TOKEN_MINTS server-side; never a browser-exposed public var). */
export function hiddenMintSet(extra?: string | null): Set<string> {
  return new Set([...HIDDEN_TOKEN_MINTS, ...parseMintList(extra)]);
}

/** Rows whose mint is not hidden. */
export function withoutHidden<T extends { mint: string }>(rows: readonly T[], hidden: ReadonlySet<string>): T[] {
  return hidden.size ? rows.filter((r) => !hidden.has(r.mint)) : [...rows];
}
