import crypto from "node:crypto";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");
const toLf = (s: string) => s.replace(/\r\n/g, "\n");

/** Canonical migration checksum: sha256 (hex) of the file with LF line endings, i.e. what a Linux / Railway checkout
 *  hashes (the files are committed LF and pinned by .gitattributes `eol=lf`). Identical to the old raw-bytes sha256 for LF files. */
export const migrationChecksum = (sql: string) => sha256(toLf(sql));

/** Explicit per-file allowlist of other recorded checksums known to be safe. Keep it small and reviewed.
 *  0004: the original 547eaee version (it also created milestone_tokens / milestone_snapshots, dropped again by 0008), LF and CRLF. */
export const LEGACY_CHECKSUMS: Readonly<Record<string, readonly string[]>> = {
  "0004_referral_milestone.sql": [
    "16e9302a9bdde362d1e76f125a563f3ef4a4da410f2644b2f622c5b84b09f1e8",
    "1563d25a90e568aa3ac798a384f6a03e2270b7bcffb97b1c1d42a4a7c1ee7704",
  ],
};

/** Strict check of a recorded checksum against the file on disk. Accepted only when the content is the same up to line
 *  endings: the canonical LF checksum, or the checksum of the same content checked out with CRLF (recorded by a migrate run
 *  from a Windows core.autocrlf checkout), or an explicit LEGACY_CHECKSUMS entry. Any real content change still fails. */
export function checksumAccepted(file: string, sql: string, recorded: string): boolean {
  const lf = toLf(sql);
  if (recorded === sha256(lf)) return true;
  if (recorded === sha256(lf.replace(/\n/g, "\r\n"))) return true;
  return LEGACY_CHECKSUMS[file]?.includes(recorded) ?? false;
}