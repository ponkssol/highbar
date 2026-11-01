"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SocialLinks } from "./SocialLinks";
import { ThemeToggle } from "./ThemeToggle";
import { NAV, isNavActive } from "./nav";
import { Logo } from "./Logo";

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-sidebar md:flex flex-col border-r border-border bg-surface hb-rail px-3 py-5">
      <Link href="/" className="mb-7 flex items-center px-3" aria-label="highbar home">
        <Logo height={38} />
      </Link>
      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const { href, label, icon: Icon, badge } = item;
          const on = isNavActive(path, item);
          return (
            <Link key={href} href={href} aria-current={on ? "page" : undefined}
              className={`flex h-10 items-center gap-3 rounded-sm px-3 text-sm transition-colors ${on ? "bg-gold-soft font-medium text-ink" : "text-ink-2 hover:bg-control-hover hover:text-ink"}`}>
              <Icon size={18} strokeWidth={on ? 2 : 1.5} className={on ? "text-gold-text" : undefined} />
              {label}
              {badge && <span className="ml-auto text-[11px] font-normal text-ink-3">{badge}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto" />
      <ThemeToggle />
      <SocialLinks variant="icons" className="mt-2 px-1" />
    </aside>
  );
}
