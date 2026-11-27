import type { Metadata } from "next";
import { Suspense } from "react";
import { LaunchForm } from "@/components/v2/LaunchForm";

export const metadata: Metadata = { title: "Launch a token" };

export default function Page() {
  return (
    <Suspense fallback={<div className="frame"><div className="phead"><h1 className="h1">Set your bar, <span>then launch.</span></h1></div></div>}>
      <LaunchForm />
    </Suspense>
  );
}
