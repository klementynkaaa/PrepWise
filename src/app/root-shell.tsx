import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

// Everything the root layouts share, so they cannot drift apart and none of
// them can lose the service worker. Importing globals.css here also gives
// every page (and the 404 page) its styles.

// Plus Jakarta Sans is the system's only family. It's downloaded at build time
// and served from the app itself, so it works offline. `latin-ext` covers
// Polish characters.
const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin", "latin-ext"],
});

type MetaCopy = { appName: string; title: string; description: string };

/** Root metadata. The words come from the dictionary, passed in by the caller. */
export function rootMetadata({ appName, title, description }: MetaCopy): Metadata {
  return {
    applicationName: appName,
    title: { default: title, template: `%s · ${appName}` },
    description,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: appName,
    },
    icons: {
      icon: [
        { url: "/icons/icon.svg", type: "image/svg+xml" },
        { url: "/icons/favicon-32.png", sizes: "32x32" },
      ],
      apple: "/icons/apple-touch-icon.png",
    },
    formatDetection: { telephone: false },
  };
}

// Light theme only in v1. themeColor duplicates the `bg` token (#EFF4F6)
// because metadata can't read CSS variables.
export const rootViewport: Viewport = {
  themeColor: "#EFF4F6",
  colorScheme: "light",
};

export function RootShell({ lang, children }: { lang: string; children: ReactNode }) {
  return (
    <html lang={lang} className={`${plusJakarta.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
