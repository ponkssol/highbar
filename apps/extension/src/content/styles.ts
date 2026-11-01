/** Drawer and button styles (inside closed shadow roots, so x.com CSS never reaches them). Colors are the dark --hb-* tokens
 *  from apps/web/app/globals.css. */
export const VARS = `--hb-seg:rgba(255,240,210,.045);--hb-seg-line:rgba(255,236,200,.05);--hb-seg-on:#3A3424;--hb-seg-on-ink:#FFFFFF;--hb-bg:#0C0B09;--hb-surface:#15130F;--hb-surface-muted:#1D1A15;--hb-border:rgba(255,236,200,.075);--hb-border-strong:rgba(255,236,200,.13);--hb-control:rgba(255,255,255,.05);--hb-control-hover:rgba(255,255,255,.08);--hb-gold-line:rgba(255,199,44,.35);--hb-ink:#F3EEDF;--hb-ink-2:#BDB4A0;--hb-ink-3:#958C79;--hb-on-ink:#0C0B09;--hb-tier-standard:#7FA3CC;--hb-tier-higher:#8FB57A;--hb-tier-max:#A98BD4;--hb-buy:#4CB67A;--hb-sell:#E06A5C;--hb-gold:#FFC72C;--hb-gold-ink:#1A1405;--hb-gold-text:#FFC72C;--hb-gold-soft:rgba(255,199,44,.12);--hb-sol-mark:#FFFFFF;`;
const SANS = `"HB Inter",Inter,system-ui,-apple-system,"Segoe UI",sans-serif`;
const MONO = `"HB Mono","JetBrains Mono",ui-monospace,monospace`;
const DISPLAY = `"HB Cinzel",Cinzel,Georgia,serif`;

/** Tweet action bar button. It sits in X's action row like reply, repost and like: the host takes the row's 20px line
 *  and centers on it, the visible pill is 26px tall (negative margins, so the row never grows) and the click area is 34px.
 *  Font family and the gray come from X (inherited through the shadow host), the size is X's 13px count size. */
export const BUTTON_CSS = `:host{all:initial;font-family:inherit;color:inherit;display:flex;align-items:center;align-self:center;flex:none;height:20px;margin:0 14px 0 10px;${VARS}
--p-ink:#FFD35C;--p-bg:#15130F;--p-line:rgba(255,199,44,.32);--p-ink-h:#FFE08A;--p-bg-h:#211C10;--p-line-h:rgba(255,199,44,.62);--hb-mark:#FFC72C}
button{all:unset;box-sizing:border-box;position:relative;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:24px;margin:-2px 0;padding:0 11px 0 7px;border-radius:999px;cursor:pointer;
font:600 12px/1 ${SANS};letter-spacing:-.003em;white-space:nowrap;color:var(--p-ink);-webkit-text-fill-color:currentColor;border:1px solid var(--p-line);background:var(--p-bg);transition:background-color .15s,color .15s,border-color .15s,box-shadow .15s}
button::before{content:"";position:absolute;left:0;right:0;top:-5px;bottom:-5px}
button:hover{color:var(--p-ink-h);background:var(--p-bg-h);border-color:var(--p-line-h);box-shadow:0 0 0 2px rgba(255,199,44,.08)}
button:focus-visible{outline:2px solid rgba(255,199,44,.55);outline-offset:1px}
:host([data-compact]){margin:0 4px 0 0}:host([data-compact]) button{padding:0 6px;gap:0}:host([data-compact]) .lbl,:host([data-compact]) .amt{display:none}:host([data-mini]){margin:0}:host([data-mini]) button{padding:0 3px}
.hbm{width:15px;height:15px;flex:none;display:block}
.lbl{display:block}
.amt{display:inline-flex;align-items:center;font:600 11px/1 ${MONO};opacity:.8;margin-left:1px}
.sol{height:.78em;width:auto;fill:currentColor;margin-right:2px}`;

/** Drawer surfaces: solid neutral dark, no alpha, so nothing of the page (or a blue tint) shows through. */
export const SOLID = "--hb-surface:#111111;--hb-surface-muted:#1A1A1A;--hb-control:#1A1A1A;--hb-control-hover:#222222;--hb-seg:#161616;--hb-seg-line:#262626;--hb-seg-on:#2B2B2B;--hb-border:#232323;--hb-border-strong:#333333";

/** The drawer, the attached Holding panel and their popovers. Compact sizing: base text 12px (labels 11, meta 10, never
 *  under 10), controls 28 to 30 tall, header 38, paddings 8 to 10, gaps 6. Inter for all text and numbers (tabular figures),
 *  Cinzel only for the Launch title, JetBrains Mono only for wallet addresses. Scroll areas scroll by wheel, trackpad and
 *  keyboard with the scrollbar itself hidden (SCROLLERS, checked by a test). */
export const SCROLLERS = [".body", ".hlist", ".wdrop", ".mrows", ".strip", ".hdrop", "textarea"] as const;
const NOBAR = `${SCROLLERS.join(",")}{scrollbar-width:none;-ms-overflow-style:none}${SCROLLERS.map((x) => `${x}::-webkit-scrollbar`).join(",")}{display:none;width:0;height:0}`;

export const DRAWER_CSS = `:host{all:initial;${VARS};${SOLID}}
*{box-sizing:border-box}
${NOBAR}
.fade-t{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16px);mask-image:linear-gradient(to bottom,transparent 0,#000 16px)}
.fade-b{-webkit-mask-image:linear-gradient(to top,transparent 0,#000 16px);mask-image:linear-gradient(to top,transparent 0,#000 16px)}
.fade-t.fade-b{-webkit-mask-image:linear-gradient(to bottom,transparent 0,#000 16px,#000 calc(100% - 16px),transparent 100%);mask-image:linear-gradient(to bottom,transparent 0,#000 16px,#000 calc(100% - 16px),transparent 100%)}
.drawer{position:fixed;top:12px;left:12px;max-height:calc(100vh - 24px);width:340px;max-width:calc(100vw - 24px);z-index:2147483647;display:flex;flex-direction:column;
background:var(--hb-surface);opacity:1;backdrop-filter:none;color:var(--hb-ink);border:1px solid var(--hb-border-strong);border-radius:12px;
box-shadow:0 20px 50px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.35);font:400 12px/1.4 ${SANS};letter-spacing:-.003em;-webkit-font-smoothing:antialiased;animation:rise .2s cubic-bezier(0,0,.2,1);overflow:hidden}
@keyframes fade{from{opacity:0}}@keyframes rise{from{opacity:0;transform:translateY(10px)}}
@media (prefers-reduced-motion:reduce){.drawer{animation:none}}
header{display:flex;align-items:center;gap:6px;height:38px;flex:none;padding:0 6px 0 10px;border-bottom:1px solid var(--hb-border);cursor:grab;touch-action:none;user-select:none}
.drawer.dragging header{cursor:grabbing}.drawer.dragging{animation:none;transition:none}.drawer.moved{animation:none}
header .x{cursor:pointer}
header .hbm{width:16px;height:16px}
h2{margin:0;font:600 13px/1 ${DISPLAY};letter-spacing:.06em}
.wdot{width:6px;height:6px;border-radius:999px;background:var(--hb-ink-3)}.wdot.on{background:var(--hb-buy);box-shadow:0 0 0 2px rgba(76,182,122,.15)}.wdot.off{background:var(--hb-sell)}
.x{all:unset;cursor:pointer;color:var(--hb-ink-3);display:inline-flex;padding:4px;border-radius:7px}.x:hover{color:var(--hb-ink);background:var(--hb-control-hover)}.x svg{width:14px;height:14px}
.body{flex:1;min-height:0;overflow:auto;padding:10px 10px 8px;display:flex;flex-direction:column;gap:6px;overscroll-behavior:contain}
.eyebrow{font:500 10px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:var(--hb-gold-text);display:flex;align-items:center;gap:6px;margin-bottom:6px}
.row{display:flex;gap:8px}.grow{flex:1;min-width:0}
label{display:block}
input[type=text],input[type=number],textarea{all:unset;box-sizing:border-box;width:100%;padding:7px 9px;border-radius:8px;background:var(--hb-control);border:1px solid var(--hb-border);color:var(--hb-ink);font:500 12px/1.35 ${SANS}}
textarea{min-height:52px;max-height:96px;overflow:auto;white-space:pre-wrap;font-weight:400}
input:focus,textarea:focus{border-color:var(--hb-gold-line);background:var(--hb-control-hover)}
.count{font:400 10px/1 ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-ink-3);opacity:.75;letter-spacing:0;text-transform:none;white-space:nowrap}
.fld{position:relative;display:block;min-width:0}.fld .count{position:absolute;right:8px;top:50%;transform:translateY(-50%);pointer-events:none}.fld input{padding-right:38px;height:30px;padding-top:0;padding-bottom:0;text-overflow:ellipsis}
.fld .prefix{position:absolute;left:9px;top:50%;transform:translateY(-50%);color:var(--hb-ink-3);font:500 12px/1 ${SANS};pointer-events:none}.fld.pre input{padding-left:19px}
.count.bad{color:var(--hb-sell);opacity:1}
.imgs{display:flex;gap:6px;flex-wrap:wrap}
.thumb{all:unset;cursor:pointer;width:48px;height:48px;border-radius:8px;overflow:hidden;border:1px solid var(--hb-border);background:var(--hb-surface-muted);display:flex;align-items:center;justify-content:center;color:var(--hb-ink-3);font:500 10px/1.2 ${SANS};text-align:center}
.thumb img{width:100%;height:100%;object-fit:cover}
.thumb.on{border-color:var(--hb-gold);box-shadow:0 0 0 1px var(--hb-gold),0 0 0 3px var(--hb-gold-soft)}
.seg{position:relative;display:flex;gap:2px;padding:3px;border-radius:999px;border:1px solid var(--hb-seg-line);background:var(--hb-seg)}
.seg button{all:unset;flex:1;display:inline-flex;align-items:center;justify-content:center;gap:5px;height:26px;border-radius:999px;font:500 11.5px/1 ${SANS};color:var(--hb-ink-3);cursor:pointer;transition:background-color .2s,color .2s}
.seg button:hover{color:var(--hb-ink-2)}
.seg button.on{background:var(--hb-seg-on);color:var(--hb-seg-on-ink)}
.seg button[aria-disabled=true]{cursor:not-allowed;opacity:.55}
.dot{width:5px;height:5px;border-radius:999px}
.tip{position:relative;display:inline-flex;color:var(--hb-ink-3);cursor:help;flex:none}
.tip svg{width:13px;height:13px}
.tip:hover{color:var(--hb-ink-2)}
.tpanel{display:none;position:fixed;z-index:2147483647;left:0;top:0;width:max-content;max-width:220px;padding:6px 8px;border-radius:8px;background:#161616;border:1px solid var(--hb-border-strong);box-shadow:0 8px 24px rgba(0,0,0,.5);font:400 11px/1.4 ${SANS};letter-spacing:normal;text-transform:none;color:var(--hb-ink-2);pointer-events:none;white-space:normal}
.tpanel.on{display:block}
.toggle{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 9px;border-radius:8px;background:var(--hb-control);border:1px solid var(--hb-border)}
.switch{all:unset;cursor:pointer;width:30px;height:18px;border-radius:999px;background:var(--hb-border-strong);position:relative;flex-shrink:0}
.switch::after{content:"";position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:999px;background:var(--hb-ink-2);transition:transform .16s}
.switch[aria-checked=true]{background:var(--hb-gold)}.switch[aria-checked=true]::after{transform:translateX(12px);background:var(--hb-gold-ink)}
.sol{height:.78em;width:auto;fill:var(--hb-sol-mark);margin-right:3px;vertical-align:baseline}
.solin{position:relative}.solin svg{position:absolute;left:9px;top:50%;transform:translateY(-50%);height:10px}.solin input{padding-left:24px}
.chips{display:flex;gap:6px;margin-top:6px}.chip{all:unset;box-sizing:border-box;cursor:pointer;height:24px;padding:0 8px;display:inline-flex;align-items:center;border-radius:999px;border:1px solid var(--hb-border);background:var(--hb-control);font:500 11px/1 ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-ink-2)}.chip:hover{border-color:var(--hb-gold-line)}
.summary{border:1px solid var(--hb-gold-line);background:var(--hb-gold-soft);border-radius:10px;padding:7px 10px;display:flex;flex-direction:column;gap:5px}
.summary .line{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:11.5px;color:var(--hb-ink-2)}
.summary .big{font:600 12.5px/1.2 ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-ink)}
.muted{color:var(--hb-ink-3);font-size:11px}
.warn{color:var(--hb-sell);font-size:11px}
.link{color:var(--hb-gold-text);text-decoration:none;word-break:break-all}.link:hover{text-decoration:underline}
footer{flex:none;padding:7px 10px 7px;border-top:1px solid var(--hb-border);display:flex;flex-direction:column;gap:6px}
.cta{all:unset;box-sizing:border-box;cursor:pointer;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(180deg,#FFD24D,var(--hb-gold));box-shadow:inset 0 1px 0 rgba(255,255,255,.22);color:var(--hb-gold-ink);font:600 13px/1 ${SANS};letter-spacing:-.005em}
.cta:hover{filter:brightness(1.04)}.cta[disabled]{opacity:.5;cursor:not-allowed;filter:none}
.powered{all:unset;box-sizing:border-box;cursor:pointer;align-self:center;display:inline-flex;align-items:center;gap:4px;margin-top:-1px;color:var(--hb-ink-3);font:500 10px/12px ${SANS};opacity:.85}.powered:hover{opacity:1;color:var(--hb-ink-2)}.powered svg{width:12px;height:12px;display:block}
.ghost{all:unset;box-sizing:border-box;cursor:pointer;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;border:1px solid var(--hb-border);color:var(--hb-ink-2);font:500 12px/1 ${SANS}}
.ghost:hover{background:var(--hb-control-hover)}
.wallet{display:flex;align-items:center;gap:6px;font:500 11px/1 ${MONO};color:var(--hb-ink-2)}
.state{display:inline-flex;align-items:center;gap:5px;padding:3px 7px;border-radius:999px;background:var(--hb-control);border:1px solid var(--hb-border)}
.state i{width:6px;height:6px;border-radius:999px;background:var(--hb-buy)}.state.locked i{background:var(--hb-sell)}
.steps{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.steps li{display:flex;align-items:center;gap:8px;color:var(--hb-ink-3)}
.steps li .b{width:20px;height:20px;border-radius:999px;border:1px solid var(--hb-border-strong);display:inline-flex;align-items:center;justify-content:center;font:500 10px/1 ${SANS};font-variant-numeric:tabular-nums}
.steps li.done{color:var(--hb-ink-2)}.steps li.done .b{background:var(--hb-buy);border-color:transparent;color:#0C0B09}
.steps li.now{color:var(--hb-ink)}.steps li.now .b{border-color:var(--hb-gold);color:var(--hb-gold);animation:pulse 1.2s ease-in-out infinite}
@keyframes pulse{50%{box-shadow:0 0 0 3px var(--hb-gold-soft)}}
.result{border:1px solid var(--hb-border);border-radius:10px;padding:9px 10px;display:flex;flex-direction:column;gap:6px;background:var(--hb-surface-muted)}
.rhead{display:flex;align-items:center;gap:6px}.link.sm{font-size:11px;font-weight:500}
.ca{display:inline-flex;align-items:center;gap:6px;min-width:0;font-size:11.5px;color:var(--hb-ink-2)}.ca .calbl{font-size:10.5px;font-weight:600;color:var(--hb-ink-3);letter-spacing:.02em}.ca .mono{font-size:11.5px;color:var(--hb-ink)}.ca.sm .mono{font-size:10.5px;color:var(--hb-ink-2)}
.cacopy{all:unset;box-sizing:border-box;cursor:pointer;width:20px;height:20px;border-radius:6px;display:inline-flex;align-items:center;justify-content:center;color:var(--hb-ink-3);border:1px solid var(--hb-border);background:var(--hb-control)}.cacopy:hover{color:var(--hb-ink-2);border-color:var(--hb-gold-line)}.cacopy.done{color:var(--hb-buy);border-color:var(--hb-buy)}.ca.sm .cacopy{width:18px;height:18px;border:0;background:transparent}
.terms{display:flex;align-items:center;gap:6px;flex-wrap:nowrap}.term{display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:7px;border:1px solid var(--hb-border);background:var(--hb-control);flex:none}.term:hover{border-color:var(--hb-gold-line);background:var(--hb-control-hover)}.term img{width:18px;height:18px;border-radius:4px;display:block}
.terms.sm{gap:3px}.terms.sm .term{width:20px;height:20px;border-radius:5px;border:0;background:transparent}.terms.sm .term:hover{background:var(--hb-control-hover)}.terms.sm .term img{width:16px;height:16px;border-radius:3px}
.mono{font-family:${MONO};font-size:10.5px}
.tnum{font-variant-numeric:tabular-nums}
.preview{display:flex;gap:8px;align-items:center;min-width:0}.preview>div{min-width:0}.preview strong{display:block;font-size:12.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.preview img,.preview .ph{width:36px;height:36px;flex:none;border-radius:8px;object-fit:cover;background:var(--hb-surface-muted);border:1px solid var(--hb-border)}
.strip{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;overflow-y:hidden;padding:3px 3px 3px;margin:-3px -3px -1px;scroll-snap-type:x proximity;overscroll-behavior-x:contain}
.strip .thumb{flex:0 0 auto;width:40px;height:40px;border-radius:8px;scroll-snap-align:start;box-sizing:border-box}
.strip .thumb.av{border-radius:50%}.strip .thumb.up{flex-direction:column;gap:1px;border-style:dashed;font-size:10px}.strip .thumb.up .plus{font:500 13px/1 ${SANS};color:var(--hb-ink-2)}
.strip .thumb:focus-visible{outline:2px solid var(--hb-gold);outline-offset:1px}
.names{display:grid;grid-template-columns:minmax(0,1fr) 124px;gap:6px}
.fld.xl input{padding-left:26px;padding-right:9px;font-size:12px;font-weight:400;color:var(--hb-ink-2)}.fld.xl .prefix{display:flex;color:var(--hb-ink-3)}.fld.xl .prefix svg{width:11px;height:11px}.fld.xl.bad input{border-color:var(--hb-sell)}
.r2{display:flex;align-items:center;gap:4px;min-width:0}
.seg.sm{padding:2px}.seg.sm button{height:22px;padding:0 8px;gap:4px;flex:0 0 auto;font-size:11px}
.as{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:500;color:var(--hb-ink-2);white-space:nowrap;margin-right:2px}
.switch.sm{width:26px;height:16px}.switch.sm::after{top:2px;left:2px;width:12px;height:12px}.switch.sm[aria-checked=true]::after{transform:translateX(10px)}
.r3{display:flex;align-items:center;gap:5px;height:26px}.r3 .solin{width:76px;flex:none}.r3 .solin input{height:26px;border-radius:8px;padding-top:0;padding-bottom:0;font-variant-numeric:tabular-nums}
.dchips{display:flex;gap:5px;min-width:0}.r3 .chip{height:26px;min-width:34px;padding:0 9px;justify-content:center;border-radius:8px}.chip.on{border-color:var(--hb-gold-line);color:var(--hb-gold-text);background:var(--hb-gold-soft)}
.dgear{all:unset;box-sizing:border-box;flex:none;cursor:pointer;width:26px;height:26px;border-radius:8px;border:1px solid var(--hb-border);background:var(--hb-control);display:inline-flex;align-items:center;justify-content:center;color:var(--hb-ink-3)}.dgear:hover,.dgear.on{color:var(--hb-ink-2);border-color:var(--hb-gold-line)}.dgear:focus-visible{outline:2px solid var(--hb-gold-line);outline-offset:1px}
.dpe[hidden]{display:none}.dpe{margin-top:6px;padding:8px;border:1px solid var(--hb-border);border-radius:10px;background:var(--hb-surface-muted);display:flex;flex-direction:column;gap:6px}
.dphead{display:flex;align-items:baseline;gap:6px;font-size:11.5px}.dphead strong{font-weight:600;color:var(--hb-ink)}.dphelp{font-size:10.5px;color:var(--hb-ink-3);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;min-width:0}
.dpins{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:5px}.dpcell{position:relative;display:block}.dpcell svg{position:absolute;left:7px;top:50%;transform:translateY(-50%);height:8px}
.dpe input.dpin{all:unset;box-sizing:border-box;width:100%;height:26px;border-radius:8px;border:1px solid var(--hb-border);background:var(--hb-control);padding:0 6px 0 20px;font:500 11.5px/26px ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-ink)}.dpe input.dpin:focus{border-color:var(--hb-gold-line)}.dpe input.dpin::placeholder{color:var(--hb-ink-3)}
.dpmsg{font-size:10.5px;line-height:13px;color:var(--hb-ink-3);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.dpmsg.bad{color:color-mix(in srgb,var(--hb-sell) 78%,var(--hb-ink-3))}
.dpacts{display:flex;align-items:center;gap:5px}.dpb{all:unset;box-sizing:border-box;cursor:pointer;height:24px;padding:0 10px;border-radius:7px;border:1px solid var(--hb-border);background:var(--hb-control);font:500 11px/22px ${SANS};color:var(--hb-ink-2)}.dpb:hover{border-color:var(--hb-gold-line)}.dpb.gold{background:var(--hb-gold);border-color:transparent;color:var(--hb-gold-ink);font-weight:600}.dpb:disabled{opacity:.45;cursor:default}
.qrow{display:flex;align-items:flex-start;gap:8px;margin-top:5px}
.quote{flex:1;min-width:0;font-size:10.5px;line-height:14px;color:var(--hb-ink-3);font-variant-numeric:tabular-nums;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.moreBtn{all:unset;flex:none;cursor:pointer;font:500 11px/14px ${SANS};color:var(--hb-ink-3);display:inline-flex;align-items:center;gap:4px}.moreBtn::after{content:"";width:4px;height:4px;border-right:1.2px solid currentColor;border-bottom:1.2px solid currentColor;transform:rotate(45deg) translateY(-2px)}
.moreBtn[aria-expanded=true]::after{transform:rotate(-135deg)}.moreBtn:hover{color:var(--hb-ink-2)}
.more{margin-top:6px;display:flex;flex-direction:column;gap:6px}.more[hidden]{display:none}
.sumline{display:flex;align-items:center;gap:5px;font-size:11.5px;color:var(--hb-ink-2);white-space:nowrap}
.devamt{font:600 12px/1 ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-gold-text)}.devamt .sol{fill:var(--hb-gold-text)}.sep{color:var(--hb-ink-3)}
.warn:empty{display:none}
.wslot{display:inline-flex}
.wsw{all:unset;box-sizing:border-box;cursor:pointer;height:24px;padding:0 6px 0 7px;border-radius:7px;border:1px solid var(--hb-border-strong);background:var(--hb-control);color:var(--hb-ink-2);display:inline-flex;align-items:center;gap:5px}
.wsw:hover:not([disabled]),.wsw[aria-expanded=true]{border-color:var(--hb-gold-line);color:var(--hb-ink)}.wsw[disabled]{cursor:default;opacity:.85}
.wico{display:inline-flex;color:var(--hb-ink-3)}.wico svg{width:13px;height:13px}.wsw .wico{color:var(--hb-ink-2)}
.wbal{font:500 11.5px/1 ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-ink);white-space:nowrap;display:inline-flex;align-items:center}
.chev{width:4px;height:4px;border-right:1.3px solid currentColor;border-bottom:1.3px solid currentColor;transform:rotate(45deg) translateY(-2px);margin:0 1px}
.wsw[aria-expanded=true] .chev,.hsel[aria-expanded=true] .chev{transform:rotate(-135deg) translate(-1px,-1px)}
.wdrop{position:fixed;z-index:2147483647;width:260px;box-sizing:border-box;overflow:auto;padding:4px;border-radius:10px;background:#111;border:1px solid #333;box-shadow:0 14px 36px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.3);font:400 12px/1.35 ${SANS};color:var(--hb-ink);overscroll-behavior:contain}
.wdrop[hidden]{display:none}
.wtitle{display:flex;align-items:center;gap:6px;padding:5px 6px 6px;border-bottom:1px solid #232323;margin-bottom:3px;font:600 11.5px/1 ${SANS};color:var(--hb-ink)}
.wref{all:unset;cursor:pointer;display:inline-flex;color:var(--hb-ink-3);padding:2px;border-radius:6px}.wref svg{width:12px;height:12px}.wref:hover{color:var(--hb-ink)}.wref.spin svg{animation:hbspin .8s linear infinite}
@keyframes hbspin{to{transform:rotate(360deg)}}
.wnet{font:500 10px/1 ${SANS};color:var(--hb-ink-3);border:1px solid #333;border-radius:999px;padding:2px 6px}
.wlist{display:flex;flex-direction:column;gap:2px}
.wrow{display:flex;align-items:center;gap:8px;padding:6px 7px;border-radius:7px;cursor:pointer;outline:none}
.wrow:hover,.wrow:focus-visible{background:#1A1A1A}.wrow.on{background:rgba(255,199,44,.07)}
.wchk{width:14px;height:14px;border-radius:4px;border:1.2px solid #444;box-sizing:border-box;flex:none;display:inline-flex;align-items:center;justify-content:center}
.wrow.on .wchk{background:var(--hb-gold);border-color:var(--hb-gold)}
.wrow.on .wchk::after{content:"";width:6px;height:3px;border-left:1.6px solid var(--hb-gold-ink);border-bottom:1.6px solid var(--hb-gold-ink);transform:rotate(-45deg) translate(0,-1px)}
.wtxt{display:flex;flex-direction:column;gap:2px;min-width:0;flex:1}
.wlab{font:600 12px/1.15 ${SANS};color:var(--hb-gold-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.waddr{font:400 10.5px/1 ${MONO};color:var(--hb-ink-3);display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.wcopy{all:unset;cursor:pointer;display:inline-flex;color:var(--hb-ink-3);padding:1px;border-radius:4px}.wcopy svg{width:11px;height:11px}.wcopy:hover{color:var(--hb-ink)}.wcopy.done{color:var(--hb-buy)}
.wrow .wbal{font-size:12px}
.wcount{min-width:15px;height:15px;padding:0 4px;box-sizing:border-box;border-radius:999px;background:var(--hb-gold);color:var(--hb-gold-ink);font:700 10px/15px ${SANS};text-align:center}
.wrow.low .wbal{color:var(--hb-sell)}.wlow{font:500 10px/1 ${SANS};color:var(--hb-sell);white-space:nowrap;margin-left:2px}
.whint{font:400 10.5px/1.3 ${SANS};color:var(--hb-ink-3);padding:4px 7px 2px}.whint:empty{display:none}
.sumline{min-width:0;height:16px;overflow:hidden}.sdev{flex:none}.snote{flex:1 1 auto;min-width:0;margin-left:auto;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10.5px;line-height:16px;color:color-mix(in srgb,var(--hb-sell) 78%,var(--hb-ink-3));cursor:default}.snote.soft{opacity:.85}
.mrows{display:flex;flex-direction:column;max-height:156px;overflow:auto;border:1px solid var(--hb-border);border-radius:10px;background:var(--hb-surface-muted);overscroll-behavior:contain}
.mrow{display:flex;align-items:flex-start;gap:8px;padding:7px 9px;border-bottom:1px solid var(--hb-border)}.mrow:last-child{border-bottom:0}
.mdot{width:6px;height:6px;border-radius:999px;background:var(--hb-ink-3);margin-top:5px;flex:none}
.mrow.running .mdot{background:var(--hb-gold);box-shadow:0 0 0 3px rgba(255,199,44,.15)}.mrow.done .mdot{background:var(--hb-buy)}.mrow.failed .mdot{background:var(--hb-sell)}.mrow.skipped .mdot{background:transparent;border:1.2px solid var(--hb-sell);box-sizing:border-box}
.mtxt{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.mhead{display:flex;align-items:center;gap:6px;font-size:12px;min-width:0}.mhead strong{color:var(--hb-gold-text);font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}.mhead .mono{font-size:10.5px}
.mst{font-size:11px;font-weight:500;color:var(--hb-ink-2);white-space:nowrap}.mrow.done .mst{color:var(--hb-buy)}.mrow.failed .mst,.mrow.skipped .mst{color:var(--hb-sell)}
.mlinks{display:flex;align-items:center;gap:8px;font-size:11px;font-weight:500;flex-wrap:nowrap;min-width:0}.mlinks .link.sm{margin-left:auto}.merr{font-size:10.5px;line-height:1.35;color:var(--hb-ink-3);overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical}
.mtally{font-size:11.5px}.mtally.done{color:var(--hb-ink);font-weight:600;font-size:12px}
.pend{margin-left:6px;font:500 10px/1 ${SANS};color:var(--hb-ink-3)}
.fromw{font-size:11px;color:var(--hb-ink-3);display:flex;gap:6px;align-items:baseline}.fromw strong{color:var(--hb-ink);font-weight:600}.fromw .mono{font-family:${MONO}}
/* Holding toggle (drawer header) and the attached Holding panel */
.hslot{display:inline-flex}
.hbtn{all:unset;box-sizing:border-box;cursor:pointer;width:24px;height:24px;border-radius:7px;border:1px solid var(--hb-border-strong);background:var(--hb-control);color:var(--hb-ink-2);display:inline-flex;align-items:center;justify-content:center}.hbtn svg{width:13px;height:13px}
.hbtn:hover{color:var(--hb-ink);background:var(--hb-control-hover)}.hbtn.on{color:var(--hb-gold-text);border-color:var(--hb-gold-line);background:var(--hb-gold-soft)}
.hbtn:focus-visible,.hb:focus-visible,.hsel:focus-visible,.hopt:focus-visible{outline:2px solid var(--hb-gold-line);outline-offset:1px}
.hpanel{position:fixed;top:12px;left:12px;width:300px;max-width:calc(100vw - 16px);z-index:2147483647;display:flex;flex-direction:column;background:#111111;color:var(--hb-ink);
border:1px solid var(--hb-border-strong);border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.55);font:400 12px/1.35 ${SANS};letter-spacing:-.003em;-webkit-font-smoothing:antialiased;font-variant-numeric:tabular-nums;overflow:hidden;animation:rise .2s cubic-bezier(0,0,.2,1)}
.hpanel[hidden]{display:none}
.hpanel.narrow .htick,.hpanel.narrow .himg{display:none}.hpanel.narrow .hchip.mig{font-size:0;width:14px;padding:0;display:inline-flex;align-items:center;justify-content:center}.hpanel.narrow .hchip.mig::before{content:"";width:6px;height:6px;border-radius:999px;background:var(--hb-tier-max)}.hpanel.narrow .hchip{flex:none;max-width:72px}.hpanel.narrow .hcols,.hpanel.narrow .hgrid{grid-template-columns:minmax(0,1fr) 36px 48px 62px;column-gap:4px}.hpanel.narrow .hsub{min-width:0;overflow:hidden}.hpanel.narrow .hmc{overflow:hidden;text-overflow:ellipsis}
.hframe{position:fixed;z-index:2147483647;pointer-events:none;border-radius:12px;box-shadow:0 20px 50px rgba(0,0,0,.55),0 2px 8px rgba(0,0,0,.35)}.hframe[hidden]{display:none}
.drawer.att-r,.drawer.att-l,.hpanel.att-r,.hpanel.att-l{box-shadow:none}.hpanel.att-r,.hpanel.att-l{animation:fade .16s ease-out;max-width:none}
.drawer.att-r{border-right:0;border-top-right-radius:0;border-bottom-right-radius:0}.hpanel.att-r{border-top-left-radius:0;border-bottom-left-radius:0}
.drawer.att-l{border-top-left-radius:0;border-bottom-left-radius:0}.hpanel.att-l{border-right:0;border-top-right-radius:0;border-bottom-right-radius:0}
@media (prefers-reduced-motion:reduce){.hpanel{animation:none}}
.hpanel .hhead{flex:none;height:38px;padding:0 6px 0 10px;gap:6px;color:var(--hb-ink-2)}.hhead>svg{width:13px;height:13px}.drawer.dragging~.hpanel .hhead{cursor:grabbing}
.hhead h3{margin:0;font:600 13px/1 ${SANS};color:var(--hb-ink);letter-spacing:0}
.hcount{font:500 10px/1 ${SANS};font-variant-numeric:tabular-nums;color:var(--hb-ink-3);padding:3px 6px;border-radius:999px;background:var(--hb-control)}.hcount:empty{display:none}
.hhead .x svg{width:13px;height:13px}.hhead .x.spin svg{animation:hbspin .8s linear infinite}
.htool{display:flex;gap:6px;align-items:center;padding:6px 8px;border-bottom:1px solid var(--hb-border)}
.hsel{all:unset;box-sizing:border-box;flex:1;min-width:0;height:26px;padding:0 8px 0 9px;border-radius:7px;border:1px solid var(--hb-border);background:var(--hb-control);color:var(--hb-ink);font:500 11.5px/1 ${SANS};cursor:pointer;display:flex;align-items:center;gap:6px}
.hsel:hover,.hsel[aria-expanded=true]{border-color:var(--hb-gold-line)}.hsel .hsv{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hsel .chev{color:var(--hb-ink-3);flex:none}
.hdrop{position:fixed;z-index:2147483647;box-sizing:border-box;min-width:180px;max-height:240px;overflow:auto;padding:4px;border-radius:10px;background:#111;border:1px solid #333;box-shadow:0 14px 36px rgba(0,0,0,.6),0 2px 6px rgba(0,0,0,.3);font:400 12px/1.3 ${SANS};color:var(--hb-ink);overscroll-behavior:contain;outline:none}
.hdrop[hidden]{display:none}
.hopt{display:flex;align-items:center;gap:7px;min-height:28px;padding:4px 7px;border-radius:7px;cursor:pointer;outline:none;color:var(--hb-ink-2)}
.hopt:hover,.hopt.act{background:#1A1A1A;color:var(--hb-ink)}.hopt[aria-selected=true]{color:var(--hb-gold-text)}.hopt[aria-selected=true].act,.hopt[aria-selected=true]:hover{background:rgba(255,199,44,.07)}
.hopt .hck{width:12px;height:12px;flex:none;display:inline-flex;color:var(--hb-gold)}.hopt .hck svg{width:12px;height:12px}
.hopt .hol{flex:1;min-width:0;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hopt .hoa{font:400 10.5px/1 ${MONO};color:var(--hb-ink-3);white-space:nowrap}
.hslipw{display:flex;align-items:center;gap:4px;height:26px;padding:0 4px 0 7px;border-radius:7px;border:1px solid var(--hb-border);background:var(--hb-control);color:var(--hb-ink-3);font:500 10.5px/1 ${SANS};flex:none}
.hpanel input.hslip{all:unset;width:28px;text-align:right;color:var(--hb-ink);font:500 11.5px/1 ${SANS};font-variant-numeric:tabular-nums}
.hunit{color:var(--hb-ink-3);padding-right:3px}
.hnote{margin:4px 10px 0;font-size:10.5px;line-height:14px;height:14px;color:color-mix(in srgb,var(--hb-sell) 78%,var(--hb-ink-3));white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:default}
.hcols,.hgrid{display:grid;grid-template-columns:minmax(0,1fr) 40px 52px 58px;column-gap:5px;align-items:start}
.hcols{padding:5px 10px 4px;font:500 10px/1 ${SANS};letter-spacing:0;color:var(--hb-ink-3);border-bottom:1px solid var(--hb-border)}
.hcols span:not(:first-child){text-align:right}
.hlist{flex:1;min-height:0;overflow:auto;display:flex;flex-direction:column;overscroll-behavior:contain}
.hrow{padding:6px 10px 6px;border-bottom:1px solid var(--hb-border);display:flex;flex-direction:column;gap:5px}
.hrow.confirm,.hrow.run{background:#151515}
.hcell{min-width:0}.hcell.num{display:flex;flex-direction:column;align-items:flex-end;gap:1px;font-weight:500;color:var(--hb-ink);white-space:nowrap;font-size:11.5px;line-height:15px}
.hcell.up{color:var(--hb-buy)}.hcell.down{color:var(--hb-sell)}
.hsm{font-size:10px;line-height:13px;color:var(--hb-ink-3);font-weight:400}.hcell.up .hsm{color:var(--hb-buy);opacity:.8}.hcell.down .hsm{color:var(--hb-sell);opacity:.8}
.htok{display:flex;gap:6px;align-items:center;color:inherit;text-decoration:none;min-width:0}
.himg{width:24px;height:24px;flex:none;border-radius:6px;overflow:hidden;background:var(--hb-surface-muted);border:1px solid var(--hb-border);display:flex;align-items:center;justify-content:center}
.himg img{width:100%;height:100%;object-fit:cover}.himg:has(.hph){border-radius:999px;background:#1b1b1b;border-color:#2a2a2a}.hph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;border-radius:999px;background:#1b1b1b;font:600 11px/1 ${SANS};color:var(--hb-gold-text, #e8c66a)}
.htxt{display:flex;flex-direction:column;gap:1px;min-width:0}
.hname{display:flex;align-items:center;gap:3px;min-width:0;font-weight:600;font-size:12px;line-height:15px;color:var(--hb-ink)}.hn{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.hname svg{width:10px;height:10px;flex:none}.hname span:last-child{color:var(--hb-ink-3);opacity:0;transition:opacity .15s}.htok:hover .hname span:last-child{opacity:1}.htok:hover .hn{color:var(--hb-gold-text)}
.hsub{display:flex;gap:5px;font-size:10px;line-height:13px;color:var(--hb-ink-3);white-space:nowrap}.htick{color:var(--hb-ink-2);font-weight:500}
.hchips{display:flex;gap:4px;flex-wrap:nowrap;flex:1;min-width:0;overflow:hidden}
.hchip{font:500 10px/14px ${SANS};padding:0 5px;border-radius:999px;background:var(--hb-control);border:1px solid var(--hb-border);color:var(--hb-ink-2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}
.hchip.mig{color:var(--hb-tier-max);border-color:rgba(169,139,212,.35);background:rgba(169,139,212,.1);flex:none}.hsell .hchip.mig{font-size:0;width:14px;height:14px;padding:0;display:inline-flex;align-items:center;justify-content:center;border-radius:999px}.hsell .hchip.mig::before{content:"";width:6px;height:6px;border-radius:999px;background:var(--hb-tier-max)}.hsell .hchip{max-width:84px}.hsell .hpg .hb{padding:0 4px}.hpanel .hsell input.hpct{width:28px}.hpanel .hsell.buy input.hpct{width:36px}
.hsell{display:flex;align-items:center;gap:3px;height:22px}.hsell .hchips{margin-right:2px}
.hb{all:unset;box-sizing:border-box;cursor:pointer;height:22px;padding:0 5px;border-radius:6px;border:1px solid var(--hb-border-strong);background:var(--hb-control);color:var(--hb-ink-2);font:500 11px/20px ${SANS};font-variant-numeric:tabular-nums;white-space:nowrap;flex:none}
.hb:hover:not([disabled]){color:var(--hb-ink);background:var(--hb-control-hover)}.hb[disabled]{opacity:.4;cursor:default}
.hb.pct:hover:not([disabled]){color:var(--hb-sell);border-color:rgba(224,106,92,.45)}
.hpg{display:inline-flex;flex:none}.hpg .hb{position:relative;border-radius:0;padding:0 5px;margin-left:-1px;font-variant-numeric:normal}.hpg .hb:first-child{margin-left:0;border-radius:6px 0 0 6px}.hpg .hb:last-child{border-radius:0 6px 6px 0}.hpg .hb:hover:not([disabled]),.hpg .hb:focus-visible{z-index:1}
.hb.sell{color:#fff;background:var(--hb-sell);border-color:transparent;font-weight:600}.hb.sell:hover:not([disabled]){background:#E67B6E;color:#fff}
.hb.ghost{background:transparent;height:22px;border-radius:6px;font-size:11px}
.hpctw{display:inline-flex;flex:none}
.hpanel input.hpct{all:unset;box-sizing:border-box;width:30px;height:22px;padding:0 4px;border-radius:6px;border:1px solid var(--hb-border);background:var(--hb-control);color:var(--hb-ink);font:500 11px/20px ${SANS};text-align:right;font-variant-numeric:tabular-nums}
.hpanel input.hpct:focus{border-color:var(--hb-gold-line)}.hpanel input.hpct.bad{border-color:var(--hb-sell)}.hpanel input.hpct[disabled]{opacity:.4}
.hmsg{flex:1;min-width:0;display:flex;flex-direction:column;gap:0;font-size:11px;color:var(--hb-ink);line-height:12px;overflow:hidden}.hmsg .hl1,.hmsg .hsm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hmsg .hsm{font-size:9.5px;line-height:10px}.hsell.err .hmsg,.hsell.done .hmsg,.hsell.run .hmsg{line-height:22px}
.hside{display:inline-flex;flex:none;border:1px solid var(--hb-border-strong);border-radius:6px;overflow:hidden;height:22px}.hsd{all:unset;box-sizing:border-box;cursor:pointer;height:20px;padding:0 5px;font:600 10px/20px ${SANS};color:var(--hb-ink-3);background:transparent}.hsd:hover{color:var(--hb-ink-2)}.hsd.on.buy{color:var(--hb-buy);background:color-mix(in srgb,var(--hb-buy) 14%,transparent)}.hsd.on.sell{color:var(--hb-sell);background:color-mix(in srgb,var(--hb-sell) 14%,transparent)}.hsd:focus-visible{outline:2px solid var(--hb-gold-line);outline-offset:-2px}
.hb.buy{color:#0B1A10;background:var(--hb-buy);border-color:transparent;font-weight:600}.hb.buy:hover:not([disabled]){filter:brightness(1.08);color:#0B1A10;background:var(--hb-buy)}.hpg.buy .hb.pct:hover:not([disabled]){color:var(--hb-buy);border-color:color-mix(in srgb,var(--hb-buy) 45%,transparent)}
.hb.off{color:var(--hb-ink-3);background:transparent;border-color:var(--hb-border)}
.hnone{font-size:10px;line-height:14px;color:var(--hb-ink-3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0;flex:0 1 auto}
.hrow.none .hgrid{opacity:.6}.hrow.none .hsell.sell .hb.pct[disabled],.hrow.none .hpct[disabled]{opacity:.35;border-color:var(--hb-border)}
.hsell.err .hmsg{color:var(--hb-sell)}.hsell.done .hmsg{color:var(--hb-buy);font-weight:500}
.hsell.run .hmsg{color:var(--hb-ink-2)}
.hspin{width:11px;height:11px;flex:none;border-radius:999px;border:1.25px solid var(--hb-border-strong);border-top-color:var(--hb-gold);animation:hbspin .8s linear infinite}
.hlink{display:inline-flex;align-items:center;gap:3px;color:var(--hb-gold-text);text-decoration:none;font-size:11px;font-weight:500;white-space:nowrap}.hlink svg{width:10px;height:10px}.hlink:hover{text-decoration:underline}
.hempty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;padding:32px 20px;text-align:center;color:var(--hb-ink-3);font-size:11px}
.hempty strong{color:var(--hb-ink-2);font-weight:600;font-size:12px}
.hfoot{flex:none;padding:5px 10px;border-top:1px solid var(--hb-border);gap:0}
.hupd{font-size:10px;color:var(--hb-ink-3)}.costs{display:flex;align-items:center;gap:4px;flex-wrap:wrap;color:var(--hb-ink-3);font-size:11px;line-height:14px;font-variant-numeric:tabular-nums}
.costs b{font-weight:500;color:var(--hb-ink-2)}.costs .tot b{color:var(--hb-gold-text)}.costs .csep{opacity:.7}.costs .tot{margin-left:auto}
`;

/** CA pill under a tweet's name row: 22px tall, in the flow (the row reserves it as soon as a token is known, before paint
 *  when the tweet is still below the viewport). Gold outline on dark, darker gold on light, solid gold on hover. */
export const CA_PILL_CSS = `:host{all:initial;display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 6px;padding:0 2px;min-height:22px;${VARS}
--p-ink:#FFD35C;--p-bg:#15130F;--p-line:rgba(255,199,44,.32);--p-ink-h:#FFE08A;--p-bg-h:#211C10;--p-line-h:rgba(255,199,44,.62);--p-dim:#A79B7E}
button{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;height:22px;max-width:100%;padding:0 10px 0 6px;border-radius:999px;
font:600 12px/1 ${SANS};letter-spacing:-.003em;white-space:nowrap;color:var(--p-ink);background:var(--p-bg);border:1px solid var(--p-line);
text-decoration:none;-webkit-text-fill-color:currentColor;transition:background-color .15s,color .15s,border-color .15s,box-shadow .15s}
button *{color:inherit;text-decoration:none}
button:hover,button:focus-visible{color:var(--p-ink-h);background:var(--p-bg-h);border-color:var(--p-line-h);text-decoration:none;box-shadow:0 0 0 2px rgba(255,199,44,.08)}
button:active{background:var(--p-bg)}
button:focus-visible{outline:2px solid rgba(255,199,44,.55);outline-offset:1px}
.hbm{width:14px;height:14px;flex:none;display:block}
.arr{width:9px;height:9px;flex:none;opacity:.8;transition:opacity .15s,transform .15s}
button:hover .arr{opacity:1;transform:translate(1px,-1px)}
.mono{font:500 11px/1 ${MONO};opacity:.85}
.mk{display:inline-flex;align-items:center;gap:4px;min-width:0;overflow:hidden;text-overflow:ellipsis;font:500 11px/1 ${SANS};color:var(--p-dim);-webkit-text-fill-color:var(--p-dim)}
.mk i{font-style:normal;opacity:.6;margin:0 1px}
.mk b{font-weight:600;color:var(--p-ink);-webkit-text-fill-color:var(--p-ink);font-variant-numeric:tabular-nums;transition:color .45s}
.mk.ld b{opacity:.55}
.mk b[data-dir=up]{color:#8FE0A8;-webkit-text-fill-color:#8FE0A8}.mk b[data-dir=dn]{color:#F2A093;-webkit-text-fill-color:#F2A093}
@media (prefers-reduced-motion:reduce){.mk b{transition:none}}`;

/** CA popup, on top of DRAWER_CSS: same window, header and controls, plus the token head, chart, stats and trade box. */
export const CA_CSS = `.drawer.capop{width:300px}
.capop header{height:34px;padding:0 4px 0 9px;gap:5px}.capop h2{font-size:12px}
.capop .body{padding:7px 7px 6px;gap:5px}
.capop footer{padding:6px 7px;gap:4px}
.capop .cta{height:30px;font-size:12.5px}
.capop .seg button{height:26px;font-size:11.5px}
.capop .amts{gap:4px}.capop .amts .chip{height:28px;padding:0 6px}.capop .amts .solin{width:70px}.capop .amts .solin input{height:28px}
.tok{display:flex;align-items:center;gap:7px;min-width:0}
.tlogo{width:30px;height:30px;border-radius:999px;flex:none;object-fit:cover;background:#1A1A1A;display:flex;align-items:center;justify-content:center;font:600 15px/1 ${SANS};color:var(--hb-gold-text);border:1px solid var(--hb-border)}
.tname{display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.tn1{display:flex;align-items:center;gap:4px;min-width:0;font:600 12.5px/1.1 ${SANS};color:var(--hb-ink)}
.tn1 .nm{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vbadge{width:13px;height:13px;flex:none;color:var(--hb-gold)}
.tsym{color:var(--hb-ink-3);font-weight:500;font-size:11px}
.tprice{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex:none;font-variant-numeric:tabular-nums}
.tprice .p{font:600 13px/1 ${SANS};color:var(--hb-ink)}
.chg{font:600 11px/1 ${SANS}}.chg.up{color:var(--hb-buy)}.chg.dn{color:var(--hb-sell)}.chg.flat{color:var(--hb-ink-3)}
.chart{position:relative;height:184px;border-radius:9px;overflow:hidden;border:1px solid var(--hb-border);background:#0F0E0B}
.chart iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#0F0E0B}
.chart .empty{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:var(--hb-ink-3);font-size:11px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}
.stat{border:1px solid var(--hb-border);border-radius:8px;padding:4px 6px;display:flex;flex-direction:column;gap:2px;background:var(--hb-surface-muted)}
.stat .k{font:500 10px/1.1 ${SANS};letter-spacing:.04em;text-transform:uppercase;color:var(--hb-ink-3)}
.stat .v{font:600 11px/1.1 ${SANS};color:var(--hb-ink);font-variant-numeric:tabular-nums}
.tprice .p{font-variant-numeric:tabular-nums}
.pnl{border:1px solid var(--hb-gold-line);border-radius:9px;padding:8px 9px 7px;display:flex;flex-direction:column;gap:7px;background:linear-gradient(180deg,rgba(255,199,44,.06),rgba(255,199,44,.015));font:500 11px/1.2 ${SANS}}
.pnl[hidden]{display:none}
.ptop{display:flex;justify-content:space-between;align-items:flex-end;gap:8px}
.pgrid{display:grid;grid-template-columns:1fr 1fr 1.35fr;gap:6px;padding-top:6px;border-top:1px solid var(--hb-border)}
.pcell{display:flex;flex-direction:column;gap:3px;min-width:0}.pcell.r{align-items:flex-end}
.pk{font:500 10px/1 ${SANS};letter-spacing:.06em;text-transform:uppercase;color:var(--hb-ink-3)}
.pline{display:inline-flex;align-items:baseline;gap:4px;white-space:nowrap}
.pv{font:600 12px/1 ${SANS};color:var(--hb-ink);font-variant-numeric:tabular-nums;white-space:nowrap;transition:color .45s}
.pv.big{font-size:14px;color:var(--hb-gold-text)}
.psym{font:500 11px/1 ${SANS};color:var(--hb-ink-3)}
.ppct{font:600 11px/1 ${SANS};font-variant-numeric:tabular-nums}
.pnlc.up .pv,.pnlc.up .ppct{color:var(--hb-buy)}.pnlc.dn .pv,.pnlc.dn .ppct{color:var(--hb-sell)}.pnlc.na .pv{color:var(--hb-ink-3)}
.pv[data-dir],.ppct[data-dir]{transition:color .45s}
@media (prefers-reduced-motion:reduce){.pv{transition:none}}
.audit{font:500 11px/1 ${SANS}}
.audit[hidden]{display:none}
.achips{display:flex;gap:4px;min-width:0}
.achip{flex:1 1 auto;min-width:0;display:inline-flex;align-items:center;justify-content:center;gap:3px;height:20px;padding:0 6px;border-radius:999px;border:1px solid var(--hb-border);background:var(--hb-surface-muted);color:var(--hb-ink-3);white-space:nowrap;overflow:hidden;cursor:default;font-variant-numeric:tabular-nums}
.achip .alab{overflow:hidden;text-overflow:ellipsis}.achip .amk{font-weight:700}.achip .amk:empty{display:none}
.achip.ok{color:#7FD4A2;border-color:rgba(76,182,122,.32);background:rgba(76,182,122,.09)}
.achip.warn{color:#F0BE5E;border-color:rgba(224,164,58,.34);background:rgba(224,164,58,.09)}
.achip.bad{color:#F0968B;border-color:rgba(224,106,92,.38);background:rgba(224,106,92,.1)}
.achip.neutral{color:var(--hb-ink-2)}
.tprice .p,.stat .v{transition:color .45s ease;font-feature-settings:"tnum" 1}
.tprice .p[data-dir=up],.stat .v[data-dir=up]{color:color-mix(in srgb,var(--hb-ink) 72%,#22c55e)}
.tprice .p[data-dir=dn],.stat .v[data-dir=dn]{color:color-mix(in srgb,var(--hb-ink) 72%,#ef4444)}
@media (prefers-reduced-motion:reduce){.tprice .p,.stat .v{transition:none}}
.seg.side button.on.buy{background:rgba(76,182,122,.16);color:#7FD4A2}.seg.side button.on.sell{background:rgba(224,106,92,.16);color:#F0968B}
.amts{display:flex;align-items:center;gap:5px}
.amts .chip{flex:1;min-width:0;justify-content:center;font-variant-numeric:tabular-nums}
.amts .solin{width:80px}
.sumline{display:flex;align-items:center;gap:6px;color:var(--hb-ink-3);font-size:11px;font-variant-numeric:tabular-nums}
.cta.sell{background:linear-gradient(180deg,#EB7C6F,var(--hb-sell));color:#fff}
.cta[aria-disabled=true]{opacity:.55;cursor:default;filter:none}
.slip{position:fixed;z-index:2147483647;width:250px;padding:10px;border-radius:10px;background:#141414;border:1px solid var(--hb-border-strong);box-shadow:0 12px 30px rgba(0,0,0,.5);display:flex;flex-direction:column;gap:8px;font:400 12px/1.3 ${SANS};color:var(--hb-ink)}
.slip[hidden]{display:none}
.slip .t{font:500 10px/1 ${SANS};letter-spacing:.14em;text-transform:uppercase;color:var(--hb-gold-text)}
.slip .row{display:flex;gap:5px;align-items:center}
.slip .chip{flex:1}
.slip .cus{position:relative;width:70px;flex:none}.slip .cus input{height:26px;padding:0 18px 0 8px;border-radius:8px}.slip .cus span{position:absolute;right:7px;top:50%;transform:translateY(-50%);color:var(--hb-ink-3);font-size:11px}
.slip .note{color:var(--hb-ink-3);font-size:10.5px}
.slip .pt{margin-top:4px;padding-top:9px;border-top:1px solid var(--hb-border)}
.slip .pt+.row .chip{font-size:11px;padding:0 3px}.slip .pt+.row .cus{width:86px}.slip .pt+.row .cus input{padding-right:30px}
.slip .perr{color:var(--hb-sell);font-size:11px}.slip .perr:empty{display:none}
.gearb{all:unset;cursor:pointer;color:var(--hb-ink-3);display:inline-flex;align-items:center;gap:4px;padding:3px 6px;border-radius:7px;font:500 11px/1 ${SANS};font-variant-numeric:tabular-nums}
.gearb:hover,.gearb[aria-expanded=true]{color:var(--hb-ink);background:var(--hb-control-hover)}.gearb svg{width:13px;height:13px}
.verify{display:block;text-align:center;color:var(--hb-ink-3);font-size:10.5px;line-height:1.2}
.loading{color:var(--hb-ink-3);font-size:11px;padding:20px 0;text-align:center}`;
