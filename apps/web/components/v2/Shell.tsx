"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { PROJECT_LINKS } from "@/lib/links";
import { useSettings, type Theme } from "@/lib/settings";
import { SECTION_TITLE, canonicalPath, classicHref, isAppRoute, sectionOf, uiHref } from "@/lib/uiVersion";
import { useHbWallet, useWalletModal } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";
import { useRouter } from "next/navigation";
import { SearchLauncher, prefetchSearch } from "@/components/search/SearchLauncher";
import { MeteoraMark, MeteoraSymbol } from "./mlogo";
import { NAV } from "./nav";
import { SiteOverlays } from "@/components/SiteOverlays";
import "./jtx.css";

function resolved(theme: Theme): "light" | "dark" {
  if (theme === "system") return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  return theme;
}

function SearchField() {
  return (
    <label className="tbs" onMouseEnter={() => prefetchSearch()}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden><circle cx="11" cy="11" r="6" /><path d="M20 20l-4-4" /></svg>
      <input id="v2-search" placeholder="Search coins and users…" aria-label="Search" readOnly onFocus={(e) => { e.currentTarget.blur(); window.dispatchEvent(new Event("hb-search")); }} onClick={() => window.dispatchEvent(new Event("hb-search"))} />
      <kbd>Ctrl K</kbd>
    </label>
  );
}

function WalletGhost() {
  const { ready, address, isConnected } = useHbWallet();
  const open = useWalletModal();
  if (isConnected && address) {
    return <button type="button" className="ghost hide-s" onClick={() => open("Account")}>{shortAddr(address)}</button>;
  }
  return <button type="button" className="ghost hide-s" onClick={() => open("Connect")} disabled={!ready}>Connect wallet</button>;
}

const CONTENT = ["/articles", "/docs", "/privacy", "/terms", "/solana-launchpad", "/pump-fun-alternative", "/launch-a-memecoin", "/anti-sniper-launch", "/trade-solana-from-x"];

export function V2Shell({ path, children }: { path: string; children: ReactNode }) {
  const router = useRouter();
  const section = sectionOf(path);
  const [settings, update] = useSettings();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const next = resolved(settings.theme);
    setTheme(next);
    document.documentElement.dataset.shell = "v2";
    document.documentElement.dataset.theme = next;
  }, [settings.theme]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const raw = a.getAttribute("href");
      if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/v2") || raw.startsWith("/hb-api")) return;
      const bare = raw.split(/[?#]/)[0] || "/";
      const keep = isAppRoute(bare) || CONTENT.some((p) => bare === p || bare.startsWith(`${p}/`));
      if (!keep) return;
      e.preventDefault();
      e.stopPropagation();
      router.push(uiHref(raw));
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.documentElement.style.overflow = ""; document.body.style.overflow = ""; };
  }, [open]);

  const toggleTheme = () => update({ theme: theme === "light" ? "dark" : "light" });
  const canon = canonicalPath(path);

  return (
    <div className="jtx" data-theme={theme}>
      <MeteoraSymbol />
      <div className="app">
        <div className={`scrim${open ? " on" : ""}`} onClick={() => setOpen(false)} />
        <aside className={`sidenav${open ? " open" : ""}`} aria-label="Main navigation">
          <Link className="logo" href={uiHref("/")} aria-label="highbar home" onClick={() => setOpen(false)}>
            <img className="lg dk" src="/v2/sidebar-logo.png" alt="highbar" />
            <img className="lg lt" src="/v2/sidebar-logo-light.png" alt="" />
          </Link>
          <div className="sn">
            {NAV.map((g) => (
              <div key={g.group}>
                <div className="lbl sg">{g.group}</div>
                {g.items.map((item) => {
                  const on = item.id === section || (item.id === "home" && section === "token");
                  return (
                    <Link key={item.id} className={`ni${on ? " on" : ""}`} href={uiHref(item.href)} onClick={() => setOpen(false)}>
                      {item.icon}<span>{item.label}</span>{item.badge && <em className="nw">{item.badge}</em>}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="sbot">
            <Link className="bom" href={uiHref("/")} aria-label="Built on Meteora">Built on <MeteoraMark /></Link>
            <a className="xl" href={PROJECT_LINKS.x} target="_blank" rel="noopener" aria-label="highbar on X" title="X">
              <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
            </a>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <button className="ghost ic mb" type="button" aria-label="Open menu" onClick={() => setOpen(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <div className="tbt">{SECTION_TITLE[section] ?? "Dashboard"}</div>
            <SearchField />
            <div className="tbr">
              <button className="ghost ic" type="button" aria-label="Toggle light and dark mode" title="Light / dark" onClick={toggleTheme}>
                <svg className="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
                <svg className="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" width="18" height="18"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></svg>
              </button>
              <WalletGhost />
              <Link className="btn y sm" href={uiHref("/launch")}><b>Launch token</b><i>+</i></Link>
            </div>
          </header>
          {children}
          <footer className="dfoot">
            <Link href={uiHref("/docs")}>Docs</Link>
            <Link href={uiHref("/guides")}>Guides</Link>
            <Link href="/docs/api">API</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href={classicHref(canon)}>Classic UI</Link>
            <span className="dim mono">highbar · Solana launchpad</span>
          </footer>
        </div>
      </div>
      <SiteOverlays />
      <SearchLauncher />
    </div>
  );
}
