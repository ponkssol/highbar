import { test } from "node:test";
import assert from "node:assert/strict";
import { notice, pickNotice, walletNotice } from "./notice";

test("one short wallet gives one short line, the detail goes to the title", () => {
  const n = walletNotice([{ label: "Wallet 1", sol: 0.0123 }], 0.53)!;
  assert.equal(n.text, "Need ~0.53 SOL in Wallet 1");
  assert.ok(n.blocking);
  assert.match(n.title, /Wallet 1 has 0.0123 SOL/);
  assert.ok(n.text.length <= 32);
  // The old footer said it twice (a summary line and a "Not enough SOL" error). Now only one notice can come out.
  const shown = [pickNotice(null, n)].filter(Boolean);
  assert.equal(shown.length, 1);
});

test("several wallets: all short blocks, some short are skipped", () => {
  const ws = [{ label: "Wallet 1", sol: 2.45 }, { label: "Snipes", sol: 0.4 }, { label: "Runner", sol: 0.1 }];
  const some = walletNotice(ws, 0.53)!;
  assert.equal(some.text, "2 of 3 short of SOL, skipped");
  assert.equal(some.blocking, false);
  assert.match(some.title, /Snipes has 0.4 SOL, Runner has 0.1 SOL/);
  const all = walletNotice(ws.slice(1), 0.53)!;
  assert.equal(all.text, "2 wallets short of SOL");
  assert.ok(all.blocking);
  assert.equal(walletNotice(ws, 0.05), null);
  assert.equal(walletNotice([{ label: "Wallet 1", sol: null }], 0.53), null, "an unknown balance is not flagged");
});

test("the footer picks one notice by priority, never a stack", () => {
  const form = notice("Name must be 1 to 32 bytes");
  const sol = walletNotice([{ label: "Wallet 1", sol: 0 }], 0.53);
  assert.equal(pickNotice(form, sol), form);
  assert.equal(pickNotice(null, sol), sol);
  assert.equal(pickNotice(notice(" "), null), null);
  assert.equal(walletNotice([{ label: "Wallet 1", sol: 0, needsMigration: true }], 0.53)!.text, "Finish the update of Wallet 1 first");
});
