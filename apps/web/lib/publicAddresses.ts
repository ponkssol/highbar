/**
 * Mainnet public accounts shown on /docs.
 *
 * The strings below are the addresses requested for the docs page. They are not read from
 * NEXT_PUBLIC_* env vars. publicAddresses.test.ts checks them against the checked-in sources
 * and fails on a conflict instead of letting the page silently show a different value:
 * - the six DBC configs and the fee claimer: packages/onchain/configs.mainnet.json
 * - the launchpad signer (not in that file): LAUNCHPAD_SIGNER_PUBKEY in docs/MAINNET_CHECKLIST.md
 *   and deploy/mainnet/api.env.template
 *
 * These are a signer, a fee wallet and DBC configuration accounts. They are not the $HIGHER mint.
 */
import { TIERS, type TierId } from "@hb/shared";

export const LAUNCHPAD_SIGNER = "866BuedbbZjbb1nEUGuqr8CB6g1Aj8J4xPJ47U5qhigh";
/** configs.mainnet.json `feeClaimer`. Partner fee claimer on the DBC configs. */
export const PARTNER_FEE_CLAIMER = "48UKpEwL4MzMxS7s8sZVZbCo4sEFP59CvermMniPhigh";

export type PublicRoleId = "launchpad-signer" | "fee-claimer";
export type PublicRole = { id: PublicRoleId; label: string; detail: string; address: string };

export const PUBLIC_ROLES: PublicRole[] = [
  {
    id: "launchpad-signer",
    label: "Launchpad common signer",
    detail: "Public key added as a read-only signer on every highbar launch transaction. It is the shared signer for highbar launches. It is not a token mint.",
    address: LAUNCHPAD_SIGNER,
  },
  {
    id: "fee-claimer",
    label: "Partner / platform fee-claimer wallet",
    detail: "Partner fee claimer on the six Meteora DBC configs. The platform claims its curve trading fees with this wallet. It is not the $HIGHER token mint.",
    address: PARTNER_FEE_CLAIMER,
  },
];

export type DbcConfigAddress = { tier: TierId; antiSniper: boolean; address: string };

/** Same order as packages/onchain/configs.mainnet.json. */
export const DBC_CONFIGS: DbcConfigAddress[] = [
  { tier: "standard", antiSniper: false, address: "5WKoTa3R3ocVEUEbGEAjkpM1HjtrCUR3mGLf1xCuSi9x" },
  { tier: "standard", antiSniper: true, address: "49ZrJxJUqCzovYNGchxMvAivqDPgXY2ThiQai4T1P82y" },
  { tier: "higher", antiSniper: false, address: "3xK6Ga1hByuK75U4Bv7Tj8LSmsQj9CuUQKW8Tj93FoqN" },
  { tier: "higher", antiSniper: true, address: "7XmABRc7HtPrXsA1mcJSy4jYEbnZY439e1DHckiJ1q2J" },
  { tier: "max", antiSniper: false, address: "6qKCzc5UajAFedp35T3AAbEEoMuh8FxNiAxjA97RNK82" },
  { tier: "max", antiSniper: true, address: "GBM9m9g96Y6CP8nzEQuPeGJpsmf9PfR1SWuxeUDHbrfN" },
];

export const ADDRESS_INTRO = [
  "highbar does not run a launchpad program of its own. A launch creates a Meteora Dynamic Bonding Curve (DBC) pool, and a token that reaches its target graduates into a Meteora DAMM v2 pool. The addresses on this page are the public accounts behind that: the launchpad signer, the partner fee wallet, and the six DBC configuration accounts.",
  "They are mainnet account addresses. They are not the $HIGHER token mint, and they are not the mint of a token you launch. $HIGHER has no mint address on this page. Each launched token has its own SPL mint, on that token's page.",
];

/** Do not describe these accounts as submitted or verified by Meteora. Checklist notes about registration are drafts and are not copied here. */
export const ADDRESS_DISCLAIMER = "These addresses are published so anyone can open the accounts on Solscan. A listing here is not a statement that Meteora submitted, reviewed or verified the account.";

export const CONFIG_INTRO = "Every launch uses one of these six Meteora DBC configs. The tier sets the migration target and how fees are shared. Anti-sniper is off or on for that config.";
export const CONFIG_AFTER = "Anti-sniper on is the decaying fee. Anti-sniper off is the flat curve fee from the first trade.";

export const antiSniperLabel = (on: boolean) => (on ? "On" : "Off");
export const tierLabel = (tier: TierId) => TIERS[tier].label;
export const configKey = (tier: TierId, antiSniper: boolean) => `${tier}_${antiSniper ? "on" : "off"}`;

/** Mainnet Solscan account URL. No cluster query: these addresses are mainnet, whatever cluster the app is configured for. */
export const solscanAccountUrl = (address: string) => `https://solscan.io/account/${encodeURIComponent(address)}`;

export const ALL_PUBLIC_ADDRESSES = [LAUNCHPAD_SIGNER, PARTNER_FEE_CLAIMER, ...DBC_CONFIGS.map((c) => c.address)];
