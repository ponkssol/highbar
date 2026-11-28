"use client";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

function apply(next: boolean) {
  document.documentElement.classList.toggle("dark", next);
  document.documentElement.dataset.theme = next ? "dark" : "light";
  try { localStorage.setItem("hb-theme", next ? "dark" : "light"); } catch {}
}

/** iconOnly: the topbar sun/moon control from the mockup. The labeled button remains for the unused mobile sheet. */
export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  const toggle = () => {
    const next = !document.documentElement.classList.contains("dark");
    setDark(next);
    apply(next);
  };
  if (iconOnly) {
    return (
      <button className="ghost ic" id="theme" type="button" aria-label="Toggle light and dark mode" title="Light / dark" onClick={toggle}>
        <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
        <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
      </button>
    );
  }
  return (
    <button onClick={toggle} aria-label="Toggle theme"
      className="mb-3 flex h-10 items-center gap-3 rounded px-3 text-sm text-ink-2 hover:bg-muted hover:text-ink">
      {dark ? <Sun size={20} strokeWidth={1.5} /> : <Moon size={20} strokeWidth={1.5} />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}