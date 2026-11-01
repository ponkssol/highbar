/** Tweet to launch draft: pure helpers (unit tested) plus the DOM reader the content script uses on x.com. */
export const NAME_MAX_BYTES = 32;
export const TICKER_MAX_BYTES = 10;

export interface TweetInfo { url: string; id: string; handle: string; author: string; text: string; images: string[]; avatar: string | null }
export interface LaunchDraft { name: string; ticker: string; imageUrl: string | null; tweetUrl: string; description: string }

const bytes = (s: string) => new TextEncoder().encode(s).length;
/** Same cleanup the API applies to labels: control and zero width characters out, then trimmed. */
export const cleanLabel = (s: string) => s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u2064\ufeff]/g, "").trim();
/** Cuts a string to at most n UTF-8 bytes without splitting a character. */
export function clipBytes(s: string, n: number): string {
  let out = "";
  for (const ch of s) { if (bytes(out + ch) > n) break; out += ch; }
  return out;
}
/** Cuts at a word boundary when possible. */
function clipWords(s: string, n: number): string {
  if (bytes(s) <= n) return s;
  const words = s.split(" ");
  let out = "";
  for (const w of words) { const next = out ? `${out} ${w}` : w; if (bytes(next) > n) break; out = next; }
  return out || clipBytes(s, n);
}

const STATUS = /^\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{5,25})/;
/** https://x.com/<handle>/status/<id> from any permalink form (twitter.com, mobile, /photo/1, query strings). */
export function canonicalTweetUrl(href: string): string | null {
  let u: URL;
  try { u = new URL(href, "https://x.com"); } catch { return null; }
  if (!/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/i.test(u.hostname)) return null;
  const m = STATUS.exec(u.pathname);
  return m ? `https://x.com/${m[1]}/status/${m[2]}` : null;
}
export const tweetIdOf = (url: string) => STATUS.exec(new URL(url).pathname)?.[2] ?? null;

/** Tweet media at a size that fits the 2 MB metadata limit (name=medium is at most 1200 px). Photos, video and GIF
 *  poster frames, link card images and profile pictures, all from pbs.twimg.com. */
export function mediaUrl(src: string): string | null {
  let u: URL;
  try { u = new URL(src); } catch { return null; }
  if (u.hostname !== "pbs.twimg.com" || u.protocol !== "https:") return null;
  const p = u.pathname;
  if (p.startsWith("/media/") || p.startsWith("/card_img/")) {
    const fmt = (u.searchParams.get("format") ?? (/\.(png|jpe?g|webp)$/i.exec(p)?.[1] ?? "jpg")).toLowerCase();
    return `https://pbs.twimg.com${p.replace(/\.(png|jpe?g|webp)$/i, "")}?format=${fmt === "jpeg" ? "jpg" : fmt}&name=${p.startsWith("/card_img/") ? "large" : "medium"}`;
  }
  // video and GIF posters: ext_tw_video_thumb, amplify_video_thumb, tweet_video_thumb
  if (/^\/(ext_tw_video_thumb|amplify_video_thumb|tweet_video_thumb)\//.test(p)) {
    const fmt = u.searchParams.get("format");
    return fmt ? `https://pbs.twimg.com${p}?format=${fmt.toLowerCase()}&name=small` : `https://pbs.twimg.com${p}`;
  }
  if (p.startsWith("/profile_images/")) return `https://pbs.twimg.com${p.replace(/_(normal|bigger|mini|x96|200x200)(\.\w+)$/, "_400x400$2")}`;
  return null;
}

/** Every image in a tweet, in page order: its photos (all of a multi photo post), video and GIF posters, a quoted post's
 *  media and link card images. Avatars are returned apart. Duplicates (the same file at other sizes) are dropped. */
export const MEDIA_MAX = 12;
export function collectMedia(article: Element): { images: string[]; avatar: string | null } {
  const srcs: string[] = [];
  const sel = [
    '[data-testid="tweetPhoto"] img', '[data-testid="tweetPhoto"] video[poster]', '[data-testid="videoPlayer"] video[poster]', '[data-testid="videoComponent"] video[poster]',
    '[data-testid="previewInterstitial"] img', 'img[src*="/ext_tw_video_thumb/"]', 'img[src*="/amplify_video_thumb/"]', 'img[src*="/tweet_video_thumb/"]',
    '[data-testid="card.wrapper"] img', '[data-testid="card.layoutLarge.media"] img', '[data-testid="card.layoutSmall.media"] img',
  ].join(",");
  article.querySelectorAll(sel).forEach((el) => { const v = el.getAttribute(el.tagName.toLowerCase() === "video" ? "poster" : "src"); if (v) srcs.push(v); });
  const seen = new Set<string>(), images: string[] = [];
  for (const s of srcs) {
    const m = mediaUrl(s); if (!m) continue;
    const key = m.replace(/[?#].*$/, "");
    if (seen.has(key)) continue;
    seen.add(key); images.push(m);
    if (images.length >= MEDIA_MAX) break;
  }
  const av = article.querySelector('[data-testid="Tweet-User-Avatar"] img') ?? article.querySelector('img[src*="/profile_images/"]');
  return { images, avatar: av ? mediaUrl(av.getAttribute("src") ?? "") : null };
}

/** The X link for the token metadata, as the API takes it: an @handle (or bare handle) or an x.com or twitter.com URL.
 *  Returns the normalized https://x.com/... link, "" for empty, or null when it is not valid. */
export function normalizeXLink(v: string): string | null {
  const s = v.trim();
  if (!s) return "";
  if (s.length > 200) return null;
  const h = /^@?([A-Za-z0-9_]{1,32})$/.exec(s);
  if (h) return `https://x.com/${h[1]}`;
  let u: URL;
  try { u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(s) ? s : `https://${s}`); } catch { return null; }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (!/^(?:www\.|mobile\.)?(?:x|twitter)\.com$/i.test(u.hostname) || u.username || u.password) return null;
  const tweet = canonicalTweetUrl(u.toString());
  if (tweet) return tweet;
  const path = u.pathname.replace(/\/+$/, "");
  return /^\/[A-Za-z0-9_]{1,32}(\/[\w./-]*)?$/.test(path) ? `https://x.com${path}` : null;
}

const URLS = /https?:\/\/\S+|\b\w+\.(?:com|io|xyz|fun|app|net|org)\/\S*/gi;
const MENTION = /(^|\s)@\w{1,15}/g;
const EMOJI = /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{FE0F}\u{200D}]/gu;
const CASHTAG = /(?:^|[^\w$])\$([A-Za-z][A-Za-z0-9]{1,9})\b/;

/** Cashtag in the tweet ($TEST), upper cased. */
export const cashtagOf = (text: string) => CASHTAG.exec(text)?.[1]?.toUpperCase() ?? null;

/** Name: the capitalized words right before a cashtag, else the first line of the tweet without links, mentions, cashtags, hashtags or emoji, cut to 32 bytes at a word.
 *  Falls back to the author's display name. */
const LEAD_VERBS = new Set(["introducing", "meet", "launching", "announcing", "presenting", "say", "welcome", "buy", "ape"]);
/** "Introducing Test Coin $TEST" names the coin right before its cashtag: up to 3 capitalized words, without a lead verb. */
function nameBeforeCashtag(text: string): string {
  const m = /((?:[\p{Lu}\p{N}][\p{L}\p{N}'’-]*\s+){1,4})\$[A-Za-z][A-Za-z0-9]{0,9}\b/u.exec(text.replace(EMOJI, " "));
  if (!m) return "";
  const words = m[1].trim().split(/\s+/);
  while (words.length > 1 && LEAD_VERBS.has(words[0].toLowerCase())) words.shift();
  return cleanLabel(clipWords(words.slice(-3).join(" "), NAME_MAX_BYTES));
}

export function suggestName(text: string, author = ""): string {
  const tagged = nameBeforeCashtag(text);
  if (tagged) return tagged;
  const firstLine = text.split(/\n+/).map((l) => l.replace(URLS, " ").replace(MENTION, " ").replace(/[$#]\w+/g, " ").replace(EMOJI, " ").replace(/\s+/g, " ").trim()).find((l) => /[\p{L}\p{N}]/u.test(l)) ?? "";
  const sentence = (firstLine.split(/(?<=[.!?])\s/)[0] ?? "").replace(/[.!?,:;]+$/, "").trim();
  const name = cleanLabel(clipWords(sentence, NAME_MAX_BYTES));
  if (name) return name;
  return cleanLabel(clipWords(author.replace(EMOJI, " ").replace(/\s+/g, " ").trim(), NAME_MAX_BYTES)) || "Untitled";
}

/** Ticker: the cashtag, else the initials of a multi word name (at least 3 letters), else the first word. A-Z and 0-9 only, at most 10. */
export function suggestTicker(text: string, name: string): string {
  const tag = cashtagOf(text);
  if (tag) return tag.slice(0, TICKER_MAX_BYTES);
  const words = name.normalize("NFKD").replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.map((w) => w[0]).join("").toUpperCase().slice(0, TICKER_MAX_BYTES);
  const one = (words[0] ?? "").toUpperCase().slice(0, TICKER_MAX_BYTES);
  return one || "TOKEN";
}

export function draftFromTweet(t: TweetInfo): LaunchDraft {
  const name = suggestName(t.text, t.author);
  return {
    name, ticker: suggestTicker(t.text, name),
    imageUrl: t.images[0] ?? t.avatar ?? null,
    tweetUrl: t.url,
    description: clipBytes(t.text.replace(/\s+\n/g, "\n").trim(), 1000),
  };
}

/** Reads a tweet from its article element on x.com. Returns null for ads, quoted cards or anything without a permalink. */
export function readTweet(article: Element): TweetInfo | null {
  const timeLink = article.querySelector('a[href*="/status/"] time')?.closest("a") ?? null;
  const url = canonicalTweetUrl(timeLink?.getAttribute("href") ?? "") ?? (typeof location !== "undefined" ? canonicalTweetUrl(location.href) : null);
  if (!url) return null;
  const nameBox = article.querySelector('[data-testid="User-Name"]');
  const author = nameBox?.querySelector("span")?.textContent?.trim() ?? "";
  const handle = /^\/([A-Za-z0-9_]{1,15})\/status/.exec(new URL(url).pathname)?.[1] ?? "";
  // The tweet's own text (the first one; a quoted tweet sits further down in its own block).
  const textEl = article.querySelector('[data-testid="tweetText"]');
  const text = textEl ? textFrom(textEl) : "";
  const { images, avatar } = collectMedia(article);
  return { url, id: tweetIdOf(url) ?? "", handle, author, text, images, avatar };
}

/** Text with emoji images turned back into their alt text and line breaks kept. */
function textFrom(el: Element): string {
  let out = "";
  el.childNodes.forEach(function walk(n: ChildNode) {
    if (n.nodeType === 3) out += n.textContent ?? "";
    else if (n.nodeName === "IMG") out += (n as Element).getAttribute("alt") ?? "";
    else if (n.nodeName === "BR") out += "\n";
    else n.childNodes.forEach(walk);
  });
  return out;
}
