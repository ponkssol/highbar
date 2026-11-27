"use client";
import { createContext, useContext, useMemo, type ComponentType, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { TabPanels, useUrlTab } from "./TabBar";
import { JtxSeg } from "./JtxSeg";

/** True when a section renders inside a tabbed hub: TopBlock then skips its own search row and title. */
export const HubContext = createContext(false);
export const useInHub = () => useContext(HubContext);

export type HubTab = { id: string; label: string; component: ComponentType };

/** Tabbed page whose active tab lives in `?tab=` so links (and redirects from the old per-feature URLs) can deep-link a tab.
 *  Switching only rewrites the URL (history.replaceState), so other params such as ?ref= stay and the page never re-navigates. */
export function HubTabs({ title, intro, headline, tabs, line = false }: { title: string; intro?: ReactNode; headline?: ReactNode; tabs: HubTab[]; line?: boolean }) {
  const params = useSearchParams();
  const ids = useMemo(() => tabs.map((t) => t.id), [tabs]);
  const [tab, select] = useUrlTab(ids, ids[0], { initial: params.get("tab") });
  const active = tabs.find((t) => t.id === tab) ?? tabs[0];
  const Active = active.component;
  return (
    <div className="jtx">
      <div className="phead">
        <div>
          <div className="bul">{title}</div>
          {headline && <h1 className="h1">{headline}</h1>}
          {intro && <p className="muted" style={{ margin: "10px 0 0", maxWidth: "40em" }}>{intro}</p>}
        </div>
        <JtxSeg label={`${title} sections`} line={line} value={active.id} onChange={select} options={tabs.map((t) => ({ id: t.id, label: t.label }))} />
      </div>
      <HubContext.Provider value={true}>
        <TabPanels k={active.id}><Active /></TabPanels>
      </HubContext.Provider>
    </div>
  );
}
