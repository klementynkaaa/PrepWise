import type { MetadataRoute } from "next";
import { localePath } from "@/i18n/paths";
import messages from "../../messages/pl.json";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: messages.meta.title,
    short_name: messages.meta.appName,
    description: messages.meta.description,
    lang: "pl",
    start_url: localePath("/"),
    scope: "/",
    display: "standalone",
    // Both duplicate the `bg` token (#EFF4F6): the manifest can't read CSS.
    background_color: "#EFF4F6",
    theme_color: "#EFF4F6",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
