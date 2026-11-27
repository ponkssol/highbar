import type { Metadata } from "next";
import { V2OpenBook } from "@/components/v2/OpenBookPage";
import { getOpenBook, getOpenBookTokens } from "@/lib/seoData";

export const metadata: Metadata = { title: "Open Book" };

export default async function Page() {
  const [ob, tokens] = await Promise.all([getOpenBook("all"), getOpenBookTokens("")]);
  return <V2OpenBook initial={ob} initialTokens={tokens?.rows ?? []} />;
}
