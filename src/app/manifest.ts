import type { MetadataRoute } from "next";
import { localePath } from "@/i18n/paths";
import { THEME_COLOR } from "@/lib/theme-color";
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
    // The manifest can't read CSS, so both use the shared copy of the `bg` token.
    background_color: THEME_COLOR,
    theme_color: THEME_COLOR,
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
