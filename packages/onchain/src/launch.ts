import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { NATIVE_MINT_ADDR, } from "./constants.js";
import { arg, configPubkey, getClient, isMain, loadPlatformKeypair, usableReferralAta, sendTx } from "./client.js";
import { deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";

export interface LaunchParams {
  name: string;
  symbol: string;
  uri: string;
  tier: string;
  antiSniper: boolean;
  creator: Keypair;
  /** optional first buy in lamports */
  firstBuyLamports?: BN;
  minTokensOut?: BN;
}

/**
 * Referral account for the dev first buy bundled with pool creation. DBC only gives that first swap the scheduler's MIN fee
 * when config.enableFirstSwapWithMinFee is set AND the swap has no referral account, so on those configs (the anti-sniper
 * "_on" configs) the referral is always omitted. Otherwise the platform referral is kept (null when it is not initialized).
 */
export async function devBuyReferral(enableFirstSwapWithMinFee: number | boolean | undefined, platformReferral: () => Promise<PublicKey | null>): Promise<PublicKey | null> {
  return enableFirstSwapWithMinFee ? null : platformReferral();
}

export interface LaunchResult {
  mint: string;
  pool: string;
  config: string;
  signature: string;
}

export async function launchToken(p: LaunchParams): Promise<LaunchResult> {
  const client = getClient();
  const config = configPubkey(p.tier, p.antiSniper);
  const baseMint = Keypair.generate();
  const createPoolParam = {
    name: p.name,
    symbol: p.symbol,
    uri: p.uri,
    payer: p.creator.publicKey,
    poolCreator: p.creator.publicKey,
    config,
    baseMint: baseMint.publicKey,
  };
  const tx = p.firstBuyLamports && !p.firstBuyLamports.isZero()
    ? await client.creator.createPoolWithFirstBuy({
        createPoolParam,
        firstBuyParam: {
          buyer: p.creator.publicKey,
          buyAmount: p.firstBuyLamports,
          minimumAmountOut: p.minTokensOut ?? new BN(1),
          // never a referral on the _on configs, or the dev buy would pay the anti-sniper cliff fee
          referralTokenAccount: await devBuyReferral((await client.state.getPoolConfig(config))?.enableFirstSwapWithMinFee, usableReferralAta),
        },
      })
    : await client.creator.createPool(createPoolParam);
  const signature = await sendTx(tx, [p.creator, baseMint]);
  const pool = deriveDbcPoolAddress(new PublicKey(NATIVE_MINT_ADDR), baseMint.publicKey, config);
  return { mint: baseMint.publicKey.toBase58(), pool: pool.toBase58(), config: config.toBase58(), signature };
}

// CLI: tsx src/launch.ts --name X --symbol X --uri https://.. --tier standard [--anti on] --buy 0.1 (anti-sniper is off unless --anti on)
if (isMain(import.meta.url)) {
  const sol = Number(arg("buy", "0"));
  launchToken({
    name: arg("name", "Test")!,
    symbol: arg("symbol", "TEST")!,
    uri: arg("uri", "")!,
    tier: arg("tier", "standard")!,
    antiSniper: arg("anti", "off") === "on",
    creator: loadPlatformKeypair(),
    firstBuyLamports: sol > 0 ? new BN(Math.round(sol * 1e9)) : undefined,
  }).then((r) => console.log(JSON.stringify(r, null, 2)), (e) => { console.error(e); process.exit(1); });
}