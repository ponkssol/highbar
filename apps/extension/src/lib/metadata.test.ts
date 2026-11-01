import { test } from "node:test";
import assert from "node:assert/strict";
import { metadataPda, metaplexUri } from "./metadata";

const enc = (s: string, pad: number) => { const t = new TextEncoder().encode(s), b = new Uint8Array(4 + pad); new DataView(b.buffer).setUint32(0, pad, true); b.set(t, 4); return b; };
const account = (uri: string) => {
  const parts = [Uint8Array.of(4), new Uint8Array(32), new Uint8Array(32), enc("Test Coin", 32), enc("TEST", 10), enc(uri, 200), new Uint8Array(20)];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return btoa(String.fromCharCode(...out));
};

test("metaplexUri reads the padded uri", () => {
  assert.equal(metaplexUri(account("https://example.com/m.json")), "https://example.com/m.json");
  assert.equal(metaplexUri(account("ipfs://bafkreiexample")), "ipfs://bafkreiexample");
  assert.equal(metaplexUri(account("ar://abc")), "https://arweave.net/abc");
  assert.equal(metaplexUri(account("http://plain.example/m.json")), null);
  assert.equal(metaplexUri(btoa("xx")), null);
});

test("metadataPda is the Metaplex PDA of the mint", () => {
  // wrapped SOL's metadata account
  assert.equal(metadataPda("So11111111111111111111111111111111111111112"), "6dM4TqWyWJsbx7obrdLcviBkTafD5E8av61zfU6jq57X");
});
