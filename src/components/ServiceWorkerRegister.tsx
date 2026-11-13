"use client";

import { useEffect } from "react";

// Registers the service worker built by scripts/build-sw.mjs. Production only:
// `next dev` doesn't produce out/sw.js, and a dev service worker would serve
// stale files while you work.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error: unknown) => {
      console.error("Service worker registration failed", error);
    });
  }, []);

  return null;
}
