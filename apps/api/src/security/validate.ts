import { PublicKey } from "@solana/web3.js";

/** Base58 Solana address that parses as a public key. */
export const BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function isAddress(v: unknown): v is string {
  if (typeof v !== "string" || !BASE58.test(v)) return false;
  try { new PublicKey(v); return true; } catch { return false; }
}
export class BadRequest extends Error { readonly statusCode = 400; }
export function address(v: unknown, name = "address"): string {
  if (!isAddress(v)) throw new BadRequest(`${name} must be a valid Solana address`);
  return v;
}
/** Finite number within [min, max]; `def` when missing. */
export function number(v: unknown, name: string, min: number, max: number, def?: number): number {
  if ((v === undefined || v === null || v === "") && def !== undefined) return def;
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  if (!Number.isFinite(n) || n < min || n > max) throw new BadRequest(`${name} must be a number between ${min} and ${max}`);
  return n;
}
export const int = (v: unknown, name: string, min: number, max: number, def?: number) => {
  const n = number(v, name, min, max, def);
  if (!Number.isInteger(n)) throw new BadRequest(`${name} must be an integer`);
  return n;
};
/** Visible text: strips control chars (incl. bidi overrides / zero-width), trims, caps length. */
export function text(v: unknown, max: number): string {
  if (v === undefined || v === null) return "";
  return String(v).replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, "").trim().slice(0, max);
}
/** Token name/symbol: required, 1..max visible chars. */
export function label(v: unknown, name: string, max: number): string {
  const s = text(v, max);
  if (!s) throw new BadRequest(`${name} is required`);
  return s;
}
/** http(s) link (no javascript:, data:, etc.), max 200 chars; "" when empty. */
export function link(v: unknown, name: string): string {
  const s = text(v, 200);
  if (!s) return "";
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`); } catch { throw new BadRequest(`${name} must be a valid http(s) URL`); }
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new BadRequest(`${name} must be an http(s) URL`);
  return u.toString();
}
/** Image bytes really are the declared type (magic numbers). */
export function imageMatches(mime: string, b: Buffer): boolean {
  if (mime === "image/png") return b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/gif") return b.subarray(0, 6).toString("latin1") === "GIF87a" || b.subarray(0, 6).toString("latin1") === "GIF89a";
  if (mime === "image/webp") return b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP";
  return false;
}
