import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PublicKey } from "@solana/web3.js";
import { docsMarkdown } from "./docsMarkdown";
import { FAQ_TEXT } from "./docsFaq";
import {
  ADDRESS_DISCLAIMER, ADDRESS_INTRO, ALL_PUBLIC_ADDRESSES, CONFIG_INTRO, DBC_CONFIGS, LAUNCHPAD_SIGNER, PARTNER_FEE_CLAIMER,
  PUBLIC_ROLES, configKey, solscanAccountUrl,
} from "./publicAddresses";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");

/** First base58 pubkey captured by `re`. Fails if the source has no pinned public address. */
function pinned(source: string, label: string, re: RegExp): string {
  const m = source.match(re);
  if (!m?.[1]) assert.fail(`${label} has no pinned public address`);
  return m[1];
}

test("published addresses match checked-in mainnet config and do not silently substitute", () => {
  const mainnet = JSON.parse(read("packages/onchain/configs.mainnet.json").replace(/^\uFEFF/, "")) as Record<string, unknown>;
  assert.equal(DBC_CONFIGS.length, 6);
  for (const c of DBC_CONFIGS) {
    const key = configKey(c.tier, c.antiSniper);
    const published = mainnet[key];
    assert.equal(typeof published, "string", `configs.mainnet.json is missing ${key}`);
    assert.equal(c.address, published, `conflict: docs ${key} is ${c.address}, configs.mainnet.json has ${String(published)}`);
  }
  assert.equal(PARTNER_FEE_CLAIMER, mainnet.feeClaimer, `conflict: fee wallet is ${PARTNER_FEE_CLAIMER}, configs.mainnet.json feeClaimer is ${String(mainnet.feeClaimer)}`);
  assert.equal(typeof mainnet.leftoverReceiver, "string");
  assert.ok(!ALL_PUBLIC_ADDRESSES.includes(String(mainnet.leftoverReceiver)), "leftoverReceiver is a different account and is not in this public list");

  const checklist = read("docs/MAINNET_CHECKLIST.md");
  const template = read("deploy/mainnet/api.env.template");
  const fromChecklist = pinned(checklist, "MAINNET_CHECKLIST", /LAUNCHPAD_SIGNER_PUBKEY[\s\S]{0,240}?`([1-9A-HJ-NP-Za-km-z]{32,44})`/);
  const fromTemplate = pinned(template, "api.env.template", /^LAUNCHPAD_SIGNER_PUBKEY=([1-9A-HJ-NP-Za-km-z]{32,44})$/m);
  assert.equal(LAUNCHPAD_SIGNER, fromChecklist, `conflict: launch signer != MAINNET_CHECKLIST (${fromChecklist})`);
  assert.equal(LAUNCHPAD_SIGNER, fromTemplate, `conflict: launch signer != api.env.template LAUNCHPAD_SIGNER_PUBKEY (${fromTemplate})`);
  assert.equal(PUBLIC_ROLES[0]?.address, LAUNCHPAD_SIGNER);
  assert.equal(PUBLIC_ROLES[1]?.address, PARTNER_FEE_CLAIMER);

  const ext = pinned(template, "api.env.template EXT_FEE_RECEIVER", /^EXT_FEE_RECEIVER=([1-9A-HJ-NP-Za-km-z]{32,44})$/m);
  assert.equal(PARTNER_FEE_CLAIMER, ext, `conflict: fee wallet != api.env.template EXT_FEE_RECEIVER (${ext})`);

  // Unfilled CONFIG_* / PLATFORM_PUBKEY placeholders are not alternate addresses. A filled value must be compared, not ignored.
  for (const rel of ["deploy/mainnet/api.env.template", "deploy/mainnet/jobs.env.template", "deploy/mainnet/keeper.env.template"]) {
    const text = read(rel);
    for (const m of text.matchAll(/^(CONFIG_(?:STANDARD|HIGHER|MAX)_(?:ON|OFF)|PLATFORM_PUBKEY|FEE_CLAIMER_PUBKEY)=(.*)$/gm)) {
      const value = m[2].trim();
      if (value === "<FILL_ME>" || value === "") continue;
      if (m[1].startsWith("CONFIG_")) {
        const key = m[1].slice("CONFIG_".length).toLowerCase();
        const row = DBC_CONFIGS.find((c) => configKey(c.tier, c.antiSniper) === key);
        assert.ok(row, `${rel} pins unknown config ${m[1]}`);
        assert.equal(row.address, value, `conflict: ${rel} ${m[1]}=${value} != docs ${row.address}`);
      } else {
        assert.equal(value, PARTNER_FEE_CLAIMER, `conflict: ${rel} ${m[1]}=${value} != partner fee wallet ${PARTNER_FEE_CLAIMER}`);
      }
    }
  }
});

test("every published address is a unique mainnet pubkey, linked on Solscan, and copied into the docs markdown", () => {
  assert.equal(new Set(ALL_PUBLIC_ADDRESSES).size, ALL_PUBLIC_ADDRESSES.length);
  for (const a of ALL_PUBLIC_ADDRESSES) {
    assert.equal(new PublicKey(a).toBase58(), a, a);
    assert.equal(solscanAccountUrl(a), `https://solscan.io/account/${a}`);
    assert.equal(solscanAccountUrl(a).includes("cluster"), false);
  }
  const page = read("apps/web/app/docs/page.tsx");
  assert.match(page, /id="public-addresses"/);
  assert.match(page, /ADDRESS_DISCLAIMER/);
  assert.equal(page.includes("NEXT_PUBLIC_"), false);
  const md = docsMarkdown("https://highbar.capital");
  for (const a of ALL_PUBLIC_ADDRESSES) {
    assert.ok(md.includes(a), `markdown missing ${a}`);
    assert.ok(md.includes(solscanAccountUrl(a)), `markdown missing Solscan link for ${a}`);
  }
  for (const p of ADDRESS_INTRO) assert.ok(md.includes(p));
  assert.ok(md.includes(ADDRESS_DISCLAIMER));
  assert.ok(md.includes(CONFIG_INTRO));
  assert.match(md, /Launchpad common signer/);
  assert.match(md, /Partner \/ platform fee-claimer wallet/);
  assert.match(md, /\| Tier \| Anti-sniper \| Address \| Solscan \|/);
  assert.match(md, /not the \$HIGHER token mint/);
  assert.match(ADDRESS_DISCLAIMER, /not a statement that Meteora submitted, reviewed or verified/);
  assert.equal(/verified by Meteora|submitted by Meteora|Meteora has verified/i.test(md), false);
  const faq = FAQ_TEXT.find(([q]) => q === "What contract does highbar use?");
  assert.ok(faq);
  assert.match(faq![1], /not the \$HIGHER token mint/);
  assert.match(faq![1], /Meteora DBC/);
});
