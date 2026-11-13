/// <reference lib="esnext" />
/// <reference lib="webworker" />
// Service worker source. Bundled into `out/sw.js` by scripts/build-sw.mjs after
// `next build`; the build replaces `self.__SW_MANIFEST` with every file in the
// static export, so all pages and assets are available offline.
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  precacheOptions: {
    // `/plan` -> `plan.html`, `/` -> `index.html` (static export file layout).
    cleanURLs: true,
    directoryIndex: "index.html",
    cleanupOutdatedCaches: true,
    // Next.js adds `?_rsc=<hash>` to in-app navigation requests; ignore it so
    // those requests hit the precached `.txt` payloads while offline.
    ignoreURLParametersMatching: [/^_rsc$/, /^utm_/, /^fbclid$/],
  },
  // Activate a new version as soon as it's downloaded (while online), so users
  // pick up updates on their next visit.
  skipWaiting: true,
  clientsClaim: true,
  // Page navigations that aren't precached go to the network. Serwist attaches
  // the fallback below to this route, so it needs to exist even though every
  // regular page is answered from the precache first.
  runtimeCaching: [
    {
      matcher: ({ request }) => request.mode === "navigate",
      handler: new NetworkOnly(),
    },
  ],
  // Pages that aren't precached (e.g. a mistyped URL) fall back to a cached
  // offline page instead of the browser's error screen.
  fallbacks: {
    entries: [
      {
        // Exact precache key of the exported page (out/offline.html).
        url: "/offline.html",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();
