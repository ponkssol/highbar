/** Builds the unpacked extension into dist/: esbuild bundles, the Tailwind CSS, static files and fonts. */
import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, rmSync, copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const req = createRequire(join(root, "package.json"));
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "fonts"), { recursive: true });

// The API base is fixed at build time. Production builds use the default in src/lib/settings.ts. A dev build can point at a
// local or test API with HB_API_BASE (for example HB_API_BASE=http://127.0.0.1:8788 pnpm build). It is never set from the UI.
const apiOverride = (process.env.HB_API_BASE ?? "").trim().replace(/\/+$/, "");
if (apiOverride) {
  const u = new URL(apiOverride);
  const local = u.hostname === "localhost" || u.hostname === "127.0.0.1";
  if (u.protocol !== "https:" && !(u.protocol === "http:" && local)) throw new Error("HB_API_BASE must be https (http only for localhost)");
  if (u.pathname !== "/" || u.search || u.username) throw new Error("HB_API_BASE must be a bare origin");
  console.log("dev build: API base", u.origin);
}

const common = { bundle: true, platform: "browser" as const, target: "chrome116", minify: true, sourcemap: false, legalComments: "none" as const, logLevel: "info" as const,
  define: { "process.env.NODE_ENV": '"production"', global: "globalThis", __HB_API_BASE__: JSON.stringify(apiOverride ? new URL(apiOverride).origin : "") } };
// The worker bundles @meteora-ag/cp-amm-sdk (DAMM v2 sells), which pulls in Anchor: Node builtins it only touches outside a
// browser resolve to an empty module, and Anchor is told it runs in a browser (a service worker has no window).
const nodeStubs = { name: "node-stubs", setup(b: import("esbuild").PluginBuild) {
  b.onResolve({ filter: /^(util|fs|path|os|crypto)$/ }, (a) => ({ path: a.path, namespace: "node-stub" }));
  b.onLoad({ filter: /.*/, namespace: "node-stub" }, () => ({ contents: "module.exports = {}", loader: "js" }));
  // web3.js ships a public cluster URL table (clusterApiUrl) that the extension never calls. Blank the mainnet entry so no
  // public RPC URL lands in the bundle. The extension only talks to the highbar server RPC or the user's own RPC.
  b.onLoad({ filter: /[\\/]@solana[\\/]web3\.js[\\/]lib[\\/][^\\/]+\.js$/ }, (a) => ({
    contents: readFileSync(a.path, "utf8").replace(/https?:\/\/api\.mainnet-beta\.solana\.com\/?/g, ""), loader: "js" }));
  // Anchor and the cp-amm SDK use the global Buffer (a service worker has none, so migrated sells failed with "Buffer is not
  // defined"). The worker bundle gets the same buffer package web3.js already ships, injected where Buffer is referenced.
  b.onResolve({ filter: /^hb-buffer$/ }, () => ({ path: createRequire(req.resolve("@solana/web3.js")).resolve("buffer/") }));
  b.onResolve({ filter: /^hb-buffer-shim$/ }, () => ({ path: "hb-buffer-shim", namespace: "node-shim" }));
  b.onLoad({ filter: /.*/, namespace: "node-shim" }, () => ({ contents: 'export { Buffer } from "hb-buffer";', loader: "js", resolveDir: root }));
} };
await build({ ...common, define: { ...common.define, "process.env.ANCHOR_BROWSER": '"true"' }, plugins: [nodeStubs], inject: ["hb-buffer-shim"], entryPoints: { background: join(root, "src/background/index.ts") }, format: "esm", outdir: dist });
await build({ ...common, entryPoints: { content: join(root, "src/content/index.ts") }, format: "iife", outdir: dist });
await build({ ...common, entryPoints: { chart: join(root, "src/chart/chart.ts") }, format: "iife", outdir: dist });
// the CA popup: an ES module the content script imports on first use (web accessible, packaged, never remote)
await build({ ...common, entryPoints: { "ca-popup": join(root, "src/content/ca-popup.ts") }, format: "esm", outdir: dist });
await build({ ...common, entryPoints: { sidepanel: join(root, "src/ui/sidepanel.tsx") }, format: "esm", outdir: dist, jsx: "automatic" });

const tw = join(dirname(req.resolve("tailwindcss/package.json")), "lib/cli.js");
execFileSync(process.execPath, [tw, "-c", join(root, "tailwind.config.ts"), "-i", join(root, "src/ui/styles.css"), "-o", join(dist, "styles.css"), "--minify"], { cwd: root, stdio: "inherit" });

cpSync(join(root, "src/static"), dist, { recursive: true });
const fonts: [string, string][] = [
  ["@fontsource/inter/files/inter-latin-400-normal.woff2", "inter-400.woff2"], ["@fontsource/inter/files/inter-latin-500-normal.woff2", "inter-500.woff2"],
  ["@fontsource/inter/files/inter-latin-600-normal.woff2", "inter-600.woff2"], ["@fontsource/cinzel/files/cinzel-latin-600-normal.woff2", "cinzel-600.woff2"],
  ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-400-normal.woff2", "mono-400.woff2"], ["@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2", "mono-500.woff2"],
];
for (const [from, to] of fonts) copyFileSync(req.resolve(from), join(dist, "fonts", to));
// lightweight-charts (Apache-2.0) is bundled into chart.js: its NOTICE (attribution) and license ship with the extension, and the
// chart shows its attribution logo, a link to https://www.tradingview.com/
mkdirSync(join(dist, "licenses"), { recursive: true });
writeFileSync(join(dist, "licenses", "lightweight-charts.txt"), "TradingView Lightweight Charts\u2122\nCopyright (c) 2025 TradingView, Inc. https://www.tradingview.com/\n\n" +
  readFileSync(join(dirname(req.resolve("lightweight-charts/package.json")), "LICENSE"), "utf8"));

// version from package.json
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8")) as { version?: string };
const mf = JSON.parse(readFileSync(join(dist, "manifest.json"), "utf8")) as { version: string; host_permissions: string[] };
if (pkg.version) mf.version = pkg.version;
if (apiOverride) mf.host_permissions.push(`${new URL(apiOverride).origin}/*`);
writeFileSync(join(dist, "manifest.json"), JSON.stringify(mf, null, 2));

// guard: no secrets or env-provided URLs in the output
for (const f of ["background.js", "content.js", "sidepanel.js", "chart.js", "ca-popup.js"]) {
  const s = readFileSync(join(dist, f), "utf8");
  if (/NEXT_PUBLIC|helius|api-key=|RPC_URL/i.test(s)) throw new Error(`${f} contains a forbidden string`);
}
console.log("built", dist);
