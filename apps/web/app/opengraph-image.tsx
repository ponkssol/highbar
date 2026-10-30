import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "highbar: launch tokens on Solana";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 64, background: "#F6F3EC", color: "#111111", fontFamily: "sans-serif" }}>
        <div style={{ display: "flex", fontSize: 30, fontWeight: 700 }}>highbar</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 110, fontWeight: 700, letterSpacing: -3 }}>highbar</div>
          <div style={{ display: "flex", fontSize: 40, color: "#55524A", marginTop: 12 }}>Launch tokens on Solana. Fair curves, dev buy in block 0, optional dev lock.</div>
        </div>
        <div style={{ display: "flex", fontSize: 24, color: "#55524A" }}>$HIGHER</div>
      </div>
    ),
    size,
  );
}
