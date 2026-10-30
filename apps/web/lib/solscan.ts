/** Solscan links for Open Book. Every figure links to its on-chain source: tx for signatures, account for wallets and token accounts,
 *  token for mints, block for slots. The cluster follows the network the data came from (Open Book `meta.network`) and falls back to
 *  the app network (lib/settings NETWORK, set from the server NETWORK env). Mainnet has no cluster suffix. */
import { NETWORK, normNetwork } from "./settings";

const SOLSCAN = "https://solscan.io";
const cluster = (network?: string | null) => ((network ? normNetwork(network) : NETWORK) === "mainnet" ? "" : "?cluster=devnet");

export const solscanTx = (sig: string, network?: string | null) => `${SOLSCAN}/tx/${encodeURIComponent(sig)}${cluster(network)}`;
export const solscanAccount = (address: string, network?: string | null) => `${SOLSCAN}/account/${encodeURIComponent(address)}${cluster(network)}`;
export const solscanToken = (mint: string, network?: string | null) => `${SOLSCAN}/token/${encodeURIComponent(mint)}${cluster(network)}`;
export const solscanBlock = (slot: number | string, network?: string | null) => `${SOLSCAN}/block/${encodeURIComponent(String(slot))}${cluster(network)}`;

export type SolscanKind = "tx" | "account" | "token" | "block";
export const solscanUrl = (kind: SolscanKind, id: string | number, network?: string | null) =>
  kind === "tx" ? solscanTx(String(id), network) : kind === "token" ? solscanToken(String(id), network) : kind === "block" ? solscanBlock(id, network) : solscanAccount(String(id), network);
