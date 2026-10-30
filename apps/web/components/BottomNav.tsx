"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Coins, Flame, Gem, HandCoins, Info, LayoutGrid, Lock, MoreHorizontal, Rocket, Settings, Target, Trophy, Users, Wallet } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";

const MAIN = [
  { href: "/", label: "Home", icon: LayoutGrid },
  { href: "/launch", label: "Launch", icon: Rocket },
  { href: "/locks", label: "Locks", icon: Lock },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];
const MORE = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/claim", label: "Claim fees", icon: Coins },
  { href: "/burn", label: "Burn", icon: Flame },
  { href: "/cashback", label: "Cashback", icon: HandCoins },
  { href: "/bar", label: "$HIGHER perks", icon: Gem },
  { href: "/referral", label: "Referral", icon: Users },
  { href: "/milestones", label: "Milestones", icon: Target },
  { href: "/about", label: "About", icon: Info },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Mobile-only (<768px) app-style bottom navigation; the sidebar takes over from md up. */
export function BottomNav() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [open]);
  const isActive = (h: string) => (h === "/" ? path === "/" || path.startsWith("/token") : path.startsWith(h));
  const moreActive = open || MORE.some((m) => isActive(m.href));
  const item = (active: boolean) =>
    `relative flex h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium ${active ? "text-ink" : "text-ink-3"}`;
  const pill = (active: boolean) => active && <span aria-hidden className="absolute top-0 h-[3px] w-6 rounded-full bg-ink" />;
  return (
    <>
      <nav aria-label="Main" data-testid="bottom-nav"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex h-16">
          {MAIN.map(({ href, label, icon: Icon }) => {
            const a = isActive(href);
            return (
              <Link key={href} href={href} aria-current={a ? "page" : undefined} className={item(a)}>
                {pill(a)}
                {href === "/launch"
                  ? <span className="flex h-8 w-8 items-center justify-center rounded-sm bg-ink text-on-ink"><Icon size={18} strokeWidth={1.5} /></span>
                  : <Icon size={22} strokeWidth={1.5} />}
                {label}
              </Link>
            );
          })}
          <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={item(moreActive)}>
            {pill(moreActive)}<MoreHorizontal size={22} strokeWidth={1.5} />More
          </button>
        </div>
      </nav>
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="More pages" data-testid="more-sheet">
          <div className="hb-scrim absolute inset-0" onClick={() => setOpen(false)} />
          <div className="hb-sheet absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[20px] border-t border-border bg-surface px-4 pt-2 pb-[calc(16px+env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="mx-auto mb-2 flex h-6 w-full items-center justify-center">
              <span className="h-1 w-10 rounded-full bg-border-strong" />
            </button>
            <div className="flex flex-col">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className={`flex h-[52px] items-center gap-3 rounded-md px-3 text-sm ${isActive(href) ? "bg-muted font-medium text-ink" : "text-ink-2"}`}>
                  <Icon size={22} strokeWidth={1.5} />{label}
                </Link>
              ))}
              <div className="mt-2 border-t border-border pt-2 [&>button]:mb-0 [&>button]:h-[52px] [&>button]:w-full"><ThemeToggle /></div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}