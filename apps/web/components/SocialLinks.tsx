import Link from "next/link";
import type { ReactNode } from "react";
import { BookOpen, Braces } from "lucide-react";
import { PROJECT_LINKS } from "@/lib/links";

function XLogo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

type Item = { href: string; label: string; text: string; icon: ReactNode };
const isInternal = (href: string) => href.startsWith("/");

/** Project links (X, Docs, API) from lib/links.ts. Links without a URL are hidden and nothing renders when none are set.
 *  variant "icons": soft square buttons with a tooltip (sidebar footer). "labeled": icon and text (mobile More sheet). */
export function SocialLinks({ className = "", variant = "labeled" }: { className?: string; variant?: "labeled" | "icons" }) {
  const items: Item[] = [
    { href: PROJECT_LINKS.x, label: "highbar on X", text: "X", icon: <XLogo size={variant === "icons" ? 14 : 15} /> },
    { href: PROJECT_LINKS.docs, label: "highbar docs", text: "Docs", icon: <BookOpen size={16} strokeWidth={1.5} /> },
    { href: PROJECT_LINKS.api, label: "highbar API docs", text: "API", icon: <Braces size={16} strokeWidth={1.5} /> },
  ].filter((i) => isInternal(i.href) || /^https?:\/\//.test(i.href));
  if (items.length === 0) return null;

  const cls = variant === "icons"
    ? "hb-ctrl hb-tip inline-flex h-9 w-9 items-center justify-center rounded-sm text-ink-2 transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-line"
    : "inline-flex h-9 items-center gap-2 rounded-sm px-2.5 text-sm text-ink-2 transition-colors hover:bg-muted hover:text-ink";
  const body = (i: Item) => (variant === "icons" ? i.icon : <>{i.icon}<span>{i.text}</span></>);

  return (
    <div data-testid="social-links" className={`flex items-center ${variant === "icons" ? "gap-2" : "gap-1"} ${className}`}>
      {items.map((i) => isInternal(i.href)
        ? <Link key={i.text} href={i.href} aria-label={i.label} data-tip={variant === "icons" ? i.text : undefined} title={variant === "icons" ? undefined : i.label} className={cls}>{body(i)}</Link>
        : <a key={i.text} href={i.href} target="_blank" rel="noopener noreferrer" aria-label={i.label} data-tip={variant === "icons" ? i.text : undefined} title={variant === "icons" ? undefined : i.label} className={cls}>{body(i)}</a>)}
    </div>
  );
}
