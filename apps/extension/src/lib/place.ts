/** Drawer placement on x.com: next to the button that opened it, always inside the viewport. Pure, so it is unit tested. */
export interface Box { left: number; top: number; right: number; bottom: number }
export interface Pos { left: number; top: number }
export interface Size { w: number; h: number }

export const MARGIN = 12;
const GAP = 8;

/** Keeps a box of this size fully inside the viewport (top-left wins when it is bigger than the viewport). */
export function clampPos(p: Pos, size: Size, vp: Size, m = MARGIN): Pos {
  const left = Math.max(m, Math.min(p.left, vp.w - size.w - m));
  const top = Math.max(m, Math.min(p.top, vp.h - size.h - m));
  return { left: Math.round(left), top: Math.round(top) };
}

/** Above the anchor, right edges lined up. Below when there is no room above. Beside it (left, then right) when neither fits.
 *  No anchor (hotkey with no button on screen): top right. */
export function placeNear(anchor: Box | null, size: Size, vp: Size, m = MARGIN): Pos {
  if (!anchor) return clampPos({ left: vp.w - size.w - m, top: m }, size, vp, m);
  const left = anchor.right - size.w;
  if (anchor.top - GAP - size.h >= m) return clampPos({ left, top: anchor.top - GAP - size.h }, size, vp, m);
  if (anchor.bottom + GAP + size.h <= vp.h - m) return clampPos({ left, top: anchor.bottom + GAP }, size, vp, m);
  const mid = (anchor.top + anchor.bottom) / 2 - size.h / 2;
  const side = anchor.left - GAP - size.w >= m ? anchor.left - GAP - size.w : anchor.right + GAP;
  return clampPos({ left: side, top: mid }, size, vp, m);
}

/** A saved drag position from storage, or null when it is not a usable one. */
export function readPos(v: unknown): Pos | null {
  const o = v as Partial<Pos> | null;
  return o && Number.isFinite(o.left) && Number.isFinite(o.top) ? { left: Math.round(o.left!), top: Math.round(o.top!) } : null;
}

/** Holding panel attached to the drawer as one window. Right of the drawer when both fit in the viewport (the window shifts left
 *  to make room), else on the left at the width that is left over (never under min). The extent is what it adds on each side. */
export function attachLayout(dw: number, vw: number, w = 300, min = 260, m = MARGIN): { side: "right" | "left"; w: number; extL: number; extR: number } {
  if (dw + w + 2 * m <= vw) return { side: "right", w, extL: 0, extR: w };
  const pw = Math.round(Math.max(min, Math.min(w, vw - 2 * m - dw)));
  return { side: "left", w: pw, extL: pw, extR: 0 };
}
