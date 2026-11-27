(() => {
  const KEY = "hb.tour";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const css = `
    .hb-shade{position:fixed;z-index:2147483646;background:rgba(8,7,6,.45);pointer-events:none}
    .hb-ring{position:fixed;z-index:2147483646;border:2px solid #ffc72c;border-radius:10px;box-shadow:0 0 0 4px rgba(255,199,44,.28);pointer-events:none}
    .hb-tip{position:fixed;z-index:2147483647;width:min(280px,calc(100vw - 24px));border:1px solid rgba(255,236,200,.18);border-radius:14px;background:#15130f;color:#f3eedf;box-shadow:0 16px 40px rgba(0,0,0,.5);padding:12px 12px 10px;font:12.5px/1.45 Inter,system-ui,sans-serif}
    .hb-tip header{display:flex;align-items:center;gap:8px}
    .hb-tip .kicker{margin:0;font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#ffc72c}
    .hb-tip h2{margin:1px 0 0;font-size:15px;line-height:1.25}
    .hb-tip p{margin:8px 0 0;color:#bdb4a0}
    .hb-tip .row{display:flex;align-items:center;gap:8px;margin-top:12px}
    .hb-tip .row span{flex:1;font-size:10px;letter-spacing:.08em;color:#958c79}
    .hb-tip button{height:30px;padding:0 10px;border-radius:8px;border:1px solid rgba(255,236,200,.18);background:transparent;color:#bdb4a0;font-size:12px}
    .hb-tip button.gold{background:#ffc72c;border-color:transparent;color:#1a1405;font-weight:600}
  `;

  function ui() {
    const style = document.createElement("style");
    style.textContent = css;
    document.documentElement.append(style);
    const shades = [0, 1, 2, 3].map(() => {
      const n = document.createElement("div");
      n.className = "hb-shade";
      document.documentElement.append(n);
      return n;
    });
    const tip = document.createElement("div");
    tip.className = "hb-tip";
    tip.innerHTML = `<header><div><p class="kicker" data-kicker></p><h2 data-title></h2></div></header><p data-body></p><div class="row"><span data-count></span><button type="button" data-skip>Skip</button><button type="button" class="gold" data-next>Next</button></div>`;
    const ring = document.createElement("div");
    ring.className = "hb-ring";
    document.documentElement.append(tip, ring);
    return { shades, tip, ring };
  }

  function panelOf(el) {
    const host = el.getRootNode()?.host;
    if (host?.hasAttribute("data-hb-drawer") || host?.hasAttribute("data-hb-ca-pop")) return host.getBoundingClientRect();
    return null;
  }

  function cut(shades, box) {
    const vw = innerWidth;
    const vh = innerHeight;
    const rects = [
      [0, 0, vw, box.t],
      [0, box.t, box.l, box.h],
      [box.l + box.w, box.t, Math.max(0, vw - box.l - box.w), box.h],
      [0, box.t + box.h, vw, Math.max(0, vh - box.t - box.h)],
    ];
    rects.forEach((n, i) => {
      const s = shades[i];
      s.style.left = n[0] + "px";
      s.style.top = n[1] + "px";
      s.style.width = n[2] + "px";
      s.style.height = n[3] + "px";
    });
  }

  function park(tip, hole) {
    const vw = innerWidth;
    const vh = innerHeight;
    const tw = Math.min(280, vw - 24);
    const th = tip.offsetHeight || 170;
    const gap = 16;
    const right = hole.right + gap;
    const left = hole.left - gap - tw;
    let x;
    let y;
    if (right + tw <= vw - 8) {
      x = right;
      y = Math.max(8, Math.min(hole.top, vh - th - 8));
    } else if (left >= 8) {
      x = left;
      y = Math.max(8, Math.min(hole.top, vh - th - 8));
    } else if (hole.bottom + gap + th <= vh - 8) {
      x = Math.max(8, Math.min(hole.left, vw - tw - 8));
      y = hole.bottom + gap;
    } else {
      x = Math.max(8, Math.min(hole.left, vw - tw - 8));
      y = Math.max(8, hole.top - gap - th);
    }
    tip.style.width = tw + "px";
    tip.style.left = x + "px";
    tip.style.top = y + "px";
  }

  function spotlight(shades, tip, ring, el) {
    if (!el) return;
    el.scrollIntoView({ block: "nearest", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const panel = panelOf(el);
    const hole = panel || r;
    const pad = 6;
    cut(shades, { t: Math.max(0, hole.top - pad), l: Math.max(0, hole.left - pad), w: hole.width + pad * 2, h: hole.height + pad * 2 });
    ring.style.left = Math.max(0, r.left - 3) + "px";
    ring.style.top = Math.max(0, r.top - 3) + "px";
    ring.style.width = r.width + 6 + "px";
    ring.style.height = r.height + 6 + "px";
    park(tip, hole);
  }

  function say(tip, kicker, title, body, count, nextLabel) {
    tip.querySelector("[data-kicker]").textContent = kicker;
    tip.querySelector("[data-title]").textContent = title;
    tip.querySelector("[data-body]").textContent = body;
    tip.querySelector("[data-count]").textContent = count;
    tip.querySelector("[data-next]").textContent = nextLabel;
  }

  function done() {
    chrome.storage.local.set({ [KEY]: "done" }).catch(() => {});
    document.querySelectorAll(".hb-shade,.hb-tip,.hb-ring").forEach((n) => n.remove());
  }

  async function find(sel, root, tries) {
    for (let i = 0; i < tries; i++) {
      const el = (root || document).querySelector(sel);
      if (el) return el;
      await wait(400);
    }
    return null;
  }

  async function walk(shades, tip, ring, root, parts, lastLabel) {
    const rows = parts.filter(([sel]) => root.querySelector(sel));
    for (let i = 0; i < rows.length; i++) {
      const [sel, kicker, title, body] = rows[i];
      say(tip, kicker, title, body, `${i + 1} / ${rows.length}`, i === rows.length - 1 ? lastLabel : "Next");
      spotlight(shades, tip, ring, root.querySelector(sel));
      await click(tip);
    }
  }

  function hideShade(shades, ring) {
    shades.forEach((n) => { n.style.width = "0"; n.style.height = "0"; });
    if (ring) { ring.style.width = "0"; ring.style.height = "0"; }
  }

  async function launchTour(shades, tip, ring, root) {
    const ready = await find(".names", root, 20);
    if (!ready) {
      hideShade(shades, ring);
      say(tip, "Launch", "Panel is open", "The form is still loading. Next tries again. The panel stays open.", "", "Again");
      await click(tip);
      return launchTour(shades, tip, ring, root);
    }
    await walk(shades, tip, ring, root, [
      [".wslot", "Wallet", "Who pays", "This is the wallet that funds the launch. The number is its SOL balance. Open it to switch wallets."],
      ["button.thumb", "Image", "Coin picture", "Upload the token image. It has to be a picture, 2 MB or smaller."],
      [".names", "Name", "Name and ticker", "Name is the full coin name, up to 32 characters. Ticker is the short symbol after the $, up to 10."],
      ["a[href*='/status/']", "Post", "The post this coin comes from", "The link is the X post Highbar is launching from. The name can be filled from that post."],
      ["[aria-label='Tier']", "Tier", "Standard, Higher, Max", "The tier is how much liquidity the coin migrates with. Higher tiers ask for more. Standard is the default."],
      ["[aria-label='Anti-sniper']", "Fee", "Anti-sniper", "On means the trading fee starts high and falls during the first minute, so a bot that buys the first block pays more."],
      ["[aria-label='Dev buy presets']", "Dev buy", "How much you buy at launch", "0 means you create the coin and do not buy it. 0.5, 1, and 2 spend that much SOL into your own coin. The gear edits the amounts."],
      [".quote", "Cost", "What you pay if dev buy is 0", "With no dev buy you still pay the network fee and a little rent. A dev buy adds that SOL on top."],
      ["[data-testid='hb-launch-costs']", "Extra", "Priority and the extra fee", "Priority helps the transaction land. The extra line is the fee added on top of the dev buy."],
      ["button.moreBtn", "More", "Description", "More opens an optional description for the coin."],
      ["[data-testid='hb-summary']", "Check", "Read this before you launch", "It repeats the dev buy, the tier, and whether anti-sniper is on. If any of those look wrong, change them above."],
      ["button.dpb", "Send", "The yellow Launch button", "This is the button that actually creates the coin and spends SOL. The tour's Next button does not press it."],
    ], "To the trade card");
  }

  async function pageTour(shades, tip, ring) {
    say(tip, "On X", "Looking for a post", "Waiting for a Buy chip or a Launch button on a post.", "", "Wait");
    const chip = await find("[data-hb-ca-host]", document, 40);
    const launch = document.querySelector('article [role="group"] > span[data-hb-host]');
    if (!chip && !launch) {
      say(tip, "On X", "Nothing on screen yet", "Scroll the results. Next looks again.", "", "Look again");
      tip.querySelector("[data-next]").onclick = () => pageTour(shades, tip, ring);
      return;
    }
    if (launch) {
      say(tip, "Launch", "Launch on the post", "This sits on the action row, before the bookmark. Next opens the launch panel and walks every row inside it. It will not create a coin.", "", "Open panel");
      spotlight(shades, tip, ring, launch);
      await click(tip);
      hideShade(shades, ring);
      if (typeof launch._open === "function") launch._open();
      const drawer = await find("[data-hb-drawer]", document, 20);
      if (drawer?._r) await launchTour(shades, tip, ring, drawer._r);
    }
    if (!chip) {
      done();
      return;
    }
    say(tip, "Buy", "The Buy chip", "This is the contract Highbar found on the post. Next opens the trade card and walks Buy, Sell, and the rest of it. A tap inside the card trades for real. Next does not.", "", "Open card");
    spotlight(shades, tip, ring, chip);
    await click(tip);
    await chrome.storage.local.set({ [KEY]: "popup" });
    if (typeof chip._open === "function") chip._open();
    const pop = await find("[data-hb-ca-pop]", document, 20);
    if (!pop?._r) {
      say(tip, "Card", "Click the Buy chip", "The tour continues on the card once it is open.", "", "Look again");
      tip.querySelector("[data-next]").onclick = () => pageTour(shades, tip, ring);
      return;
    }
    await cardTour(shades, tip, ring, pop._r);
  }

  async function cardTour(shades, tip, ring, root) {
    await walk(shades, tip, ring, root, [
      ["[data-testid='hb-ca-head']", "Card", "Token header", "Logo, name, and ticker. Confirm this is the coin you meant before anything else."],
      ["[data-testid='hb-ca-price']", "Price", "Price and move", "The live price and how it changed. Market cap, volume, and liquidity sit with it when the feed has them."],
      ["[data-testid='hb-ca-chart']", "Chart", "The chart", "Recent trades for this mint. It is there so you can see the move, not just the buttons."],
      ["[data-testid='hb-ca-quick-buy']", "Buy", "Buy in SOL", "Each button buys that much SOL right away, from every wallet checked for this card. Defaults are 0.1, 0.5, and 1."],
      ["[data-testid='hb-ca-quick-sell']", "Sell", "Sell a percent", "Each button sells that share of the balance. 25%, 50%, and 100% stay on screen with Buy. You do not switch tabs to see them."],
      ["[data-testid='hb-ca-preset-gear']", "Amounts", "The gear", "Edits the three buy amounts and the three sell percents together, then saves them on this device."],
      ["[data-testid='hb-ca-slip-btn']", "Slippage", "Slippage and priority", "Opens the slippage and priority fee for the next trade. It overrides what you saved in Settings, for this card only."],
      ["[data-testid='hb-ca-held-toggle']", "Holding", "Holding, history, profit", "Opens what this wallet holds, the trades this extension sent, and realized profit for the coin."],
    ], "Finish");
    done();
  }

  function click(tip) {
    return new Promise((resolve) => {
      const btn = tip.querySelector("[data-next]");
      const go = () => { btn.removeEventListener("click", go); resolve(); };
      btn.addEventListener("click", go);
    });
  }

  chrome.storage.local.get(KEY).then((v) => {
    if (v[KEY] !== "x" && v[KEY] !== "popup") return;
    const { shades, tip, ring } = ui();
    tip.querySelector("[data-skip]").onclick = done;
    const pop = document.querySelector("[data-hb-ca-pop]");
    if (v[KEY] === "popup" && pop?._r) cardTour(shades, tip, ring, pop._r);
    else pageTour(shades, tip, ring);
  }).catch(() => {});
})();
