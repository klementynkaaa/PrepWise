import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Static export: the app is plain HTML/CSS/JS in `out/`, with no server of
  // our own at runtime. Client code may call the approved hosted services
  // (Supabase, PowerSync); the only server code is Supabase Edge Functions
  // (AGENTS.md, constraint 1). A service worker (built by scripts/build-sw.mjs)
  // precaches every file so the app works offline, e.g. during a blackout.
  output: "export",
  images: {
    // The default image optimizer needs a server; static export can't use it.
    unoptimized: true,
  },
  experimental: {
    // Two root layouts (/ and /offline, and /[locale]) leave no single layout
    // to build the 404 page from; src/app/global-not-found.tsx replaces it.
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
