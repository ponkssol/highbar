(() => {
  const KEY = "hb.tour";
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  const steps = [
    {
      kicker: "1 · Panel",
      title: "This tour uses the real buttons",
      body: "We'll walk the side panel, then open X on a live post that has a Solana contract and open the trade card from there.",
    },
    {
      sel: '[data-testid="header-wallet"]',
      kicker: "2 · Wallet",
      title: "This address pays for trades",
      body: "Copy it and send SOL before you buy. Network fees come out of the same balance.",
    },
    {
      prep: () => showTab("wallet"),
      sel: '[data-testid="add-wallet"], [data-testid="wallet-list"]',
      kicker: "3 · Wallets",
      title: "Create or import here",
      body: "The Wallets tab is open. New wallet or import. Write the recovery phrase on paper. There is no password and no cloud backup.",
    },
    {
      prep: () => showTab("trade"),
      sel: '[data-testid="hb-ca-input"]',
      kicker: "4 · Trade",
      title: "Paste a contract in the panel",
      body: "This box is the panel way to trade. Paste a mint or a pump.fun link, then use the buy and sell row under it.",
    },
    {
      prep: () => showSettings(true),
      sel: '[data-testid="hb-nav-settings"]',
      kicker: "5 · Settings",
      title: "The gear is Settings",
      body: "It's open now. Slippage, priority fee, sound, and the RPC all live on this screen.",
    },
    {
      prep: () => showSettings(true),
      sel: '[data-testid="rpc-input"]',
      kicker: "6 · RPC",
      title: "Put your mainnet RPC here",
      body: "Paste an https Solana mainnet URL if the default is slow. Leave it empty to keep the built-in mainnet RPC. It must be mainnet, not devnet.",
    },
    {
      prep: () => showSettings(true),
      sel: '[data-testid="rpc-save"]',
      kicker: "7 · Save",
      title: "Save checks that the RPC answers",
      body: "Highbar asks the URL for a recent block before it sticks. If it fails, the default stays.",
    },
    {
      prep: () => showSettings(true),
      sel: '[data-testid="hb-priority"]',
      kicker: "8 · Fee",
      title: "Priority fee sits under the RPC",
      body: "This is what you pay validators so a buy or sell lands faster. The trade card can override it per click.",
    },
    {
      kicker: "9 · X",
      title: "Next we open X",
      body: "The next step opens a live search. On the post it opens the Launch panel and explains every row, then opens the Buy card and does the same. Next never presses Launch or Buy.",
      openX: true,
    },
  ];

  let step = 0;
  let shades = [];
  let tip = null;

  function store() {
    return globalThis.chrome?.storage?.local;
  }

  async function showTab(id) {
    await showSettings(false);
    const btn = document.querySelector(`[data-testid="hb-nav-${id}"]`);
    if (btn && btn.getAttribute("aria-selected") !== "true") btn.click();
    await wait(320);
  }

  async function showSettings(on) {
    const btn = document.querySelector('[data-testid="hb-nav-settings"]');
    if (!btn) return;
    const pressed = btn.getAttribute("aria-pressed") === "true";
    if (pressed !== on) btn.click();
    await wait(320);
  }

  function target() {
    const sel = steps[step].sel;
    if (!sel) return null;
    return document.querySelector(sel);
  }

  function place() {
    const el = target();
    const pad = 6;
    if (!el) {
      shades.forEach((n) => { n.hidden = true; });
      tip.style.left = "12px";
      tip.style.top = "72px";
      return;
    }
    el.scrollIntoView({ block: "center", inline: "nearest" });
    const r = el.getBoundingClientRect();
    const box = {
      t: Math.max(0, r.top - pad),
      l: Math.max(0, r.left - pad),
      w: Math.min(innerWidth, r.width + pad * 2),
      h: r.height + pad * 2,
    };
    const vw = innerWidth;
    const vh = innerHeight;
    const rects = [
      [0, 0, vw, box.t],
      [0, box.t, box.l, box.h],
      [box.l + box.w, box.t, vw - (box.l + box.w), box.h],
      [0, box.t + box.h, vw, vh - (box.t + box.h)],
    ];
    rects.forEach((n, i) => {
      const s = shades[i];
      s.hidden = false;
      s.style.left = n[0] + "px";
      s.style.top = n[1] + "px";
      s.style.width = Math.max(0, n[2]) + "px";
      s.style.height = Math.max(0, n[3]) + "px";
    });
    const below = box.t + box.h + 12;
    const tipH = 210;
    tip.style.left = Math.max(8, Math.min(box.l, vw - 328)) + "px";
    tip.style.top = (below + tipH < vh ? below : Math.max(8, box.t - tipH - 8)) + "px";
  }

  function paint() {
    const s = steps[step];
    tip.querySelector("[data-kicker]").textContent = s.kicker;
    tip.querySelector("[data-title]").textContent = s.title;
    tip.querySelector("[data-body]").textContent = s.sel && !target()
      ? "That row has not loaded. Next tries this screen again instead of skipping it."
      : s.body;
    tip.querySelector("[data-count]").textContent = `${step + 1} / ${steps.length}`;
    tip.querySelector("[data-back]").disabled = step === 0;
    const next = tip.querySelector("[data-next]");
    next.textContent = s.openX ? "Open X" : step === steps.length - 1 ? "Done" : "Next";
    place();
  }

  async function go(i) {
    step = i;
    tip.hidden = false;
    shades.forEach((n) => { n.hidden = true; });
    const s = steps[step];
    tip.querySelector("[data-kicker]").textContent = s.kicker;
    tip.querySelector("[data-title]").textContent = s.title;
    tip.querySelector("[data-body]").textContent = s.sel ? "Opening this screen. The form stays put once it loads." : s.body;
    if (s.prep) await s.prep();
    for (let n = 0; s.sel && !target() && n < 24; n++) await wait(250);
    if (s.sel && !target() && String(s.sel).includes("rpc") || s.sel && !target() && String(s.sel).includes("priority")) {
      await showSettings(false);
      await showSettings(true);
      for (let n = 0; !target() && n < 24; n++) await wait(250);
    }
    paint();
  }

  function stop(mark) {
    tip.hidden = true;
    shades.forEach((n) => { n.hidden = true; });
    if (mark) store()?.set({ [KEY]: "done" }).catch(() => {});
  }

  async function openX() {
    await store()?.set({ [KEY]: "x" });
    stop(false);
    const url = "https://x.com/search?q=pump.fun%20CA&src=typed_query&f=live";
    if (chrome.tabs?.create) chrome.tabs.create({ url });
    else window.open(url, "_blank");
  }

  function mount() {
    shades = [0, 1, 2, 3].map(() => {
      const n = document.createElement("div");
      n.className = "hb-shade";
      n.hidden = true;
      document.body.append(n);
      return n;
    });
    tip = document.createElement("div");
    tip.className = "hb-tip";
    tip.hidden = true;
    tip.setAttribute("role", "dialog");
    tip.innerHTML = `
      <header>
        <img src="icons/icon-128.png" alt="" />
        <div>
          <p class="kicker" data-kicker></p>
          <h2 data-title></h2>
        </div>
      </header>
      <p data-body></p>
      <div class="row">
        <span data-count></span>
        <button type="button" data-skip>Skip</button>
        <button type="button" data-back>Back</button>
        <button type="button" class="gold" data-next>Next</button>
      </div>`;
    document.body.append(tip);
    tip.querySelector("[data-skip]").onclick = () => stop(true);
    tip.querySelector("[data-back]").onclick = () => { if (step > 0) go(step - 1); };
    tip.querySelector("[data-next]").onclick = () => {
      if (steps[step].sel && !target()) { go(step); return; }
      if (steps[step].openX) { openX(); return; }
      if (step < steps.length - 1) go(step + 1);
      else stop(true);
    };
    addEventListener("resize", () => { if (!tip.hidden) place(); });
    document.addEventListener("scroll", () => { if (!tip.hidden) place(); }, true);
  }

  function guideButton() {
    const settings = document.querySelector('[data-testid="hb-nav-settings"]');
    if (!settings || settings.previousElementSibling?.dataset.guide === "1") return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.guide = "1";
    btn.setAttribute("aria-label", "Tour");
    btn.title = "Tour";
    btn.className = "grid h-8 w-8 shrink-0 place-items-center rounded-[8px] border border-border text-ink-3 hover:bg-control-hover hover:text-ink";
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.6 3.1h4.1c.8 0 1.3.4 1.3 1v8.4c0-.6-.5-.9-1.3-.9H2.6V3.1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M13.4 3.1H9.3c-.8 0-1.3.4-1.3 1v8.4c0-.6.5-.9 1.3-.9h4.1V3.1Z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>';
    btn.onclick = () => { store()?.set({ [KEY]: "panel" }); go(0); };
    settings.before(btn);
  }

  mount();
  guideButton();
  new MutationObserver(guideButton).observe(document.body, { childList: true, subtree: true });
  const local = store();
  if (!local) { go(0); return; }
  local.get(KEY).then((v) => {
    const state = v[KEY];
    if (state === "done" || state === "x" || state === "popup") return;
    go(0);
  }).catch(() => go(0));
})();
