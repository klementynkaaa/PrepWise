import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

// Fonts are downloaded at build time and served from the app itself, so they
// work offline. `latin-ext` covers Polish characters (ą, ć, ę, ł, ń, ó, ś, ź, ż).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "latin-ext"],
});

export const metadata: Metadata = {
  applicationName: "PREPWISE",
  title: {
    default: "PREPWISE — Twój plan przygotowania",
    template: "%s · PREPWISE",
  },
  description: "Przygotuj zapasy awaryjne dla swojego domu — krok po kroku, także bez internetu.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PREPWISE",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon-192.png",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
