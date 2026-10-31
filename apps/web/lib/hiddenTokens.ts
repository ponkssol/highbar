import { hiddenMintSet, withoutHidden } from "@hb/shared";

/** Server-side only (sitemap, tokens.md, generateMetadata): the built-in hidden test token list from @hb/shared plus the optional
 *  HIDDEN_TOKEN_MINTS env var (comma-separated mints, never a browser-exposed public var). The API already leaves these out of its lists,
 *  this keeps the web listings right on its own too. */
export const hiddenMints = () => hiddenMintSet(process.env.HIDDEN_TOKEN_MINTS);
export const isHiddenToken = (t: { mint: string; hidden?: boolean }) => !!t.hidden || hiddenMints().has(t.mint);
export const visibleOnly = <T extends { mint: string }>(rows: readonly T[]) => withoutHidden(rows, hiddenMints());
