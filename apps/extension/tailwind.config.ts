import type { Config } from "tailwindcss";
import web from "../web/tailwind.config";

/** highbar's own Tailwind theme (apps/web), pointed at the extension's sources and its bundled fonts. */
const config: Config = {
  ...web,
  content: ["./src/ui/**/*.{ts,tsx,html}", "./src/static/*.html"],
  theme: {
    ...web.theme,
    extend: {
      ...web.theme?.extend,
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        display: ["Cinzel", "Georgia", "serif"],
      },
    },
  },
};
export default config;
