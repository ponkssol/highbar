import type { Metadata } from "next";
import { Suspense } from "react";
import { pageMeta } from "@/lib/seo";
import { SettingsHub } from "./SettingsHub";

/** Preferences + About. /about redirects here with ?tab=about (next.config.mjs). */
// Personal page: not indexed and not in the sitemap.
export const metadata: Metadata = pageMeta({ title: "Settings", description: "Display, network and trading preferences for highbar, plus links and info about the launchpad.", path: "/settings", noindex: true });

export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsHub /></Suspense>;
}
