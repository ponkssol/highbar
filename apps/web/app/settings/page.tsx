import { Suspense } from "react";
import { SettingsHub } from "./SettingsHub";

/** Preferences + About. /about redirects here with ?tab=about (next.config.mjs). */
export default function SettingsPage() {
  return <Suspense fallback={null}><SettingsHub /></Suspense>;
}
