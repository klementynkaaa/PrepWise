import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: the app is plain HTML/CSS/JS in `out/`, with no server at
  // runtime. A service worker (built by scripts/build-sw.mjs) precaches every
  // file so the app works offline, e.g. during a blackout.
  output: "export",
  images: {
    // The default image optimizer needs a server; static export can't use it.
    unoptimized: true,
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

export default nextConfig;
