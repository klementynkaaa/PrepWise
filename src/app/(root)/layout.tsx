import type { Metadata } from "next";
import messages from "../../../messages/pl.json";
import { RootShell, rootMetadata, rootViewport } from "../root-shell";

// Root layout for "/" and "/offline". Both are Polish and need no locale
// lookup, so they read the dictionary directly.
export const metadata: Metadata = rootMetadata(messages.meta);
export const viewport = rootViewport;

export default function RootGroupLayout({ children }: LayoutProps<"/">) {
  return <RootShell lang="pl">{children}</RootShell>;
}
