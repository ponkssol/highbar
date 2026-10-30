import { ImageResponse } from "next/og";
import { apiHeaders } from "@/lib/api";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Token on highbar";

type T = { mint: string; name: string; symbol: string; mcapUsd: number; progress: number; isMigrated: boolean; image: string | null };
export default async function OgImage({ params }: { params: Promise<{ mint: string }> }) {
  const { mint } = await params;
  const API = process.env.API_URL || "http://localhost:4000";
  let t: T | null = null, logo: string | null = null;
  try { const r = await fetch(`${API}/tokens/${mint}`, { headers: apiHeaders(), signal: AbortSignal.timeout(4000) }); if (r.ok) t = await r.json(); } catch {}
  if (t?.image) {
    try {
      const r = await fetch(`${API}/img/${t.mint}`, { headers: apiHeaders(), signal: AbortSignal.timeout(4000) });
      const type = r.headers.get("content-type") ?? "";
      if (r.ok && /^image\/(png|jpeg|gif)$/.test(type)) logo = `data:${type};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
    } catch {}
  }
  const mcap = t ? `$${t.mcapUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "-";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#F6F3EC", color: "#111111", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>highbar</div>
        <div style={{ display: "flex", flexDirection: "column", background: "#FFFFFF", border: "1px solid #E4DFD3", borderRadius: 24, padding: 48 }}>
          <div style={{ display: "flex", alignItems: "center", fontSize: 64, fontWeight: 700 }}>{logo && <img src={logo} width={88} height={88} style={{ borderRadius: 20, marginRight: 24, objectFit: "cover" }} />}{t ? `${t.name} ($${t.symbol})` : "Token not found"}</div>
          {t && <div style={{ display: "flex", fontSize: 36, marginTop: 20, color: "#55524A" }}>{`Market cap ${mcap} - ${t.isMigrated ? "Migrated" : `${Math.round(t.progress * 100)}% bonded`}`}</div>}
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#55524A" }}>Trade on highbar</div>
      </div>
    ),
    size,
  );
}
