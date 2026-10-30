"use client";
import { createContext, useContext, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { TopBar } from "./TopBar";

/** True when a section renders inside a tabbed hub: TopBlock then skips its own search row and title. */
export const HubContext = createContext(false);
export const useInHub = () => useContext(HubContext);

export type HubTab = { id: string; label: string; component: ComponentType };

/** Tabbed page whose active tab lives in `?tab=` so links (and redirects from the old per-feature URLs) can deep-link a tab. */
export function HubTabs({ title, intro, tabs }: { title: string; intro?: ReactNode; tabs: HubTab[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const want = params.get("tab");
  const active = tabs.find((t) => t.id === want) ?? tabs[0];
  const hrefFor = (id: string) => {
    const q = new URLSearchParams(params.toString());
    q.set("tab", id);
    return `${path}?${q.toString()}`;
  };
  const Active = active.component;
  return (
    <div className="flex flex-col gap-5">
      <section>
        <TopBar />
        <h1 className="mt-0 text-xl font-semibold tracking-tight md:mt-2 md:text-2xl">{title}</h1>
        {intro && <p className="mt-1 max-w-xl text-sm text-ink-3">{intro}</p>}
        <nav aria-label={`${title} sections`} className="no-scrollbar -mx-[14px] mt-4 overflow-x-auto border-b border-border px-[14px] md:mx-0 md:px-0">
          <div className="flex gap-5">
            {tabs.map((t) => {
              const on = t.id === active.id;
              return (
                <Link key={t.id} href={hrefFor(t.id)} scroll={false} replace aria-current={on ? "page" : undefined}
                  className={`relative -mb-px whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${on ? "border-gold font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink"}`}>
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </section>
      <HubContext.Provider value={true}>
        <Active key={active.id} />
      </HubContext.Provider>
    </div>
  );
}
