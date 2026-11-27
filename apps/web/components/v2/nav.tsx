import type { ReactNode } from "react";

const I = ({ d }: { d: ReactNode }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" aria-hidden>{d}</svg>
);

export const NAV: { group: string; items: { id: string; href: string; label: string; badge?: string; icon: ReactNode }[] }[] = [
  {
    group: "Platform",
    items: [
      { id: "home", href: "/", label: "Dashboard", icon: <I d={<><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /></>} /> },
      { id: "launch", href: "/launch", label: "Launch", icon: <I d={<><path d="M12 3c3 2 5 5 5 9l-2 3H9l-2-3c0-4 2-7 5-9zM9 15l-2 4M15 15l2 4" /><circle cx="12" cy="10" r="1.5" /></>} /> },
      { id: "leaderboard", href: "/leaderboard", label: "Leaderboard", icon: <I d={<path d="M8 4h8v5a4 4 0 0 1-8 0zM6 5H3v2a3 3 0 0 0 3 3M18 5h3v2a3 3 0 0 1-3 3M12 13v4M8 20h8" />} /> },
      { id: "locks", href: "/locks", label: "Locks", icon: <I d={<><rect x="5" y="11" width="14" height="9" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>} /> },
    ],
  },
  {
    group: "Account",
    items: [
      { id: "portfolio", href: "/portfolio", label: "Portfolio", icon: <I d={<path d="M3 7h16a2 2 0 0 1 2 2v9H5a2 2 0 0 1-2-2zM3 7l12-3v3M16 13h2" />} /> },
      { id: "rewards", href: "/rewards", label: "Rewards", icon: <I d={<path d="M4 9h16v4H4zM6 13v7h12v-7M12 9v11M12 9c-3 0-5-1-4-3s4 0 4 3zM12 9c3 0 5-1 4-3s-4 0-4 3z" />} /> },
      { id: "private", href: "/private", label: "Private send", badge: "New", icon: <I d={<path d="M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5zM12 15v2" />} /> },
    ],
  },
  {
    group: "Transparency",
    items: [
      { id: "open-book", href: "/open-book", label: "Open Book", badge: "New", icon: <I d={<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z" />} /> },
      { id: "guides", href: "/guides", label: "Guides", icon: <I d={<path d="M5 4h4v16H5zM11 4h4v16h-4zM17 6l3 1-3 13-3-1z" />} /> },
      { id: "docs", href: "/docs", label: "Docs", icon: <I d={<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />} /> },
    ],
  },
  {
    group: "System",
    items: [
      { id: "settings", href: "/settings", label: "Settings", icon: <I d={<><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>} /> },
    ],
  },
];
