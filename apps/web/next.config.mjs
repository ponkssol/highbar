import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: root,
  experimental: { devtoolSegmentExplorer: false },
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  devIndicators: false,
  transpilePackages: ["@hb/shared"],
  // Render <title>/<meta> in <head> for every client, not only known bots (Next 15 streams metadata into <body> otherwise), so link
  // previews, smaller crawlers and audits all read the description. Pages fetch the same cached data anyway.
  htmlLimitedBots: /.*/,
  // Merged pages: old URLs stay valid (API-generated /cashback, /burn, /referral links too). Incoming query strings (e.g. ?ref=) are kept.
  // /higher is the friendly $HIGHER perks alias; it points straight at the merged tab (not via /bar) so it is a single hop.
  async redirects() {
    const to = (source, page, tab) => ({ source, destination: `/${page}?tab=${tab}`, permanent: false });
    return [
      to("/higher", "rewards", "bar"),
      to("/cashback", "rewards", "cashback"),
      to("/referral", "rewards", "referral"),
      to("/milestones", "rewards", "milestones"),
      to("/bar", "rewards", "bar"),
      to("/burn", "rewards", "burn"),
      to("/claim", "portfolio", "claim"),
      to("/about", "settings", "about"),
    ];
  },
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    config.externals = [...(config.externals || []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
};
export default nextConfig;
