import { defineRouting } from "next-intl/routing";

// One locale for now. The prefix is mandatory so every page lives under /pl
// and adding a language later does not move any existing URL.
export const routing = defineRouting({
  locales: ["pl"],
  defaultLocale: "pl",
  localePrefix: "always",
});

export type AppLocale = (typeof routing.locales)[number];
