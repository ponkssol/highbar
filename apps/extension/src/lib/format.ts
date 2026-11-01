/** Display helpers. Dates are en-US (Nov 2, 2026). */
export const fmtDate = (ms: number) => new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
export const fmtDateTime = (ms: number) => `${fmtDate(ms)}, ${new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
export const fmtSol = (n: number, max = 4) => (Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: n !== 0 && Math.abs(n) < 0.001 ? 6 : max }) : "0");
export const fmtNum = (n: number) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })}M` : Math.abs(n) >= 1e3 ? `${(n / 1e3).toLocaleString("en-US", { maximumFractionDigits: 1 })}K` : n.toLocaleString("en-US", { maximumFractionDigits: 2 }));
export const fmtUsd = (n: number) => `$${fmtNum(n)}`;
export const short = (a: string, n = 4) => (a.length > n * 2 + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a);
export const solscan = (kind: "tx" | "account" | "token", id: string, network: string) => `https://solscan.io/${kind}/${id}${network === "devnet" ? "?cluster=devnet" : ""}`;
