/** Metaplex token metadata on chain (pure, tested): the metadata account address of a mint and the uri inside it. */
import { PublicKey } from "@solana/web3.js";

export const METAPLEX_PROGRAM = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";

/** PDA ["metadata", program, mint] of the Metaplex token metadata program. */
export function metadataPda(mint: string): string {
  const p = new PublicKey(METAPLEX_PROGRAM);
  return PublicKey.findProgramAddressSync([new TextEncoder().encode("metadata"), p.toBytes(), new PublicKey(mint).toBytes()], p)[0].toBase58();
}

/** The uri field of a Metaplex metadata account (base64 account data): key u8, update authority, mint, then name, symbol and
 *  uri as u32 length prefixed strings (padded with NULs). null when the data is not one or the uri is not https/ipfs/ar. */
export function metaplexUri(b64: string): string | null {
  let b: Uint8Array;
  try { b = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)); } catch { return null; }
  if (b.length < 1 + 32 + 32 + 12 || b[0] !== 4) return null; // Key::MetadataV1
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let o = 65;
  const str = (max: number): string | null => {
    if (o + 4 > b.length) return null;
    const n = dv.getUint32(o, true); o += 4;
    if (n > max || o + n > b.length) return null;
    const s = new TextDecoder().decode(b.subarray(o, o + n)); o += n;
    return s.replace(/\0+$/g, "").trim();
  };
  if (str(200) === null || str(50) === null) return null;
  const uri = str(400);
  return uri && /^(https:\/\/|ipfs:\/\/|ar:\/\/)/i.test(uri) ? uri.replace(/^ar:\/\//i, "https://arweave.net/") : null;
}
