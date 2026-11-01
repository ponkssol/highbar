import { test } from "node:test";
import assert from "node:assert/strict";
import { Keypair } from "@solana/web3.js";
import { terminalLinks } from "./terminals";

test("terminal links: the token address in each URL, local icons, bots copy the CA", () => {
  const mint = Keypair.generate().publicKey.toBase58();
  const l = terminalLinks(mint, null);
  assert.deepEqual(l.map((x) => x.name).slice(1), ["GMGN", "Axiom", "Trojan", "Padre", "BaseBot"]);
  const by = Object.fromEntries(l.map((x) => [x.id, x]));
  assert.equal(by.gmgn.url, `https://gmgn.ai/sol/token/${mint}`);
  assert.equal(by.axiom.url, `https://axiom.trade/meme/${mint}?chain=sol`);
  assert.equal(by.padre.url, `https://trade.padre.gg/trade/solana/${mint}`);
  assert.ok(by.trojan.copyCa && by.basebot.copyCa && !by.gmgn.copyCa);
  for (const x of l) { assert.ok(!/^https?:/.test(x.icon), x.id); assert.ok(x.url.startsWith("https://")); assert.ok(!/;/.test(x.title)); }
  assert.equal(terminalLinks(mint, "https://example.test/token/x")[0].url, "https://example.test/token/x");
  assert.deepEqual(terminalLinks("not a mint", null), []);
});
