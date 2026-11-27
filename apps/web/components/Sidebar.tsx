"use client";
import Link from "next/link";
import { Fragment } from "react";
import { usePathname } from "next/navigation";
import { PROJECT_LINKS } from "@/lib/links";
import { MeteoraMark } from "./MeteoraMark";
import { NAV_GROUPS, isNavActive, type NavItem } from "./nav";

function Item({ item, path, onNavigate }: { item: NavItem; path: string; onNavigate: () => void }) {
  const on = isNavActive(path, item);
  const className = `ni${on ? " on" : ""}`;
  const badge = item.badge
    ? (item.concept || item.href === "/private" ? <b className="nb">{item.badge}</b> : <em className="nw">{item.badge}</em>)
    : null;
  const inner = (<><item.icon /><span>{item.label}</span>{badge}</>);
  if (item.concept) {
    return (
      <button type="button" className={className} aria-disabled="true" title="Concept">
        {inner}
      </button>
    );
  }
  if (item.href === "/articles") {
    return <a href={item.href} aria-current={on ? "page" : undefined} className={className} onClick={onNavigate}>{inner}</a>;
  }
  return <Link href={item.href} aria-current={on ? "page" : undefined} className={className} onClick={onNavigate}>{inner}</Link>;
}

/** 252px sidebar. At <=900px it is a drawer controlled by `open`. */
export function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  const path = usePathname();
  return (
    <aside id="sidenav" className={`sidenav${open ? " open" : ""}`} aria-label="Main navigation">
      <Link href="/" className="logo" aria-label="highbar home" onClick={onNavigate}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lg dk" src="/brand/sidebar-logo.png" alt="highbar" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="lg lt" src="/brand/sidebar-logo-light.png" alt="" />
      </Link>
      <div id="navl" className="sn">
        {NAV_GROUPS.map((g) => (
          <Fragment key={g.label}>
            <div className="lbl sg">{g.label}</div>
            {g.items.map((item) => <Item key={item.label} item={item} path={path} onNavigate={onNavigate} />)}
          </Fragment>
        ))}
      </div>
      <div className="sbot">
        <a className="bom" href="https://www.meteora.ag" target="_blank" rel="noopener noreferrer" aria-label="Built on Meteora">
          Built on <MeteoraMark />
        </a>
        <a className="xl" href={PROJECT_LINKS.x} target="_blank" rel="noopener noreferrer" aria-label="highbar on X" title="X">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      </div>
    </aside>
  );
}
