import type { MetadataRoute } from "next";
import { SHORT_NAME, SITE_NAME } from "@/lib/seo";

export default function manifest(): MetadataRoute.Manifest {
  return { name: SITE_NAME, short_name: SHORT_NAME, description: "Launch tokens on Solana with highbar", start_url: "/", display: "standalone", background_color: "#0C0B09", theme_color: "#0C0B09", icons: [{ src: "/icons/hb-v5-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/icons/hb-v5-512.png", sizes: "512x512", type: "image/png", purpose: "any" }, { src: "/icons/hb-v5-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
