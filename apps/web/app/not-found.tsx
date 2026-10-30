import Link from "next/link";
import type { Metadata } from "next";
import { TopBar } from "@/components/TopBar";

export const metadata: Metadata = { title: { absolute: "Page not found | highbar" }, description: "This token or page does not exist on highbar.", robots: { index: false, follow: true } };

export default function NotFound() {
  return (
    <div className="flex flex-col gap-4">
      <TopBar />
      <section className="rounded border border-border bg-surface p-10 text-center shadow-card">
        <div className="num text-kpi">404</div>
        <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
        <p className="mt-1 text-sm text-ink-3">This token or page does not exist. Check the mint address and try again.</p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded bg-ink px-4 text-sm font-medium text-on-ink hover:opacity-90">Back to dashboard</Link>
      </section>
    </div>
  );
}