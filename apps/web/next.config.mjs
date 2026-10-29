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
  webpack: (config) => {
    config.resolve.extensionAlias = { ".js": [".ts", ".tsx", ".js"] };
    config.externals = [...(config.externals || []), "pino-pretty", "lokijs", "encoding"];
    return config;
  },
};
export default nextConfig;
