import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checksumAccepted, LEGACY_CHECKSUMS, migrationChecksum } from "./checksum.js";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../db/migrations");
const sha = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const LF = "-- 0004\nCREATE TABLE a (x INT);\n\nCREATE INDEX a_x ON a (x);\n";
const CRLF = LF.replace(/\n/g, "\r\n");

test("canonical checksum is the raw sha256 of the LF file (unchanged for LF files)", () => {
  assert.equal(migrationChecksum(LF), sha(LF));
  assert.equal(migrationChecksum(CRLF), sha(LF));
});

test("accepts the LF checksum and the CRLF-checkout checksum of the same content, from either checkout", () => {
  for (const onDisk of [LF, CRLF]) {
    assert.ok(checksumAccepted("0004_x.sql", onDisk, sha(LF)));
    assert.ok(checksumAccepted("0004_x.sql", onDisk, sha(CRLF)));
  }
});

test("rejects a real content change, whatever the line endings", () => {
  const edited = LF.replace("x INT", "x BIGINT");
  for (const recorded of [sha(LF), sha(CRLF)]) {
    assert.equal(checksumAccepted("0004_x.sql", edited, recorded), false);
    assert.equal(checksumAccepted("0004_x.sql", edited.replace(/\n/g, "\r\n"), recorded), false);
  }
  assert.equal(checksumAccepted("0004_x.sql", LF, "deadbeef"), false);
});

test("Railway DB rows for 0004 / 0005 (recorded from a CRLF checkout) are accepted for the committed files, either checkout", () => {
  // schema_migrations values on the Railway DB, recorded by a migrate run from a Windows autocrlf checkout.
  const recorded: Record<string, { lf: string; crlf: string }> = {
    "0004_referral_milestone.sql": { lf: "dad4fb813d64d61f4b755a78b88d712f337e455fcc35c426ef1e8990b791f9f8", crlf: "262ddc55f55df72193641676efed69b29a69b26f7bf4732a49a7818e6d355bc5" },
    "0005_bar_utility.sql": { lf: "8949a514e8576cdc482ad1f28d8643b85647cc7579f71fa07b6315f244178926", crlf: "ca5776db61e276e424d7c45cad054b0173618912dca19204383c3c3b3571f8dd" },
  };
  for (const [f, { lf, crlf }] of Object.entries(recorded)) {
    const onDisk = fs.readFileSync(path.join(DIR, f), "utf8");
    assert.equal(migrationChecksum(onDisk), lf, f);
    for (const sql of [onDisk.replace(/\r\n/g, "\n"), onDisk.replace(/\r\n/g, "\n").replace(/\n/g, "\r\n")]) {
      assert.ok(checksumAccepted(f, sql, crlf), f);
      assert.ok(checksumAccepted(f, sql, lf), f);
    }
  }
});
test("0004 legacy allowlist: the 547eaee version (LF / CRLF) is accepted for 0004 only", () => {
  const f = "0004_referral_milestone.sql";
  const onDisk = fs.readFileSync(path.join(DIR, f), "utf8");
  const old = execSync(`git show 547eaee:apps/api/db/migrations/${f}`, { encoding: "utf8" });
  assert.deepEqual([...LEGACY_CHECKSUMS[f]].sort(), [sha(old), sha(old.replace(/\n/g, "\r\n"))].sort());
  for (const rec of LEGACY_CHECKSUMS[f]) {
    assert.ok(checksumAccepted(f, onDisk, rec));
    assert.equal(checksumAccepted("0005_bar_utility.sql", fs.readFileSync(path.join(DIR, "0005_bar_utility.sql"), "utf8"), rec), false);
  }
});