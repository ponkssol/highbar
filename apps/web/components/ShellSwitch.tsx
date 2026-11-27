"use client";
import { useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { PageShell } from "@/components/PageShell";
import { BottomNav } from "@/components/BottomNav";
import { MobileHeader } from "@/components/MobileHeader";
import { SearchLauncher } from "@/components/search/SearchLauncher";
import { isV2Shell } from "@/lib/uiVersion";
import { V2Shell } from "@/components/v2/Shell";

/** Classic chrome, copied from the previous root layout so `/` renders the same tree. */
function ClassicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Sidebar />
      <main className="min-h-screen p-[14px] pb-[calc(80px+env(safe-area-inset-bottom))] md:ml-sidebar md:p-4 md:pb-4">
        <PageShell><MobileHeader />{children}</PageShell>
      </main>
      <BottomNav />
      <SearchLauncher />
    </>
  );
}

/** `/v2` renders the new shell. Every other route keeps the current one. */
export function ShellSwitch({ children }: { children: ReactNode }) {
  const path = usePathname() || "/";
  const v2 = isV2Shell(path);
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (!v2) {
      delete root.dataset.shell;
      delete root.dataset.theme;
    }
  }, [v2]);
  if (v2) return <V2Shell path={path}>{children}</V2Shell>;
  return <ClassicShell>{children}</ClassicShell>;
}
