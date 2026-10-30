import { BookOpen, Gift, LayoutGrid, Lock, Rocket, Settings, Trophy, Wallet, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; match?: string[]; badge?: string };

/** Single source for the sidebar and the mobile bottom nav. `match` lists old/merged paths that light up the same item. */
export const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutGrid, match: ["/token"] },
  { href: "/launch", label: "Launch", icon: Rocket },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/locks", label: "Locks", icon: Lock },
  { href: "/portfolio", label: "Portfolio", icon: Wallet, match: ["/claim"] },
  { href: "/rewards", label: "Rewards", icon: Gift, match: ["/cashback", "/referral", "/milestones", "/bar", "/burn", "/higher"] },
  { href: "/open-book", label: "Open Book", icon: BookOpen, badge: "New" },
  { href: "/settings", label: "Settings", icon: Settings, match: ["/about"] },
];

export const isNavActive = (path: string, item: NavItem) =>
  (item.href === "/" ? path === "/" : path.startsWith(item.href)) || !!item.match?.some((m) => path.startsWith(m));
