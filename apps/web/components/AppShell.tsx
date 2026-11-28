"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { prefetchSearch } from "./search/SearchLauncher";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { WalletButton } from "./WalletButton";

/** Topbar titles from the mockup. Routes the mockup does not name keep the page's own heading. */
function titleFor(path: string) {
  if (path.startsWith("/token")) return "Token";
  if (path.startsWith("/launch")) return "Launch a token";
  if (path.startsWith("/leaderboard")) return "Leaderboard";
  if (path.startsWith("/locks/")) return "Dev token lock";
  if (path.startsWith("/locks")) return "Dev token locks";
  if (path.startsWith("/portfolio")) return "Portfolio";
  if (path.startsWith("/rewards")) return "Rewards";
  if (path.startsWith("/open-book")) return "Open Book";
  if (path.startsWith("/articles")) return "Guides";
  if (path.startsWith("/docs")) return "Documentation";
  if (path.startsWith("/settings")) return "Settings";
  if (path.startsWith("/terms")) return "Terms and Conditions";
  if (path.startsWith("/privacy")) return "Privacy Policy";
  if (path === "/") return "Dashboard";
  return "highbar";
}

/** App shell: 252px sidebar, 68px topbar, drawer at <=900px. Page bodies render as children. */
export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    const root = document.documentElement;
    root.style.overflow = open ? "hidden" : "";
    document.body.style.overflow = open ? "hidden" : "";
    return () => { root.style.overflow = ""; document.body.style.overflow = ""; };
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const onResize = () => { if (window.innerWidth > 900) setOpen(false); };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("resize", onResize); };
  }, []);

  return (
    <div className="app">
      <div className={`scrim${open ? " on" : ""}`} onClick={close} />
      <Sidebar open={open} onNavigate={close} />
      <div className="main">
        <header className="topbar" data-testid="topbar">
          <button className="ghost ic mb" id="menu" type="button" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div className="tbt" id="tbt">{titleFor(path)}</div>
          <button type="button" className="tbs" data-hb-search aria-haspopup="dialog" aria-label="Search" onClick={() => window.dispatchEvent(new Event("hb-search"))} onPointerEnter={prefetchSearch} onFocus={prefetchSearch}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></svg>
            <span>Search coins and users…</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="tbr">
            <ThemeToggle iconOnly />
            <WalletButton shell />
            <Link href="/launch" className="btn y sm"><b>Launch token</b><i>+</i></Link>
          </div>
        </header>
        <div className="shell-body">{children}</div>
      </div>
    </div>
  );
}
