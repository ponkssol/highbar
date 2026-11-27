import type { Metadata } from "next";
import { V2Leaderboard } from "@/components/v2/Leaderboard";

export const metadata: Metadata = { title: "Leaderboard" };
export default function Page() { return <V2Leaderboard />; }
