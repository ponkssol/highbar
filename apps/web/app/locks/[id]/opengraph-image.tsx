import { ImageResponse } from "next/og";
import { fetchLock, fmtLockDate } from "@/lib/lockData";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dev token lock on highbar";

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const l = await fetchLock(id);
  const sym = l?.token?.symbol || "TOKEN";
  const name = l?.token?.name || "Dev token lock";
  let logo: string | null = null;
  if (l?.token?.image) {
    try {
      const r = await fetch(`${process.env.API_URL || "http://localhost:4000"}/img/${l.mint}`, { signal: AbortSignal.timeout(4000) });
      const type = r.headers.get("content-type") ?? "";
      if (r.ok && /^image\/(png|jpeg|gif)$/.test(type)) logo = `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    } catch {}
  }
  const amount = l ? l.totalTokens.toLocaleString("en-US", { maximumFractionDigits: 0 }) : "-";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#F6F3EC", color: "#111111", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>highbar</div>
          <div style={{ display: "flex", border: "2px solid #111111", borderRadius: 999, padding: "8px 22px", fontSize: 26 }}>Dev tokens locked</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #E4DFD3", borderRadius: 24, padding: 48 }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 40, color: "#55524A" }}>{logo && <img src={logo} width={64} height={64} style={{ borderRadius: 16, marginRight: 20, objectFit: "cover" }} />}{name} (${sym})</div>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, marginTop: 8 }}>{amount} ${sym}</div>
          <div style={{ display: "flex", fontSize: 36, marginTop: 16, color: "#55524A" }}>
            {l ? `${l.supplyPct.toFixed(2)}% of supply - unlocks ${fmtLockDate(l.cliffTime)}${l.numberOfPeriod > 0 ? `, vests until ${fmtLockDate(l.endTime)}` : ""}` : "Lock not found"}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#55524A" }}>Permanent lock via Jupiter Lock - cannot be cancelled</div>
      </div>
    ),
    size,
  );
}