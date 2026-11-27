import type { Metadata } from "next";
import { V2Portfolio } from "@/components/v2/PortfolioPage";

export const metadata: Metadata = { title: "Portfolio", robots: { index: false, follow: false } };

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const tab = (await searchParams).tab === "claim" ? "claim" : "overview";
  return <V2Portfolio tab={tab} />;
}
