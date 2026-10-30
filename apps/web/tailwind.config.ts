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
        "border-strong": "var(--hb-border-strong)",
        ink: { DEFAULT: "var(--hb-ink)", 2: "var(--hb-ink-2)", 3: "var(--hb-ink-3)" },
        "on-ink": "var(--hb-on-ink)",
        "hl-sub": "var(--hb-highlight-sub)",
        tier: { standard: "var(--hb-tier-standard)", higher: "var(--hb-tier-higher)", max: "var(--hb-tier-max)" },
        buy: "var(--hb-buy)",
        sell: "var(--hb-sell)",
        burn: "var(--hb-burn)",
        gold: { DEFAULT: "var(--hb-gold)", ink: "var(--hb-gold-ink)", text: "var(--hb-gold-text)", soft: "var(--hb-gold-soft)" },
        silver: "var(--hb-silver)",
        control: { DEFAULT: "var(--hb-control)", hover: "var(--hb-control-hover)" },
        "gold-line": "var(--hb-gold-line)",
        bronze: "var(--hb-bronze)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "Geist", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Geist Mono", "JetBrains Mono", "monospace"],
        display: ["var(--font-display)", "Cinzel", "Georgia", "serif"],
        serif: ["var(--font-serif)", "EB Garamond", "Georgia", "serif"],
      },
      fontSize: { kpi: ["40px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }] },
      borderRadius: { sm: "8px", DEFAULT: "12px", lg: "16px" },
      boxShadow: { card: "var(--hb-shadow)" },
      backgroundImage: { hatch: "var(--hb-hatch)" },
      spacing: { sidebar: "220px", header: "64px" },
    },
  },
  plugins: [],
};
export default config;