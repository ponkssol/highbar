"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";

/** The modal is a separate chunk: it loads on first open (or when the pointer reaches the header search box), not with the page. */
const loadModal = () => import("./SearchModal");
const SearchModal = dynamic(loadModal, { ssr: false });
export const prefetchSearch = () => { void loadModal(); };

/** Opens the header search modal. Header search box, mobile header icon (both send the hb-search event), Cmd or Ctrl K, and "/" outside a text field. */
export function SearchLauncher() {
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  const show = useCallback(() => {
    setOpen((o) => { if (!o) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; return true; });
  }, []);
  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => { if (!o) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; return !o; }); }
      else if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !typing(e.target)) { e.preventDefault(); show(); }
    };
    window.addEventListener("hb-search", show);
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("hb-search", show); window.removeEventListener("keydown", onKey); };
  }, [show]);
  // Focus goes back to whatever opened the modal (the header search box, the mobile icon, or the element focused before the shortcut).
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !open) { const el = opener.current; if (el && el.isConnected) el.focus({ preventScroll: true }); }
    wasOpen.current = open;
  }, [open]);
  return open ? <SearchModal onClose={close} /> : null;
}
