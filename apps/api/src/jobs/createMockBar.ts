/** Devnet only: create a mock $BAR mint (6 decimals, platform keypair = mint authority) for the mock buyback path.
 *  pnpm --filter @hb/api bar:mock-mint   -> prints BAR_MINT=<mint> for apps/api/.env */
import { Keypair } from "@solana/web3.js";
import { createMint } from "@solana/spl-token";
import { getConnection, loadPlatformKeypair } from "@hb/onchain";
import { jobs } from "./config.js";
import { assertCluster } from "./chain.js";

async function main() {
  if (jobs.network !== "devnet") throw new Error("mock BAR is devnet only (NETWORK=devnet)");
  await assertCluster(true);
  const payer = loadPlatformKeypair(), conn = getConnection();
  const bal = await conn.getBalance(payer.publicKey);
  if (bal < 5_000_000) throw new Error(`platform keypair ${payer.publicKey.toBase58()} has ${bal / 1e9} SOL on devnet; airdrop first (solana airdrop 1 ${payer.publicKey.toBase58()} -u devnet)`);
  const mint = await createMint(conn, payer, payer.publicKey, null, 6, Keypair.generate(), { commitment: "confirmed" });
  console.log(`mock BAR mint created (authority ${payer.publicKey.toBase58()})\nBAR_MINT=${mint.toBase58()}`);
}
main().catch((e) => { console.error(e.message); process.exit(1); });
