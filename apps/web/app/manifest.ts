import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { name: "highbar", short_name: "highbar", description: "Launch tokens on Solana with highbar", start_url: "/", display: "standalone", background_color: "#F6F3EC", theme_color: "#111111", icons: [] };
}
