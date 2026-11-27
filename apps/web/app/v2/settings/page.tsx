import type { Metadata } from "next";
import { V2Settings } from "@/components/v2/SettingsPage";

export const metadata: Metadata = { title: "Settings", robots: { index: false, follow: false } };
export default function Page() { return <V2Settings />; }
