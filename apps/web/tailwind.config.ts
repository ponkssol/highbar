import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--hb-bg)",
        surface: "var(--hb-surface)",
        muted: "var(--hb-surface-muted)",
        border: "var(--hb-border)",
        "border-subtle": "var(--hb-border-subtle)",
        panel: "var(--hb-panel)",
        raised: "var(--hb-raised)",
        "border-strong": "var(--hb-border-strong)",
        ink: { DEFAULT: "var(--hb-ink)", 2: "var(--hb-ink-2)", 3: "var(--hb-ink-3)" },
        "on-ink": "var(--hb-on-ink)",
        "hl-sub": "var(--hb-highlight-sub)",
        tier: { standard: "var(--hb-tier-standard)", higher: "var(--hb-tier-higher)", max: "var(--hb-tier-max)" },
        buy: { DEFAULT: "var(--hb-buy)", fill: "var(--hb-buy-fill)", soft: "var(--hb-buy-soft)" },
        sell: { DEFAULT: "var(--hb-sell)", fill: "var(--hb-sell-fill)", soft: "var(--hb-sell-soft)" },
        burn: "var(--hb-burn)",
        seg: { DEFAULT: "var(--hb-seg)", line: "var(--hb-seg-line)", on: "var(--hb-seg-on)", "on-ink": "var(--hb-seg-on-ink)" },
        gold: { DEFAULT: "var(--hb-gold)", ink: "var(--hb-gold-ink)", text: "var(--hb-gold-text)", soft: "var(--hb-gold-soft)" },
        silver: "var(--hb-silver)",
        control: { DEFAULT: "var(--hb-control)", hover: "var(--hb-control-hover)" },
        "gold-line": "var(--hb-gold-line)",
        bronze: "var(--hb-bronze)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "ui-monospace", "monospace"],
        // Former arena faces (Cinzel, EB Garamond) now resolve to Geist, so existing font-display / font-serif classes read in the one sans.
        display: ["var(--font-sans)", "Geist", "system-ui", "sans-serif"],
        serif: ["var(--font-sans)", "Geist", "system-ui", "sans-serif"],
      },
      fontSize: { kpi: ["40px", { lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "300" }] },
      // Square corners everywhere (JTX look). rounded-full stays for dots, avatars and token logos.
      borderRadius: { sm: "0", DEFAULT: "0", md: "0", lg: "0", xl: "0", "2xl": "0", "3xl": "0" },
      boxShadow: { card: "var(--hb-shadow)" },
      backgroundImage: { hatch: "var(--hb-hatch)" },
      spacing: { sidebar: "220px", header: "64px" },
    },
  },
  plugins: [],
};
export default config;