import type { TierId } from "@hb/shared";
import { API_URL } from "./format";

export interface LaunchInput {
  name: string; ticker: string; description: string; image?: File | null;
  website?: string; twitter?: string; telegram?: string; tier: TierId; antiSniper: boolean;
}

/** Stub: will POST to `${NEXT_PUBLIC_API_URL}/launch` and sign the returned tx. */
export async function launchToken(input: LaunchInput): Promise<{ mint: string; stub: true }> {
  console.info("launchToken stub", { api: API_URL, ...input, image: input.image?.name });
  await new Promise((r) => setTimeout(r, 600));
  return { mint: "StubMint1111111111111111111111111111111111", stub: true };
}