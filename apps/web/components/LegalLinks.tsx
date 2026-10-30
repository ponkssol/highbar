import Link from "next/link";

/** Quiet legal links for the sidebar footer, under the project links. */
export function LegalLinks({ className = "" }: { className?: string }) {
  const cls = "rounded-sm px-2 py-1 hover:text-ink";
  return (
    <div data-testid="legal-links" className={`flex items-center gap-1 text-[11px] text-ink-3 ${className}`}>
      <Link href="/terms" className={cls}>Terms</Link>
      <Link href="/privacy" className={cls}>Privacy</Link>
    </div>
  );
}
