"use client";
import { Suspense, type ReactNode } from "react";
import { ListControls } from "./ListControls";
import { useInHub } from "./HubTabs";

/** listControls: show the token-list Sort by / Filters popovers (home page only; they drive the URL query).
 *  Search, wallet and launch live in the app shell topbar, so this row is only the list controls. */
export function TopBar({ listControls = false }: { listControls?: boolean }) {
  if (!listControls) return null;
  return (
    <div className="flex items-center justify-end">
      <div className="max-lg:hidden"><Suspense fallback={null}><ListControls /></Suspense></div>
    </div>
  );
}

/** Page header: search row + title + optional content. No horizontal inset, so it lines up with page cards. */
export function TopBlock({ title, children }: { title?: string; children?: ReactNode }) {
  // Inside a tabbed hub the hub owns the search row + title; the section keeps only its intro/controls.
  if (useInHub()) return children ? <section className="pb-1 [&>p:first-child]:mt-0 [&>div:first-child]:mt-0 [&>form:first-child]:mt-0">{children}</section> : null;
  return (
    <section className="pb-2">
      <TopBar />
      {title && <h1 className="mt-0 text-xl md:mt-2 md:text-2xl font-semibold tracking-tight">{title}</h1>}
      {children}
    </section>
  );
}