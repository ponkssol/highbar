"use client";
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TopBar } from "./TopBar";
import { TabBar, TabPanels, useUrlTab } from "./TabBar";

/** True when a section renders inside a tabbed hub: TopBlock then skips its own search row and title. */
export const HubContext = createContext(false);
export const useInHub = () => useContext(HubContext);

export type HubTab = { id: string; label: string; component: ComponentType };

/** Tabbed page whose active tab lives in `?tab=` so links (and redirects from the old per-feature URLs) can deep-link a tab.
 *  Switching only rewrites the URL (history.replaceState), so other params such as ?ref= stay and the page never re-navigates. */
export function HubTabs({ title, intro, tabs }: { title: string; intro?: ReactNode; tabs: HubTab[] }) {
  const path = usePathname();
  const params = useSearchParams();
  const ids = useMemo(() => tabs.map((t) => t.id), [tabs]);
  const [tab, select] = useUrlTab(ids, ids[0], { initial: params.get("tab") });
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
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
          <TabBar label={`${title} sections`} value={active.id} onSelect={select} testId="hub-tabs"
            items={tabs.map((t) => ({ id: t.id, label: t.label, href: hrefFor(t.id) }))} />
        </nav>
      </section>
      <HubContext.Provider value={true}>
        <TabPanels k={active.id}><Active /></TabPanels>
      </HubContext.Provider>
    </div>
  );
}
