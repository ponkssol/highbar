"use client";
import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { TierId } from "@hb/shared";

/** Token list view state (sort + filters), kept in the URL query so it is shareable and survives reloads.
 *  Other query params (e.g. ?ref=) are preserved. Defaults are omitted from the URL. */
export type SortId = "new" | "mcap" | "volume" | "progress" | "near";
export type StatusId = "all" | "bonding" | "almost" | "graduated";
export const SORTS: { id: SortId; label: string }[] = [
  { id: "new", label: "Newest" },
  { id: "mcap", label: "Market cap" },
  { id: "volume", label: "Volume 24h" },
  { id: "progress", label: "Curve progress" },
  { id: "near", label: "Near migration" },
];
export const TIER_IDS: TierId[] = ["standard", "higher", "max"];
export interface ListQuery { sort: SortId; tiers: TierId[]; status: StatusId; locked: boolean }

const STATUS_IDS: StatusId[] = ["all", "bonding", "almost", "graduated"];
export function parseListQuery(sp: URLSearchParams | null): ListQuery {
  const sort = (SORTS.find((s) => s.id === sp?.get("sort"))?.id ?? "new") as SortId;
  const tiers = (sp?.get("tier") ?? "").split(",").filter((t): t is TierId => (TIER_IDS as string[]).includes(t));
  const st = sp?.get("status") as StatusId | null;
  return { sort, tiers, status: st && STATUS_IDS.includes(st) ? st : "all", locked: sp?.get("locked") === "1" };
}
export const activeFilterCount = (q: ListQuery) => (q.tiers.length ? 1 : 0) + (q.status !== "all" ? 1 : 0) + (q.locked ? 1 : 0);

export function useListQuery(): [ListQuery, (patch: Partial<ListQuery>) => void] {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const q = useMemo(() => parseListQuery(sp), [sp]);
  const set = useCallback((patch: Partial<ListQuery>) => {
    const n = { ...q, ...patch };
    const p = new URLSearchParams(sp?.toString() ?? "");
    const put = (k: string, v: string | null) => (v ? p.set(k, v) : p.delete(k));
    put("sort", n.sort === "new" ? null : n.sort);
    put("tier", n.tiers.length ? TIER_IDS.filter((t) => n.tiers.includes(t)).join(",") : null);
    put("status", n.status === "all" ? null : n.status);
    put("locked", n.locked ? "1" : null);
    const s = p.toString();
    router.replace(s ? `${path}?${s}` : path, { scroll: false });
  }, [q, sp, router, path]);
  return [q, set];
}
