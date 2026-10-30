import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "highbar", short_name: "highbar", description: "Launch tokens on Solana with highbar", start_url: "/", display: "standalone", background_color: "#0C0B09", theme_color: "#0C0B09", icons: [{ src: "/icons/favicon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icons/favicon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icons/favicon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
