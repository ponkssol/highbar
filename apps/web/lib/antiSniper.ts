"use client";
import { useEffect, useState } from "react";
import { PublicKey, type Connection } from "@solana/web3.js";
import { ANTI_SNIPER_SCHEDULE, SECONDS_PER_SLOT, antiSniperElapsed, scheduleDurationSeconds, scheduledFeeBps, scheduleEndFeeBps } from "@hb/shared";

/** Meteora DBC program (owner of every virtual pool account). */
const DBC_PROGRAM = "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN";
/** Byte offset of VirtualPool.activation_point (u64 LE): 8 disc + 64 volatility tracker + 5x32 keys + 6x8 reserves/fees + 16 sqrt_price.
 *  Checked against the DBC SDK's decoded activationPoint on a mainnet pool. */
const ACTIVATION_POINT_OFFSET = 296;

export type LaunchSource = "onchain" | "api" | "none";

/** Pool activation time in unix seconds from the DBC pool account, or null when it can't be read. */
async function onchainLaunchSec(connection: Connection, pool: string): Promise<number | null> {
  const acc = await connection.getAccountInfo(new PublicKey(pool));
  if (!acc || acc.owner.toBase58() !== DBC_PROGRAM || acc.data.length < ACTIVATION_POINT_OFFSET + 8) return null;
  const d = acc.data;
  const point = Number(new DataView(d.buffer, d.byteOffset, d.byteLength).getBigUint64(ACTIVATION_POINT_OFFSET, true));
  if (!(point > 0)) return null;
  if (ANTI_SNIPER_SCHEDULE.activationType === "timestamp") return point;
  // Slot-activated schedule: turn the slot distance into seconds at ~0.4 s/slot (approximate).
  const slot = await connection.getSlot();
  return Date.now() / 1000 - Math.max(0, slot - point) * SECONDS_PER_SLOT;
}

/**
 * Live anti-sniper fee for a token, timed from the pool's real activation point (on-chain), falling back to the
 * API launch timestamp (createdAt, ms). elapsed = clamp(now - launch, 0, duration); the fee follows the deployed
 * DBC scheduler (ANTI_SNIPER_SCHEDULE). `active` is false before mount, when the decay is over, or without a launch time.
 */
export function useAntiSniper({ enabled, pool, createdAtMs, connection }: { enabled: boolean; pool?: string | null; createdAtMs?: number | null; connection: Connection }) {
  const duration = scheduleDurationSeconds(ANTI_SNIPER_SCHEDULE);
  const apiSec = createdAtMs && createdAtMs > 0 ? createdAtMs / 1000 : null;
  const [chainSec, setChainSec] = useState<number | null>(null);
  const [nowSec, setNowSec] = useState<number | null>(null); // null until mounted: no SSR / hydration guess

  // The API time is never earlier than the real launch (it is the init tx block time, or when the indexer first saw the pool),
  // so when it already says the decay is over, it is over: skip the RPC read.
  const maybeLive = enabled && (apiSec == null || Date.now() / 1000 - apiSec < duration);
  useEffect(() => {
    setChainSec(null);
    if (!maybeLive || !pool) return;
    let alive = true;
    onchainLaunchSec(connection, pool).then((s) => { if (alive && s != null) setChainSec(s); }).catch(() => {});
    return () => { alive = false; };
  }, [maybeLive, pool, connection]);

  const launchSec = chainSec ?? apiSec;
  const source: LaunchSource = chainSec != null ? "onchain" : apiSec != null ? "api" : "none";
  const done = nowSec != null && launchSec != null && nowSec - launchSec >= duration;
  useEffect(() => {
    if (!enabled) return;
    setNowSec(Date.now() / 1000);
    if (done) return; // stop ticking once the decay is over
    const id = setInterval(() => setNowSec(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, [enabled, done]);

  const elapsed = nowSec != null && launchSec != null ? antiSniperElapsed(nowSec, launchSec) : duration;
  const active = enabled && nowSec != null && launchSec != null && elapsed < duration;
  return {
    active, elapsed, duration, source,
    remaining: Math.max(0, Math.ceil(duration - elapsed)),
    feeBps: scheduledFeeBps(ANTI_SNIPER_SCHEDULE, elapsed),
    startFeeBps: ANTI_SNIPER_SCHEDULE.cliffFeeBps,
    endFeeBps: scheduleEndFeeBps(ANTI_SNIPER_SCHEDULE),
  };
}
