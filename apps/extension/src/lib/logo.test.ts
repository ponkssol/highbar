import { test } from "node:test";
import assert from "node:assert/strict";
import { dexImageUrl, ipfsPath, logoCandidates, MAX_LOGO_TRIES, pumpImageUrl, withGateways } from "./logo";

const CID = "bafkreicgtexwqgzntl2hlk5y5o62pnlm3htrw3zve5demer6h2qveu3uki", MINT = "CEMEy7jkeytkxq3qYjaKyQnKiUdHAMJDM1B1tv2Upump";

test("logo: IPFS links on any gateway, ipfs:// and subdomain form", () => {
  assert.equal(ipfsPath(`https://ipfs.io/ipfs/${CID}`), CID);
  assert.equal(ipfsPath(`ipfs://${CID}/a.png`), `${CID}/a.png`);
  assert.equal(ipfsPath(`https://${CID}.ipfs.dweb.link/`), CID);
  assert.equal(ipfsPath("https://example.com/ipfs/notacid"), null);
  assert.deepEqual(withGateways(`https://ipfs.io/ipfs/${CID}`), [`https://ipfs.io/ipfs/${CID}`, `https://pump.mypinata.cloud/ipfs/${CID}`, `https://ipfs.io/ipfs/${CID}`, `https://cf-ipfs.com/ipfs/${CID}`]);
  assert.deepEqual(withGateways("http://x.test/a.png"), []);
});

test("logo: order is pump.fun, Jupiter, DexScreener, metadata, deduped and capped", () => {
  const c = logoCandidates({ mint: MINT, pump: true, pumpImage: `https://ipfs.io/ipfs/${CID}`, jupIcon: `https://ipfs.io/ipfs/${CID}`, dexImage: "https://cdn.dexscreener.com/cms/images/abc?width=800&height=800&quality=95&format=auto", metaImage: "https://arweave.net/x" });
  assert.equal(c[0], pumpImageUrl(MINT, `https://ipfs.io/ipfs/${CID}`));
  assert.match(c[0], /^https:\/\/images\.pump\.fun\/coin-image\/CEMEy.*variant=86x86&ipfs=bafk/);
  assert.equal(c[1], `https://ipfs.io/ipfs/${CID}`);
  assert.equal(c[2], `https://pump.mypinata.cloud/ipfs/${CID}`);
  assert.ok(c.indexOf("https://cdn.dexscreener.com/cms/images/abc?width=128&height=128&quality=95&format=auto") > c.indexOf(`https://cf-ipfs.com/ipfs/${CID}`));
  assert.ok(c.includes("https://arweave.net/x"));
  // hosts without CORS also come through the image proxy (never IPFS gateways or pump.fun's CDN)
  assert.equal(c[c.length - 1], "https://wsrv.nl/?url=https%3A%2F%2Farweave.net%2Fx&w=64&h=64&fit=cover&output=png");
  assert.ok(!c.some((u) => u.startsWith("https://wsrv.nl/?url=https%3A%2F%2Fipfs.io")));
  assert.equal(new Set(c).size, c.length);
  assert.ok(c.length <= MAX_LOGO_TRIES);
  assert.deepEqual(logoCandidates({ mint: "x", jupIcon: "javascript:alert(1)" }), []);
  assert.equal(dexImageUrl("nope"), null);
});
