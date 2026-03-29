import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "BuddyLocation",
    short_name: "BuddyLocation",
    description: "Real-time friend location sharing with offline fallback support.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#05080f",
    theme_color: "#05080f",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
