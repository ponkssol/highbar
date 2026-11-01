import { useCallback, useEffect, useState } from "react";
import { send, type WalletStatus } from "../lib/messages";

export function useStatus() {
  const [st, setSt] = useState<WalletStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback(() => send({ type: "status" }).then((s) => { setSt(s); setErr(null); }, (e: Error) => setErr(e.message)), []);
  useEffect(() => {
    void load();
    const on = (m: { type?: string }) => { if (m?.type === "status:changed") void load(); };
    chrome.runtime.onMessage.addListener(on);
    return () => { chrome.runtime.onMessage.removeListener(on); };
  }, [load]);
  return { st, err, reload: load };
}

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const run = useCallback(() => { setBusy(true); return fn().then((d) => { setData(d); setErr(null); }, (e: Error) => setErr(e.message)).finally(() => setBusy(false)); }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { void run(); }, [run]);
  return { data, err, busy, reload: run };
}
