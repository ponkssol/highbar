import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { fetchLock, fmtLockDate } from "@/lib/lockData";
import { fmtPrice } from "@/lib/format";
import type { ReactNode } from "react";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dev token lock on highbar";

/** Parchment "Token Lock" card. Layout mirrors the approved 1200x630 design: all ink is navy (bronze for the symbol) at about 90% so the paper shows through. */
const NAVY = "31,58,107";
const BRONZE = "rgb(150,112,48)";
const ink = (a = 255) => `rgba(${NAVY},${((a / 255) * 0.9).toFixed(3)})`;
const CX = 592; // optical centre of the empty paper field
const DY = 17; // whole block sits centred between the inner Greek key borders
// Cinzel metrics: ascent 0.976, descent 0.372, cap height 0.7 (em). With lineHeight 1 the baseline sits 0.802 em below the box top.
const BASE = 0.802, CAP = 0.7;
// Cinzel SemiBold advance widths (per 1000 em) for fitting the live values. Unknown glyphs count as 0.72 em.
const ADV: Record<string, number> = {
  A: 715, B: 645, C: 773, D: 821, E: 613, F: 577, G: 824, H: 845, I: 370, J: 364, K: 724, L: 598, M: 946, N: 857, O: 865, P: 630, Q: 867, R: 724, S: 544,
  T: 650, U: 809, V: 732, W: 975, X: 707, Y: 689, Z: 658, "0": 634, "1": 376, "2": 596, "3": 543, "4": 607, "5": 536, "6": 607, "7": 530, "8": 586, "9": 607,
  $: 544, ",": 215, ".": 208, " ": 250,
};
const textWidth = (t: string, px: number, spacing: number) => [...t].reduce((w, c) => w + (ADV[c] ?? 720) * px / 1000, 0) + spacing * Math.max(0, [...t].length - 1);
const fit = (t: string, px: number, maxw: number, spacing: number) => { while (px > 14 && textWidth(t, px, spacing) > maxw) px--; return px; };

type Assets = { bg: string; brand: string; jup: string; fonts: { name: string; data: Buffer; weight: 500 | 600; style: "normal" }[] };
let assets: Promise<Assets> | null = null;
/** Static art and Cinzel live in public/og and are read from disk once per server process (nodejs runtime, `next start` runs in apps/web). */
const loadAssets = () =>
  (assets ??= (async (): Promise<Assets> => {
    const dir = path.join(process.cwd(), "public", "og");
    const read = (f: string) => readFile(path.join(dir, f));
    const uri = async (f: string, type: string) => `data:${type};base64,${(await read(f)).toString("base64")}`;
    const [bg, brand, jup, medium, semibold] = await Promise.all([
      uri("parchment.jpg", "image/jpeg"), uri("brand.png", "image/png"), uri("jupiter-mark.png", "image/png"), read("Cinzel-Medium.ttf"), read("Cinzel-SemiBold.ttf"),
    ]);
    return { bg, brand, jup, fonts: [{ name: "Cinzel", data: medium, weight: 500, style: "normal" }, { name: "Cinzel", data: semibold, weight: 600, style: "normal" }] };
  })().catch((e) => { assets = null; throw e; }));

/** Days between lock and unlock ("365 days"), hours when shorter than a day. */
function fmtDuration(from: number, to: number) {
  const s = Math.max(0, to - from), d = Math.round(s / 86400);
  if (d >= 1) return `${d.toLocaleString("en-US")} ${d === 1 ? "day" : "days"}`;
  const h = Math.max(1, Math.round(s / 3600));
  return `${h} ${h === 1 ? "hour" : "hours"}`;
}

/** One centred line of Cinzel, positioned by its baseline like the design file. */
function Line({ x = CX, y, px, weight = 600, spacing = 0, color = ink(), children }: { x?: number; y: number; px: number; weight?: 500 | 600; spacing?: number; color?: string; children: ReactNode }) {
  return (
    <div style={{ position: "absolute", left: x - 450, top: y + DY - BASE * px, width: 900, display: "flex", justifyContent: "center", fontSize: px, lineHeight: 1, fontWeight: weight, letterSpacing: spacing, paddingLeft: spacing, color, whiteSpace: "nowrap" }}>
      {children}
    </div>
  );
}

/** Cinzel's "$" has a hairline stroke that reads as "S" at this size, so draw S with a clear vertical stroke through it. */
function Dollar({ px, spacing, color }: { px: number; spacing: number; color: string }) {
  const w = (ADV.S * px) / 1000, lw = Math.max(1, px * 0.075), ext = CAP * px * 0.16;
  return (
    <div style={{ display: "flex", position: "relative", width: w, marginRight: spacing }}>
      S
      <div style={{ position: "absolute", left: w / 2 - lw / 2, top: (BASE - CAP) * px - ext, width: lw, height: CAP * px + 2 * ext, background: color }} />
    </div>
  );
}

const Rule = ({ x, y, w, h, a = 255 }: { x: number; y: number; w: number; h: number; a?: number }) => (
  <div style={{ position: "absolute", left: x, top: y + DY, width: w, height: h, background: ink(a) }} />
);

function Padlock({ top }: { top: number }) {
  // Same geometry as the design (scale 0.75): shackle 16.5, body 27 x 21.75, keyhole.
  const k = 0.75, lw = 1.6 * k, sw = 22 * k, bw = 36 * k, bh = 29 * k, r = sw / 2, W = bw + 4, cx = W / 2, by = sw, ky = by + 12 * k, c = ink();
  return (
    <svg width={W} height={by + bh + 2} viewBox={`0 0 ${W} ${by + bh + 2}`} style={{ position: "absolute", left: CX - cx, top: top + DY }}>
      <path d={`M ${cx - r} ${by} L ${cx - r} ${r} A ${r} ${r} 0 0 1 ${cx + r} ${r} L ${cx + r} ${by}`} fill="none" stroke={c} strokeWidth={lw} />
      <rect x={cx - bw / 2 + lw / 2} y={by + lw / 2} width={bw - lw} height={bh - lw} fill="none" stroke={c} strokeWidth={lw} />
      <circle cx={cx} cy={ky} r={3 * k} fill={c} />
      <path d={`M ${cx - 1.5 * k} ${ky} L ${cx + 1.5 * k} ${ky} L ${cx + 3 * k} ${ky + 10 * k} L ${cx - 3 * k} ${ky + 10 * k} Z`} fill={c} />
    </svg>
  );
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [l, a] = await Promise.all([fetchLock(id).catch(() => null), loadAssets().catch(() => null)]);

  const sym = (l?.token?.symbol || "TOKEN").toUpperCase().replace(/^\$/, "");
  const amount = l ? (l.totalTokens >= 1 ? l.totalTokens.toLocaleString("en-US", { maximumFractionDigits: 0 }) : fmtPrice(l.totalTokens)) : "";
  const duration = l ? fmtDuration(l.lockedAt ?? Math.floor(Date.now() / 1000), l.cliffTime).toUpperCase() : "";
  const unlock = l ? `UNLOCKS ${fmtLockDate(l.cliffTime).toUpperCase()}${l.numberOfPeriod > 0 && l.endTime > l.cliffTime ? `, VESTS UNTIL ${fmtLockDate(l.endTime).toUpperCase()}` : ""}` : "";

  const symPx = fit(`$${sym}`, 34, 520, 5), amtPx = fit(amount, 40, 250, 1), durPx = fit(duration, 40, 250, 1);
  const colL = CX - (125 + 22), colR = CX + (125 + 22);
  // Footer: "SECURED BY  <Jupiter mark>  JUPITER LOCK", centred as one group.
  const w1 = textWidth("SECURED BY", 12, 3), w2 = textWidth("JUPITER LOCK", 16, 3), mw = 24, g1 = 14, g2 = 8;
  const fx = CX - (w1 + g1 + mw + g2 + w2) / 2, fy = 520;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#EFE2C6", fontFamily: a ? "Cinzel" : "serif" }}>
        {a && <img src={a.bg} width={1200} height={630} style={{ position: "absolute", left: 0, top: 0 }} />}
        {a && <img src={a.brand} width={144} height={24} style={{ position: "absolute", left: CX - 72, top: 80 - 12 + DY, opacity: 0.9 }} />}

        <Line y={172} px={60} spacing={9}>TOKEN LOCK</Line>
        {l ? (
          <Line y={224} px={symPx} spacing={5} color={BRONZE}><Dollar px={symPx} spacing={5} color={BRONZE} />{sym}</Line>
        ) : (
          <Line y={224} px={30} spacing={5} color={BRONZE}>LOCK NOT FOUND</Line>
        )}
        <Rule x={CX - 150} y={273.5} w={120} h={1} />
        <Rule x={CX + 30} y={273.5} w={120} h={1} />
        <Padlock top={274 - 24} />

        {l ? (
          <>
            <Rule x={CX - 0.5} y={312} w={1} h={72} a={170} />
            <Line x={colL} y={330} px={13} spacing={3} color={ink(195)}>AMOUNT LOCKED</Line>
            <Line x={colR} y={330} px={13} spacing={3} color={ink(195)}>LOCK DURATION</Line>
            <Line x={colL} y={376} px={amtPx} spacing={1}>{amount}</Line>
            <Line x={colR} y={376} px={durPx} spacing={1}>{duration}</Line>
            <Line y={424} px={15} weight={500} spacing={3} color={ink(200)}>{unlock}</Line>
          </>
        ) : (
          <Line y={360} px={18} weight={500} spacing={3} color={ink(200)}>THIS LOCK COULD NOT BE LOADED</Line>
        )}

        <Rule x={CX - 160} y={fy - 42 - 0.5} w={320} h={1} a={90} />
        <Line x={fx + w1 / 2} y={fy} px={12} spacing={3} color={ink(175)}>SECURED BY</Line>
        {a && <img src={a.jup} width={mw} height={22} style={{ position: "absolute", left: fx + w1 + g1, top: fy - 22 + 4 + DY, opacity: 0.9 }} />}
        <Line x={fx + w1 + g1 + mw + g2 + w2 / 2} y={fy} px={16} spacing={3}>JUPITER LOCK</Line>
      </div>
    ),
    { ...size, fonts: a?.fonts },
  );
}