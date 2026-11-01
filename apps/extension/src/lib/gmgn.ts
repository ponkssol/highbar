/** GMGN's official price chart embed (docs.gmgn.ai, "Integrate GMGN price chart": https://www.gmgn.cc/kline/{chain}/{token}).
 *  The embed reads exactly two URL params (checked in its page bundle, applyUrlParams): `theme` ("light" | "dark") and
 *  `interval` ("1S", "1", "5", "15", "60", "240", "720", "1D"). There is no param for toolbars, indicators or volume.
 *  So: theme=dark and the interval are set by param; the three toolbars around the plot (top: interval / chart type /
 *  Indicators / Price-MCap / settings; left: drawing tools; bottom: date ranges / UTC clock / % log auto) are cut by a clipped
 *  box with the frame offset. Nothing inside the plot is touched: the "GMGN.AI" watermark, the legend ("SYM · 1s · GMGN"),
 *  the TradingView logo, the price scale and the time scale all stay visible. */
export const GMGN_INTERVALS = ["1S", "1", "5", "15", "60", "240", "720", "1D"] as const;
export type GmgnInterval = (typeof GMGN_INTERVALS)[number];
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Only a base58 mint is accepted, so the frame cannot be pointed anywhere else. 1S for pump.fun coins, 1 m otherwise. */
export function gmgnUrl(mint: string, interval: GmgnInterval = "1"): string | null {
  if (!B58.test(mint) || !(GMGN_INTERVALS as readonly string[]).includes(interval)) return null;
  return `https://www.gmgn.cc/kline/sol/${mint}?theme=dark&interval=${interval}`;
}

/** The embed's toolbar sizes in CSS px (TradingView layout, fixed, the same at every frame size; measured at 360x200 and
 *  560x300): top toolbar 38 + 4 gap, left toolbar 52 + 4 gap, bottom bar 39. The plot starts at (left, top). */
export const GMGN_CLIP = { top: 42, left: 56, bottom: 39 } as const;

/** The whole embed is drawn at this zoom (a uniform CSS scale of the frame): everything in it, the GMGN.AI watermark,
 *  the TradingView logo and the legend included, is the same, only smaller. Nothing is hidden or covered by it. */
export const GMGN_SCALE = 0.8;

/** Inline style for the offset frame inside an overflow:hidden box: the plot fills the box exactly. With a scale `s` the
 *  frame is laid out at 1/s of the box and scaled down from its top left corner, so the clip offsets scale with it. */
export function gmgnFrameStyle(c: { top: number; left: number; bottom: number } = GMGN_CLIP, s = 1): string {
  if (!(s > 0 && s <= 1)) s = 1;
  const r = (n: number) => Math.round(n * s * 100) / 100;
  if (s === 1) return `position:absolute;top:-${c.top}px;left:-${c.left}px;width:calc(100% + ${c.left}px);height:calc(100% + ${c.top + c.bottom}px);border:0`;
  return `position:absolute;top:-${r(c.top)}px;left:-${r(c.left)}px;width:calc((100% + ${r(c.left)}px) / ${s});height:calc((100% + ${r(c.top + c.bottom)}px) / ${s});border:0;transform:scale(${s});transform-origin:0 0`;
}
