/** mint_pool SQL (migration 0010). Every state change is one guarded statement, so it is safe under PgBouncer transaction
 *  pooling and concurrent API replicas. Status only moves available -> reserved -> (available | used); used is final
 *  (also enforced by a trigger). secret_enc is only ever selected by claimForSigning. */
export type Sql = { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> };

export interface Reservation { mint: string; creator: string; expiresAt: number; signed: boolean; reused?: boolean }
const toRes = (r: any, reused = false): Reservation => ({ mint: r.pubkey, creator: r.reserved_by, expiresAt: new Date(r.reservation_expires_at).getTime(), signed: !!r.signed_at, reused });

export async function insertMint(q: Sql, pubkey: string, secretEnc: string): Promise<boolean> {
  const r = await q.query("INSERT INTO mint_pool (pubkey, secret_enc) VALUES ($1, $2) ON CONFLICT (pubkey) DO NOTHING RETURNING pubkey", [pubkey, secretEnc]);
  return r.rows.length === 1;
}

export async function poolCounts(q: Sql): Promise<{ available: number; reserved: number; used: number }> {
  const r = await q.query("SELECT status, count(*)::int AS n FROM mint_pool GROUP BY status");
  const o = { available: 0, reserved: 0, used: 0 } as Record<string, number>;
  for (const x of r.rows) o[x.status] = Number(x.n);
  return o as { available: number; reserved: number; used: number };
}

/** Atomic hand-out of one available mint (FOR UPDATE SKIP LOCKED: concurrent callers never get the same row). */
export async function reserveFresh(q: Sql, creator: string, minutes: number): Promise<Reservation | null> {
  const r = await q.query(
    `UPDATE mint_pool SET status = 'reserved', reserved_at = now(), reserved_by = $1, signed_at = NULL,
            reservation_expires_at = now() + make_interval(mins => $2::int)
      WHERE pubkey = (SELECT pubkey FROM mint_pool WHERE status = 'available' ORDER BY created_at, pubkey LIMIT 1 FOR UPDATE SKIP LOCKED)
        AND status = 'available'
      RETURNING pubkey, reserved_by, reservation_expires_at, signed_at`, [creator, minutes]);
  return r.rows[0] ? toRes(r.rows[0]) : null;
}

/** The creator's live, never-signed reservation (it cannot be on-chain: creating the mint needs our signature), extended. */
export async function reuseUnsigned(q: Sql, creator: string, minutes: number): Promise<Reservation | null> {
  const r = await q.query(
    `UPDATE mint_pool SET reservation_expires_at = GREATEST(reservation_expires_at, now() + make_interval(mins => $2::int))
      WHERE pubkey = (SELECT pubkey FROM mint_pool WHERE status = 'reserved' AND reserved_by = $1 AND signed_at IS NULL AND reservation_expires_at > now()
                      ORDER BY reserved_at LIMIT 1 FOR UPDATE SKIP LOCKED)
        AND status = 'reserved' AND reserved_by = $1 AND signed_at IS NULL
      RETURNING pubkey, reserved_by, reservation_expires_at, signed_at`, [creator, minutes]);
  return r.rows[0] ? toRes(r.rows[0], true) : null;
}

export async function activeReservations(q: Sql, creator: string): Promise<number> {
  const r = await q.query("SELECT count(*)::int AS n FROM mint_pool WHERE status = 'reserved' AND reserved_by = $1", [creator]);
  return Number(r.rows[0].n);
}

export async function getReservation(q: Sql, pubkey: string): Promise<(Reservation & { status: string; live: boolean }) | null> {
  const r = await q.query("SELECT pubkey, status, reserved_by, reservation_expires_at, signed_at, (reservation_expires_at > now()) AS live FROM mint_pool WHERE pubkey = $1", [pubkey]);
  const x = r.rows[0];
  if (!x) return null;
  return { ...(x.reservation_expires_at ? toRes(x) : { mint: x.pubkey, creator: x.reserved_by, expiresAt: 0, signed: !!x.signed_at }), status: x.status, live: !!x.live };
}

/** Claim the secret for signing: only for a live reservation held by `creator`. Records signed_at and keeps the
 *  reservation at least `holdMinutes` past now (longer than any blockhash lives), so the sweeper can never free a
 *  mint while a signed tx for it could still land. */
export async function claimForSigning(q: Sql, pubkey: string, creator: string, holdMinutes: number): Promise<string | null> {
  const r = await q.query(
    `UPDATE mint_pool SET signed_at = now(), reservation_expires_at = GREATEST(reservation_expires_at, now() + make_interval(mins => $3::int))
      WHERE pubkey = $1 AND status = 'reserved' AND reserved_by = $2 AND reservation_expires_at > now()
      RETURNING secret_enc`, [pubkey, creator, holdMinutes]);
  return r.rows[0]?.secret_enc ?? null;
}

export async function markUsed(q: Sql, pubkey: string): Promise<boolean> {
  const r = await q.query("UPDATE mint_pool SET status = 'used', used_at = now() WHERE pubkey = $1 AND status <> 'used' RETURNING pubkey", [pubkey]);
  return r.rows.length === 1;
}

export async function expiredReservations(q: Sql, limit = 100): Promise<string[]> {
  const r = await q.query("SELECT pubkey FROM mint_pool WHERE status = 'reserved' AND reservation_expires_at <= now() ORDER BY reservation_expires_at LIMIT $1", [limit]);
  return r.rows.map((x) => x.pubkey as string);
}

/** Back to available, only if still reserved and still expired (a concurrent extend / sign wins). */
export async function freeExpired(q: Sql, pubkey: string): Promise<boolean> {
  const r = await q.query(
    `UPDATE mint_pool SET status = 'available', reserved_at = NULL, reserved_by = NULL, reservation_expires_at = NULL, signed_at = NULL
      WHERE pubkey = $1 AND status = 'reserved' AND reservation_expires_at <= now() RETURNING pubkey`, [pubkey]);
  return r.rows.length === 1;
}
