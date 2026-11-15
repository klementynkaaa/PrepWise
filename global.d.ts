import type { routing } from "@/i18n/routing";
import type messages from "./messages/pl.json";

// Typed locales and message keys: a key that is not in messages/pl.json
// fails `npm run typecheck`.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
