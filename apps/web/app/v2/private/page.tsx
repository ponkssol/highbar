import type { Metadata } from "next";
import { V2Private } from "@/components/v2/PrivatePage";

export const metadata: Metadata = { title: "Private send", robots: { index: false, follow: false } };
export default function Page() { return <V2Private />; }
