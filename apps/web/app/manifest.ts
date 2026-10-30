import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "highbar", short_name: "highbar", description: "Launch tokens on Solana with highbar", start_url: "/", display: "standalone", background_color: "#F6F3EC", theme_color: "#111111", icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }, { src: "/apple-icon.png", sizes: "180x180", type: "image/png" }] };
}
