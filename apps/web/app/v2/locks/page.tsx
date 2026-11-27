import type { Metadata } from "next";
import { V2Locks } from "@/components/v2/LocksPage";
import { getAllLocks } from "@/lib/seoData";

export const metadata: Metadata = { title: "Dev token locks" };

export default async function Page() {
  const locks = await getAllLocks();
  return <V2Locks initial={locks} />;
}
