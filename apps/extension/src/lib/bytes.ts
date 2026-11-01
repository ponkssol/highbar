/** Small byte helpers that work the same in the service worker, extension pages and Node (tests). */
export const b64 = (b: Uint8Array): string => { let s = ""; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const unb64 = (s: string): Uint8Array => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const utf8 = (s: string) => new TextEncoder().encode(s);
export const equalBytes = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
/** Overwrites a buffer in place (best effort: JS gives no hard guarantee, but nothing keeps the old bytes alive here). */
export const wipe = (b?: Uint8Array | null) => { if (b) b.fill(0); };
