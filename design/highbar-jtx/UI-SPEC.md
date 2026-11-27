# Highbar UI Redesign: Full Specification (handoff for implementing agents)

## 0. FIDELITY RULE (read first, non-negotiable)

The result MUST look identical to the mockup `index.html`. The mockup is the source of truth, not this text and not your own taste.

1. Open the mockup in a browser and keep it beside the app while you work. Compare every page at 1440px, 900px and 390px, in dark AND light mode.
2. Copy CSS values (colors, sizes, spacing, radius, fonts, z-index) from the mockup. Never "improve", re-space, recolor, rename or restyle anything.
3. Do not swap components, icons, copy text, images or animations for something you consider better. If something looks wrong or impossible to build, STOP and ask the owner instead of deviating.
4. Do not add, remove or reorder sections, tabs, columns or sidebar items.
5. Port page by page. After each page, take screenshots of the app and of the mockup at the same width and compare them. Fix every visible difference before moving on.
6. Demo data may be replaced with real data, but layout, truncation, empty states and animations must stay the same.
7. A page is done only when the owner says it matches the mockup.

Status: design mockup only. No backend, no real data, no deploy.
Reference implementation: `index.html` in this folder (single file, plain HTML/CSS/JS, no build step) plus `img/`.
Live preview (owner-private artifact): https://claude.ai/artifact/Tt8aFSExCh8VFbouoDipBu

Product: **Highbar**, a Solana memecoin launchpad built on **Meteora** (Dynamic Bonding Curve, then DAMM v2 migration).
Style brief from the owner: copy the look and feel of jtx.com (dark palette, layout, components, fonts) but use Highbar yellow `#FFC72C` as the single accent. The shell is a SaaS dashboard: left sidebar, thin topbar, widget grid.

---

## 0. Rules for the implementing agent (read first)

The owner is worried agents will "go off the rails". Follow these rules.

1. **The mockup is the source of truth.** When this document and `index.html` disagree, open `index.html` and match it. Do not "improve" the design.
2. **Do not change copy, labels, numbers or section order** unless the task says so. Text in the mockup is intentional (including the sentence case and the `{01}` style indexes).
3. **Do not invent data, endpoints, addresses, prices, audit claims or legal text.** Everything in the mockup marked demo or sample must be replaced by real data from the existing app, or left clearly labeled as placeholder.
4. **Use only the design tokens in section 2.** No new colors, no gradients beyond those listed, no border radius (the design is square-cornered), no drop shadows except the mobile sidebar shadow.
5. **Yellow `#FFC72C` is the only accent.** Green and red are used only for buy/sell and positive/negative numbers. Purple `#9b8cff` is used only in the fee-flow chart for off-platform tips.
6. **Do not touch business logic.** In the existing repo, change presentation (markup, CSS, layout) only. Keep data fetching, wallet, trade, claim, launch and lock logic unchanged.
7. **Do not ship Concept features as if they work.** Private launch and Private send (sections 6.3 and 6.4) are UI concepts. They need a backend and a legal review. In production they must stay hidden or be clearly labeled "Soon" until real.
8. **Do not deploy, redeploy, change Railway, env vars or the database** as part of UI work.
9. **Respect `prefers-reduced-motion`.** Every animation listed here must be disabled when it is set.
10. **Verify visually.** Check each page at 1440, 1024, 768 and 390 px wide, in dark and light mode, before saying it is done. Say honestly what you did not check.
11. **Work in small steps.** Foundation first (tokens, shell), then one page at a time (see section 9).

---

## 1. Files and how the mockup works

| Item | Detail |
|---|---|
| `index.html` | Whole mockup. CSS in one `<style>`, JS in one `<script>` at the end. |
| `img/arena-bg-c.webp` | Hero and banner background (owner's brand image). |
| `img/welcome-hero.webp` | Secondary image used in guides and some cards. |
| `img/sidebar-logo.png` | Logo for dark mode. |
| `img/sidebar-logo-light.png` | Logo for light mode. |

Routing is hash based. Each page is `<main class="view" id="v-NAME">`. The `route()` function adds class `on` to the active view and updates the sidebar highlight, the topbar title and scrolls to top.

Routes: `#home`, `#token`, `#launch`, `#leaderboard`, `#locks`, `#portfolio`, `#rewards`, `#private`, `#open-book`, `#guides`, `#docs`, `#settings`.
The `#token` page highlights "Dashboard" in the sidebar. Unknown hashes fall back to `#home`.

In the real app (Next.js), map these to real routes (see section 10).

Fonts: the reference site uses Aeonik and JTXCommitMono, which cannot be embedded. The mockup uses **Geist** (sans) and **Geist Mono** (mono) from Google Fonts as stand-ins. If the owner has licenses for the originals, swap them in the `--sans` and `--mono` variables only.

---

## 2. Design tokens

### 2.1 Colors

Dark (default) values on `:root`:

| Token | Value | Use |
|---|---|---|
| `--bg` | `#101010` | page background |
| `--el` | `#1c1c1c` | cards, table bodies, inputs raised surface |
| `--sf` | `#303030` | bar track, subtle fills |
| `--inv` | `#f2f1ee` | inverse (light on dark) |
| `--tint` | `#d2d1c91a` | hover tint |
| `--d0` | `#0b0b0b` | deepest surface |
| `--d1` | `#0d0d0d` | sidebar background |
| `--d2` | `#141414` | ticker, inset surfaces |
| `--d3` | `#1f1f1f` | chart gridlines |
| `--hov` | `#242424` | row and item hover |
| `--selt` | `#1f1b0f` | selected sidebar item tint (warm) |
| `--gold1` | `#2a220a` | warm gradient start |
| `--tx` | `#f2f1ee` | primary text |
| `--tx2` | `#a7a79f` | secondary text |
| `--tx3` | `#85857a` | tertiary text, labels |
| `--bd-s` | `#222` | subtle border |
| `--bd` | `#3b3b36` | normal border |
| `--bd-x` | `#85857a` | strong border, icons |
| `--hair` | `#a7a79f4d` | hairline dividers between sections |
| `--y` | `#ffc72c` | accent (Highbar yellow) |
| `--y2` | `#ffd65e` | accent hover |
| `--yx` | `#ffc72c` | accent used as text |
| `--yt` | `#ffc72c1f` | accent tint |
| `--on-y` | `#1a1405` | text on yellow |
| `--pos` | `#70d6af` | positive / buy |
| `--neg` | `#e8695e` | negative / sell |
| `--bg-a/-c/-0/-9/-f` | `#101010` at e6 / cc / 00 / 99 / f2 alpha | translucent backgrounds |

Light theme overrides on `:root[data-theme=light]`:
`--bg #f2f1ee`, `--el #fbfaf7`, `--sf #dcdad0`, `--inv #101010`, `--tint #1010100d`, `--bd-s #e0ded4`, `--bd #cdcbc0`, `--bd-x #85857a`, `--hair #10101026`, `--tx #101010`, `--tx2 #474747`, `--tx3 #74746a`, `--yx #9a6a00` (darker yellow so text stays readable), `--yt #ffc72c33`, `--pos #17855f`, `--neg #c4382d`, `--d0 #ffffff`, `--d1 #f7f6f2`, `--d2 #ebe9e1`, `--d3 #dedcd2`, `--hov #e9e7de`, `--selt #fff3cf`, `--gold1 #fff0c0`.

Rules:
- The yellow fill `--y` stays `#ffc72c` in both themes. Yellow **text** must use `--yx`.
- SVG attributes use `var(--token)` so charts follow the theme.
- Never hard-code `#fff` or `#000` for UI surfaces. The only allowed hard-coded colors are the chart purple `#9b8cff`, chart gray `#8a8a8a` and the scrim `#000a`.
- A past bug to avoid: never define a token as `var(--itself)`. It produces an invalid value and a transparent background.

Theme: stored in `localStorage` key `hb-theme` (`light` or `dark`), applied as `data-theme` on `<html>`. A toggle sits in the topbar, and Settings has Light, Dark, System buttons.

### 2.2 Typography

| Role | Font | Size | Notes |
|---|---|---|---|
| Body | `--sans` | 16px / 1.5 | |
| Page title `.h1` | sans | `clamp(34px, 4.4vw, 60px)`, line-height 1.02, weight 400, letter-spacing -0.02em | second half of the title is wrapped in `<span>` colored `--tx3` |
| Section title `.h2` | sans | `clamp(30px, 3.6vw, 46px)`, line-height 1.05, weight 400 | same two-tone pattern |
| Eyebrow `.bul` | sans | 15px, `--tx2` | 8px yellow square before the text, bold word in `--tx` |
| Label `.lbl` | mono | 12px, uppercase, letter-spacing .04em, `--tx3` | |
| Numbers | mono | 14 to 40px | all numeric data is mono |
| Table body | sans 14px, numbers mono | | |

Titles use weight 400 only. Medium (500) is used only on yellow buttons.

### 2.3 Shape and surfaces

- **No border radius anywhere.**
- Borders are 1px. Cards: `--el` background with `--bd-s` border.
- **Corner brackets** (`.brk`): hero panels and some cards get 12px L-shaped corner marks in `--bd-x` via `::before`, `::after` and two child spans `.c1`, `.c2`. Keep them on: chart panels, tables with `.brk`, the preview card on Launch, empty states.
- Section dividers use `--hair`.
- Eyebrow squares and index labels (`{01}`, `{02}`) are a recurring motif. Keep them.

### 2.4 Layout constants

- App shell grid: `252px` sidebar + fluid main. Main is full width (no max-width container).
- Topbar height: `68px` (`--nav`), sticky, translucent with 10px blur.
- Horizontal page padding: `clamp(16px, 4vw, 56px)` for sections and page headers. Dashboard widget rows use `clamp(16px, 2.4vw, 32px)` so widgets line up.
- Vertical section padding: `clamp(40px, 6vw, 88px)`.
- Breakpoints used: 1400, 1200, 1100, 1000, 900 (sidebar becomes a drawer), 800, 700 (tables become cards), 600.

### 2.5 Motion

| Name | Spec |
|---|---|
| Hover | 0.15s transitions on borders and backgrounds |
| Sidebar drawer (mobile) | transform 0.2s |
| Hero curve dot | travels along the curve path in 7s loops, with a short yellow trail |
| Protocol activity | random demo event every 1.7s, count-up stats, gauge needle, sparkline draw-in |
| Price chart | a new point every 1.1s (demo) |
| Ticker | continuous horizontal scroll |
| Fee flow (Sankey) | dashed centerlines move, small particles travel along each ribbon |
| Private send | 4-step sequence over about 6s with particles on the route diagram |
| Private launch | 4-step checklist over about 5s |

All of these are disabled under `prefers-reduced-motion: reduce`.

---

## 3. App shell

### 3.1 Sidebar (`aside.sidenav`)

Desktop: sticky, full height, background `--d1`, right border `--hair`, no visible scrollbar.
Top: logo image (`sidebar-logo.png` in dark, `sidebar-logo-light.png` in light, height 30px).

Navigation groups (small mono labels, then items):

| Group | Items (route) |
|---|---|
| PLATFORM | Dashboard `#home`, Launch `#launch`, Leaderboard `#leaderboard`, Locks `#locks` |
| ACCOUNT | Portfolio `#portfolio`, Rewards `#rewards`, Private send `#private` (badge "New") |
| TRANSPARENCY | Open Book `#open-book` (badge "New"), Guides `#guides`, Docs `#docs` |
| SYSTEM | Settings `#settings` |

Item: 1.5px stroke square-cap icon 24px grid + label 14px `--tx2`. Active item: `--selt` background, yellow 2px left border, `--tx` text, yellow icon. Hover: `--hov`.
Badge "New": yellow fill, dark text, mono 11px.

Bottom (`.sbot`): a row with "BUILT ON" + Meteora logo on the left (an inline SVG symbol `#mlogo` using `currentColor`) and a 34px square **X (Twitter) icon button** on the right. The X link currently points to `https://x.com` as a placeholder. The owner must supply the real handle.

Mobile (≤900px): off-canvas drawer, 280px wide, max 86vw, full dynamic height, `z-index` above the topbar, opaque `--d1` background, shadow `0 0 40px #0008`. A scrim (`#000a`) covers the page. While open, page scroll is locked and the drawer does not scroll horizontally. Menu items are compacted so all items fit. Drawer closes on scrim tap and on item tap. Opened by the hamburger button in the topbar.

### 3.2 Topbar

Left: hamburger (mobile only), page title (text from a `TITLES` map). Right: search field (`Search coins and users…`, `Ctrl K` hint, hidden on mobile), theme toggle button, "Connect wallet" ghost button, "Launch token +" yellow button.
Mobile: the search and "Connect wallet" are hidden and "Launch token" collapses to just the `+` square.

### 3.3 Footer

Dashboard ends with a slim footer line.

---

## 4. Component catalog

| Component | Class | Spec |
|---|---|---|
| Button | `.btn` | Two joined squares: label box (`b`) + icon box (`i`, 40px). Height 40 (`.sm` = 34). Border `--bd-x`; hover `--tx` border + tint. |
| Primary button | `.btn.y` | Yellow fill, `--on-y` text, weight 500. |
| Ghost button | `.ghost` | 36px high, `--bd` border, 13px text. |
| Big action | `.go` | Full width, 52px, yellow, weight 500 (Buy, Launch, Send). |
| Tier chip | `.tier` | Mono 12px, 1px border. `Standard` = plain border. `Higher` = yellow border + yellow text. `Max` = yellow fill with dark text. |
| Chip | `.chip` | Mono 11px, yellow text, yellow 33% border. Used for "Soon", "Concept", "New". |
| Buy/Sell badge | `.badge.buy/.sell` | Mono 11px, green or red 12% fill with matching text. |
| Segmented control | `.seg` | Joined buttons, active = inverse fill. Scrolls horizontally on mobile, never wraps. |
| Underline tabs | `.ttabs` | Text tabs with 1px yellow bottom border on the active tab. Scroll horizontally on mobile. |
| Switch | `.sw` | 52×28, square knob, `aria-checked`; on = yellow knob and yellow border. |
| Input | `.inp` | 56px high, `--bd` border, `--bg` fill, mono value, unit at the right (SOL icon). |
| Progress bar | `.bar` | 2px, track `--sf`, fill `--y`. In tables `.prog .bar` is a 6px dashed-segment bar (5px on, 2px off). |
| Stat strip | `.strip` | Row of cells separated by `--bd-s`. Label (mono caps) + value (mono 18-20px). |
| Key-value list | `.kv` | Rows with label left, mono value right, hairline between. |
| Card grid | `.cards` | 1px gap grid on a `--bd-s` background, cells `--el`. |
| Callout | `.callout` | `--el` fill, 2px yellow left border, 14px `--tx2` text. |
| Empty row | `.empty-row` | Centered dim text inside a table row. |
| Solana icon | `.sol` | Real Solana logo as an inline SVG data URI, 0.9em, placed before SOL amounts. |
| Meteora badge | `.bom` | "BUILT ON" + Meteora logo, mono 11px caps. Appears in sidebar, Launch header, Migration card. |

### 4.1 Tables (`.tw`)

- `table-layout: fixed`, no horizontal scrollbars, ever.
- Column width helpers: `.w1` 72px, `.w2` 104px, `.w3` 128px, `.w4` 160px, `.w5` 200px. The flexible column (usually Token) takes the rest.
- Responsive hiding: `.h-md` hidden ≤1200px, `.h-sm` hidden ≤900px. Decide per column which can disappear. Exception: the Open Book All tokens table (`#ob-tokens`) is narrower than the viewport because of the sidebar, so it uses tighter column widths and hides `.h-sm` ≤1560px and `.h-md` ≤1280px. With `table-layout:fixed`, fixed column widths that exceed the container squeeze the flexible Token column to zero, so always check the sum of widths.
- Numbers are right-aligned (`.r`) and mono.
- Token cell: 36px square avatar (`.av`, two-letter fallback over generated art) + name (14px) + `$TICKER` (mono 12px, `--tx3`).
- ≤700px: each row becomes a card. A JS helper copies each header's text to a `data-l` attribute on the cell and the card shows `label: value` pairs.
- Row hover uses `--hov`.

### 4.2 Charts (drawn with plain SVG at real pixel size via `ResizeObserver`; always wrap the callback as `new ResizeObserver(()=>requestAnimationFrame(draw))`, otherwise the browser raises a "ResizeObserver loop completed with undelivered notifications" error overlay)

1. **Bonding curve** (Dashboard): power curve `y = t^2.1`, grid 8×8 in `--bd-s`, three tier markers (85 SOL Standard, 150 SOL Higher, 250 SOL Max) with dashed drop lines, the last one yellow. Labels `launch` and `DAMM v2 →`. Animated dot with trail.
2. **Price chart** (Token): line `#ffc72c` 1.5px, area gradient yellow 22% to 0, dashed last-price line, square last-point marker, right-side price axis (hidden <520px), x labels `Nov 24` to `Nov 27`. Demo series.
3. **Migration gauge** (Dashboard): semicircle gauge, needle, ticks, text `0%` and "0 of 21 tokens migrated". "Built on Meteora" badge top-right of the card, wraps under the title when narrow.
4. **Sparklines** (stat tiles): 1px yellow line, draw-in animation.
5. **Fee flow Sankey** (Open Book): see 6.9.

---

## 5. Data shown in the mockup (all demo unless stated)

Tiers (these are product facts from the existing site, keep them):

| Tier | Graduates at | Mcap at migration | Curve fee split (creator, platform, Meteora) | After migration |
|---|---|---|---|---|
| Standard | 85 SOL | ~420.75 SOL | 0.4%, 0.4%, 0.2% | 0.6%, 0.2%, 0.2% |
| Higher | 150 SOL | ~742.5 SOL | 0.5%, 0.3%, 0.2% | creator 0.65% |
| Max | 250 SOL | ~1,250 SOL | 0.6%, 0.2%, 0.2% | creator 0.7% |

Other facts shown: total curve fee 1%; anti-sniper fee starts 25% and decays to about 1% within 60 seconds when enabled; vanity mints end in "high"; dev tokens locked with Jupiter Lock; cashback 0.05% of volume, minimum payout 0.001 SOL; $HIGHER buyback and burn is "Soon" and $HIGHER "is not an investment".

Demo tokens: SCOOBY, KONGO, WHITE ($GLIDEN), BLOB, FBI, ABULL, GLAD, CCAT (dashboard table, 17 rows total on Open Book). Demo wallets look like `GMGN…knJK`, `EAJC…zzzz`.
The Open Book numbers were copied from the live site at the time (21 tokens, 41.24 SOL volume, 0.6103 fees, etc.). Treat them as sample data.

Token avatars: generated abstract art (SVG data URI background) with two letters on top. In production use the token image and fall back to letters.

---

## 6. Pages

Every page: `.frame` wrapper, a `.phead` header (eyebrow `.bul`, two-tone `.h1`, optional right-side controls), content sections separated by hairlines, a mono `.note` line at the bottom saying "Mockup only · …" (remove in production).

### 6.1 Dashboard `#home`
1. **Hero row** (`.dtop`, 1.7fr / 1fr): left the arena banner (image `arena-bg-c.webp`, dark gradient overlay, mono eyebrow "Meteora launchpad on Solana", h2 "Rise above the bar.", one-line subtitle, buttons "Launch token +" and "See the champions →"). Right the **Bonding curve** card (label "Bonding curve", chip "Demo").
2. **Quick actions** (`.qa`, 5 columns, 3 at ≤1400, 2 at ≤700): Launch a token, Claim creator fees, Check cashback, Open Book, and a dashed **Module slot** ("+ Add your next feature", reserved for future modules; keep it).
3. **Private launch banner** (`.pbn`): label "New · Private launch", heading "Launch without carrying your wallet.", one line of copy, buttons "Launch privately →" (goes to Launch with Private mode selected) and "Private send →". Concept feature, see section 8.
4. **Protocol activity** (`.pa`): four cells: counters (Launches, Burns, Migrations, Trades) with a activity grid of 210 cells (30 columns × 7 rows, 21 columns on phones ≤600px; always keep the cell count a multiple of the column count so rows end flush; prefilled at load, counters match the prefill) and legend; live feed list (BUY/SELL/BURN/LAUNCH rows, newest on top, fade at the bottom); Migration gauge; 2×2 stat tiles (Total volume, Fees to creators, $HIGHER burned = "Soon", Active traders 24h) with sparklines.
5. **Ticker** strip: `$TICKER ±x.x%` repeating, green/red/gray.
6. **New tokens** section: filter segments (All 17, Bonding 17, Almost there 0, Migrated 0) and the token table (Token, Tier, Market cap, Bonding progress with dashed bar, Vol 24h, Age, Creator, Buy button).
7. **Features** list: numbered `{01}` to `{06}` rows (Meteora DBC → DAMM v2, Three tiers, Anti-sniper fee, Dev Lock, Private launch (chip New), $HIGHER buyback and burn (chip Soon)).
8. **Guides** teaser: 4 numbered links and an "All guides →" button.
9. Slim footer.

### 6.2 Token `#token`
- Cover image strip, breadcrumb "← All tokens", avatar, name + `$TICKER`, tier chip, `HB 11`, short mint address with copy glyph, big price (mono, with subscript zeros like `0.0₇2735`) and 24h change.
- Stat strip (6 cells): Market cap, Volume 24h, Holders, Age, Creator, Bonding.
- Two columns: chart (timeframe buttons 1m 5m 15m 1h 4h 1d; chart in a `.brk` panel) and the trade panel (Buy/Sell toggle, amount input in SOL, quick amounts 0.1 0.5 1 Max, summary rows Slippage / Est. received / Price impact / Fee (1.00%), big "Buy $TICKER" button, bonding progress block "Graduates to DAMM v2 at 85 SOL").
- Tabs under the chart: **Trades** (table: Time, Type badge, SOL, token amount, Wallet), **Holders** (rank, wallet, % supply, tokens, tag), **Score** (score 0-100 card + checks list Pass/Warn/Pending), **Fees** (fees paid, creator/platform/Meteora split, claimable), **Dev lock** (amount, type, date, provider, lock account), **Open Book** (reconciliation summary + link), **Info** (description + key facts). All sample content.
- Trade panel sticks on desktop; on mobile it stacks below the chart.

### 6.3 Launch `#launch`
Header: eyebrow "Launch a token", title "Set your bar, then launch.", mono label "Block 0 dev buy", Meteora badge.
**Mode switch** directly under the header: two cards, "Public launch" (default) and "Private launch" [New]. Selecting Private shows a 3-step explainer panel (Fund privately, Launch from it, Claim to stealth) with a button "Open Private send", switches all three privacy toggles on, changes the preview Creator row to "Hidden", and renames the submit button to "Launch privately".
Two columns: form (left) and live preview (right, sticky).
Form sections, numbered:
- `{01}` **Identity**: Name (max 32 bytes, live counter), Ticker (max 10 bytes, uppercase letters and digits only), image drop zone (PNG, JPG, WEBP or GIF up to 2 MB), Description, Website, Twitter, Telegram.
- `{02}` **Tier**: three selectable cards (Standard 85, Higher 150, Max 250 SOL) showing Mcap at migration, Creator fee, After migration. Note: "Max is open to every creator until $HIGHER launches."
- `{03}` **Protection**: Anti-sniper switch (off by default, helper text changes with state), optional Dev buy in SOL (bought in Block 0).
- `{04}` **Privacy** (chip "Concept"): switches Hide creator wallet, Pay launch costs privately (links to Private send), Stealth fee claims, plus a Privacy level meter (Public, Partial, Strong, Maximum).
- `{05}` **Fees**: key-value summary (Curve fee, Creator/platform/Meteora split, After migration, Migration fee, Anti-sniper, Migrates at) and the Launch button.
Preview card: image, name, ticker, description, bonding bar, tier chip, mcap, Creator row, plus a 4-step run list that animates on private submit. Below: "Before you launch" guide links.

### 6.4 Private send `#private` (concept)
Header: "Send SOL. Leave no trail." with chip "Concept". Stats strip (Anonymity set, Shielded now, Avg. delay, Privacy fee 0.30%). Two columns: form (Amount with quick values, Recipient, Delay: Instant / ~15 min / ~1 hour / Random, Split into parts switch, Summary with computed fee 0.30% + network fee and a "Send privately" button) and a Route card (SVG diagram You → Shielded pool → Recipient with 3 split paths, plus the 4-step list: Deposit, Mix, Split, Withdraw). Submit plays the animation and shows "Sent privately" with a fake tx. Below: three use-case cards (Fund a launch wallet, Claim fees privately, Private cashback). All values are fake.

### 6.5 Leaderboard `#leaderboard`
Header with two segmented controls (Volume / Mcap / Progress and 24h / 7d / This week / All) that re-sort. Underline tabs: Tokens, highbar Creators, Traders, Migrations, Survivors, each with its own table. The Tokens tab shows a 3-card podium (rank in roman numerals I, II, III, tier chip, token, Volume, Mcap) then a ranked table. Footer note "Weeks run Monday to Sunday, UTC."

### 6.6 Locks `#locks`
Title "Locked in public. Unlocks on the record." Strip: Active locks, Avg % of supply, Next unlock, Permanent. Filter segments All / Vesting / Permanent / Unlocked. Table: Token, Amount, % supply, Locked date, Unlocks, Vesting progress bar, Creator, "View lock ↗".

### 6.7 Portfolio `#portfolio`
Header shows the (placeholder) wallet address with a copy glyph, and segments Overview / Claim fees. Five stat tiles (SOL balance, Holdings value, Tokens created, Creator fees est. in yellow, Cashback). Overview: Holdings table and Created tokens table side by side, then Recent trades. Claim fees tab: per-token claim table with "Claim" and "Claim all". Empty states (when real data is empty) use the `.empty.brk` panel with a line-art icon, heading, one sentence and a button.

### 6.8 Rewards `#rewards`
Title "Trade, refer, climb. Get paid back." Tabs: Cashback (big "0.05%" card + lookup card with wallet input), Referral (Soon, link field, how-it-works steps, counters), Milestones (4 rows, Soon), $HIGHER perks (Soon, planned perks list), Burn (history table, empty). Placeholder copy is marked on the page.

### 6.9 Open Book `#open-book`
Title "Every fee, reconciled against chain." Header shows "Indexed to slot … · synced …" and a period selector (All time, 30d, 7d, 24h). Underline tabs scroll to sections (Overview, Treasury, Fee flow, All tokens, Methodology). Sections:
1. **Overview**: 6 cards in a grid (Tokens launched, Total volume, Total fees paid, DBC fees, Creators earned, Tips paid by traders). 2 columns on mobile.
2. **Treasury wallets**: 4 wallet cards (name, short address, SOL balance, "exact" tag, wrapped SOL, net change 24h, read at slot).
3. **Fee flow** (Sankey): four columns **Paid by → Fee type → Recipient → Platform use**. Values: Traders 0.6103; DBC fees 0.4145, Tips to providers 0.1254, Network base and priority 0.0704; recipients Meteora protocol 0.0829 (20.0%), Creators 0.2107 (50.8%), Platform 0.1209 (29.2%), Helius Sender 0.0411, Lunar Lander 0.0300, Unknown tip account 0.0298, Others 0.0246, Validators 0.0700, Burned base fee 0.0004; platform use Buyback and burn 40%, Operations 50%, Treasury 10%. Ribbon thickness is proportional to value, color by target type (yellow DBC, purple off-platform, gray network). Nodes are boxes with name left and value right, a 3px colored left bar, min height 26px. On narrow screens the SVG keeps a minimum width of 820px and scrolls horizontally with a "Swipe" hint. Legend: On-platform (DBC), Off-platform (block engines), Network, derived. Callout: "Buyback and burn: Soon…"
4. **Platform use, closed periods** and **Fee claims**: two metric grids (6 and 5 cells).
5. **All tokens**: 17 rows, columns include Token, Tier, volume, fees, creator share, sniper share of tips, status, open link, with All / Bonding / Migrated filter.
6. **Methodology**: short paragraphs.

### 6.10 Guides `#guides`
Search field, category tabs (All, Safety, Launching, Trading), a featured card (text + image) and a 3-column grid of cards (16:9 thumbnail using the brand images, tier-style category chip on the image, date in mono, title, "Read guide →"). 2 columns ≤1200px, 1 column ≤600px.

### 6.11 Docs `#docs`
Three columns: left nav (sticky), content, right "On this page" TOC (hidden ≤1200px; nav becomes wrapped chips ≤800px). Sections: Overview, Launch, Curve and tiers, Fees, Anti-sniper, Dev lock, Private launch, Migration, Rewards and $HIGHER, API. The API sample is a clearly marked placeholder. Steps lists use numbered squares drawn with CSS counters.

### 6.12 Settings `#settings`
Tabs Preferences / About. Preferences rows (label + description left, control right): Theme (Light/Dark/System, works), Default slippage (0.5%, 1%, 2%, 5%, Custom), Priority fee (None/Low/High), Explorer (Solscan, Solana Explorer, SolanaFM), Network (Solana Mainnet, with live dot), Hide balances (blurs balances), Mask wallet address, Default claim address (Main wallet / New each time), Reset. About: version, Built on Meteora, links to Open Book and Docs, terms placeholder.

---

## 7. Interactions summary

- Hash routing and sidebar highlight (section 1).
- Theme toggle persists.
- Segmented controls toggle the `on` class inside their group; many also re-render content (leaderboard sorts, locks filter, guides categories).
- Tables rendered by JS from arrays; the real app should render from API data with the same markup.
- Live demo behaviors (feed, ticker, price chart) must be replaced by real data or removed in production. The "Demo" chip tells users it is sample data. Do not leave random-number generators in production.
- Keyboard: search field shows `Ctrl K` (the shortcut itself is not implemented in the mockup).
- Accessibility: buttons have `aria-label` where icon-only, switches use `role=switch` and `aria-checked`, charts have `aria-label`, focus styles must stay visible.

---

## 8. Concept features (UI only, need backend and review)

**Private launch** and **Private send** exist to show a product direction (privacy features similar to rings.run). The mockup shows intended UX only.

What a real version would need (estimates, not verified against the Highbar codebase):
1. One-time creator wallet per launch (fresh keypair).
2. A relayer that pays transaction fees so the owner's wallet is not the signer.
3. Private funding of that wallet. This is the hard part. Without a shielded-pool style mechanism, funds remain traceable on-chain. Evaluate existing third-party privacy protocols on Solana (check which are active and audited before choosing).
4. Stealth claim addresses for creator fees (check whether the Meteora DBC SDK allows a fee-claimer address separate from the creator).
5. Do not store a mapping between user and launch unless unavoidable. If stored, say so.
6. Anti-abuse: keep Dev lock mandatory and keep token scores public.
7. Legal and compliance review. Services that obscure fund origin have faced sanctions in some jurisdictions.

Until those exist, hide these features in production or label them "Soon". The honest label for a version without real mixing is "hides your wallet, not a full mixer".

---

## 9. Implementation plan for the existing Next.js repo

The old UI lives in `apps/web` (Next.js app router, Tailwind). Mapping (seen from the file list, verify before editing):

| Mockup | Existing file(s) |
|---|---|
| Tokens, dark/light | `app/globals.css`, `tailwind.config.ts` |
| Sidebar | `components/Sidebar.tsx`, `components/nav.ts` |
| Topbar | `components/TopBar.tsx`, `components/MobileHeader.tsx`, `components/BottomNav.tsx` |
| Shell | `components/PageShell.tsx`, `app/layout.tsx` |
| Theme | `components/ThemeToggle.tsx` |
| Dashboard | `components/HomeView.tsx`, `HomeIntro.tsx`, `TokenTable.tsx`, `ActivityGrid.tsx`, `StatsPanel.tsx` |
| Token page | `components/TokenView.tsx`, `TradePanel.tsx`, `PriceChart.tsx`, `ScoreCard.tsx`, `FeeBreakdown.tsx`, `DevLock.tsx` |
| Launch | `app/launch/page.tsx` |
| Leaderboard / Locks | `app/leaderboard/page.tsx`, `app/locks/page.tsx` |
| Portfolio / Rewards / Settings | `components/sections/*`, `app/portfolio`, `app/rewards`, `app/settings` |
| Open Book | `components/openbook/*` |
| Guides / Docs | `components/seo/*`, `app/docs/page.tsx`, `components/docs/*` |

Order of work (each step is its own task, verify, then continue):
1. **Foundation**: port the tokens (section 2) into `globals.css` and the Tailwind config; add the light theme and the `hb-theme` toggle; load fonts.
2. **Shell**: sidebar, topbar, mobile drawer, footer. Keep existing routes and wallet button logic.
3. **Dashboard** (hero, quick actions, activity, table).
4. **Token page**, then **Launch**.
5. Leaderboard, Locks, Portfolio, Rewards, Settings.
6. Open Book (Sankey is a custom SVG component; data from the existing Open Book API).
7. Guides and Docs.
8. Concept features only after the backend decisions in section 8.

Per step: change presentation only, keep props and data flow, run the existing type check, lint and build, then check the page in both themes and at 390 px.

---

## 10. Known placeholders and open items

- X (Twitter) link in the sidebar is `https://x.com`. Replace with the real handle.
- Fonts are stand-ins (Geist).
- All numbers, wallets and tokens are demo data.
- Docs API sample is a placeholder.
- Referral, Milestones, $HIGHER perks and Burn history content is placeholder copy.
- Keyboard shortcut `Ctrl K` for search is not wired.
- Mobile was checked visually on: Dashboard, Open Book, Token, Leaderboard, Private send, Docs, Launch and the sidebar drawer. Portfolio, Rewards, Locks and Settings were not re-checked at phone width after the last spacing changes.

---

## 11. Acceptance checklist

- [ ] Tokens match section 2 in both themes. No hard-coded colors outside the allowed list.
- [ ] No border radius, no extra shadows.
- [ ] Sidebar, topbar, drawer behave as in section 3.
- [ ] Tables: no horizontal scroll at any width, cards at ≤700px.
- [ ] Every page checked at 1440, 1024, 768 and 390 px.
- [ ] Light and dark both readable (yellow text uses `--yx`).
- [ ] `prefers-reduced-motion` disables all animation.
- [ ] No demo randomness or "Mockup only" notes left in production pages.
- [ ] Concept features hidden or labeled "Soon".
- [ ] Existing business logic, routes, API calls and env config untouched.
