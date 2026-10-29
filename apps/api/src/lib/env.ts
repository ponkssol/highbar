import { z } from "zod";
export const env = z.object({
  DATABASE_URL: z.string(), RPC_URL: z.string().url(), HELIUS_WEBHOOK_SECRET: z.string(), TEST_POOL: z.string().optional(),
  PINATA_JWT: z.string().default(""), PINATA_GATEWAY: z.string().default(""), DBC_CONFIGS: z.string().transform((s) => s.split(",")),
  BAR_MINT: z.string().optional(),
  /** Our Meteora referral token account (quote/WSOL ATA). A swap carrying it = UI swap (via_ui). */
  PLATFORM_REFERRAL_TOKEN_ACCOUNT: z.string().optional(),
  /** Multisig TBD: claimed fees go here (Squads vault once decided). */
  TREASURY_PUBKEY: z.string().optional(),
  BUYBACK_MAX_ORDER_LAMPORTS: z.coerce.bigint().default(1_000_000_000n), BUYBACK_MAX_SLIPPAGE_BPS: z.coerce.number().default(100),
  DRY_RUN: z.string().default("true").transform((v) => v !== "false"),
}).parse(process.env);
