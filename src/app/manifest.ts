import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PREPWISE — Twój plan przygotowania",
    short_name: "PREPWISE",
    description: "Przygotuj zapasy awaryjne dla swojego domu — krok po kroku, także bez internetu.",
    lang: "pl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // Both duplicate the `bg` token (#EFF4F6): the manifest can't read CSS.
    background_color: "#EFF4F6",
    theme_color: "#EFF4F6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
