import type { ReactNode } from "react";

export type IconProps = { size?: number; strokeWidth?: number; className?: string };

function Ico({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" className={className} aria-hidden>
      {children}
    </svg>
  );
}

export const IconDashboard = (p: IconProps) => (
  <Ico className={p.className}><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></Ico>
);
export const IconLaunch = (p: IconProps) => (
  <Ico className={p.className}><path d="M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9zM9 15l-2 4M15 15l2 4" /><circle cx="12" cy="10" r="1.5" /></Ico>
);
export const IconLeaderboard = (p: IconProps) => (
  <Ico className={p.className}><path d="M8 4h8v5a4 4 0 0 1-8 0zM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 13v4M8 20h8" /></Ico>
);
export const IconLocks = (p: IconProps) => (
  <Ico className={p.className}><rect x="5" y="11" width="14" height="9" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></Ico>
);
export const IconPortfolio = (p: IconProps) => (
  <Ico className={p.className}><path d="M3 7h16a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13h2" /></Ico>
);
export const IconRewards = (p: IconProps) => (
  <Ico className={p.className}><path d="M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9c-3 0-5-1-4-3s4 0 4 3zM12 9c3 0 5-1 4-3s-4 0-4 3z" /></Ico>
);
export const IconPrivate = (p: IconProps) => (
  <Ico className={p.className}><path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5zM12 15v2" /></Ico>
);
export const IconOpenBook = (p: IconProps) => (
  <Ico className={p.className}><path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" /></Ico>
);
export const IconGuides = (p: IconProps) => (
  <Ico className={p.className}><path d="M5 4h4v16H5zM11 4h4v16h-4zM17 6l3 1-3 13-3-1z" /></Ico>
);
export const IconDocs = (p: IconProps) => (
  <Ico className={p.className}><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" /></Ico>
);
export const IconSettings = (p: IconProps) => (
  <Ico className={p.className}><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></Ico>
);

export type NavItem = {
  href: string;
  label: string;
  icon: (props: IconProps) => ReactNode;
  match?: string[];
  /** Yellow count-style chip. Open Book uses the small "New" chip. */
  badge?: string;
  /** UI-only item. Does not navigate. */
  concept?: boolean;
};

export type NavGroup = { label: string; items: NavItem[] };

/** Sidebar groups, in the mockup's order. `match` lists old paths that light up the same item. */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { href: "/", label: "Dashboard", icon: IconDashboard, match: ["/token"] },
      { href: "/launch", label: "Launch", icon: IconLaunch },
      { href: "/leaderboard", label: "Leaderboard", icon: IconLeaderboard },
      { href: "/locks", label: "Locks", icon: IconLocks },
    ],
  },
  {
    label: "Account",
    items: [
      { href: "/portfolio", label: "Portfolio", icon: IconPortfolio, match: ["/claim"] },
      { href: "/rewards", label: "Rewards", icon: IconRewards, match: ["/cashback", "/referral", "/milestones", "/bar", "/burn", "/higher"] },
    ],
  },
  {
    label: "Transparency",
    items: [
      { href: "/open-book", label: "Open Book", icon: IconOpenBook, badge: "New" },
      { href: "/articles", label: "Guides", icon: IconGuides },
      { href: "/docs", label: "Docs", icon: IconDocs },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: IconSettings, match: ["/about"] },
    ],
  },
];

/** Flat list of real routes (concept items excluded) for any caller that still walks every destination. */
export const NAV: NavItem[] = NAV_GROUPS.flatMap((g) => g.items.filter((i) => !i.concept));

export const isNavActive = (path: string, item: NavItem) =>
  !item.concept && ((item.href === "/" ? path === "/" : path.startsWith(item.href)) || !!item.match?.some((m) => path.startsWith(m)));
