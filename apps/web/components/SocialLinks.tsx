import { BookOpen } from "lucide-react";
import { PROJECT_LINKS } from "@/lib/links";

function XLogo({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  );
}

/** Small X + Docs links. Links without a URL are hidden; renders nothing when none are set. */
export function SocialLinks({ className = "" }: { className?: string }) {
  const items = [
    { href: PROJECT_LINKS.x, label: "highbar on X", text: "X", icon: <XLogo /> },
    { href: PROJECT_LINKS.docs, label: "highbar docs", text: "Docs", icon: <BookOpen size={16} strokeWidth={1.75} /> },
  ].filter((i) => /^https?:\/\//.test(i.href));
  if (items.length === 0) return null;
  return (
    <div data-testid="social-links" className={`flex items-center gap-1 ${className}`}>
      {items.map((i) => (
        <a key={i.text} href={i.href} target="_blank" rel="noopener noreferrer" aria-label={i.label} title={i.label}
          className="inline-flex h-9 items-center gap-2 rounded-sm px-2.5 text-sm text-ink-2 transition-colors hover:bg-muted hover:text-ink">
          {i.icon}<span>{i.text}</span>
        </a>
      ))}
    </div>
  );
}
