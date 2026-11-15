"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Replaces the current history entry with the app's home, so Back doesn't loop. */
export function ForwardToApp({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => {
    router.replace(href);
  }, [router, href]);
  return null;
}
