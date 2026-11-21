import type { routing } from "@/i18n/routing";
import type { Messages } from "@/i18n/messages";

// Typed locales and message keys: a key that is in neither messages/pl.json nor messages/pl.knowledge.json
// fails `npm run typecheck`.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: Messages;
  }
}
