import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { messages } from "@/i18n/messages";
import { createMemoryStore, type Household, type HouseholdStore } from "@/lib/household";
import { HouseholdProvider } from "./HouseholdProvider";

/** Renders a screen with the Polish dictionary and a household store (memory by default). */
export function renderScreen(ui: ReactElement, store: HouseholdStore = createMemoryStore()) {
  return {
    store,
    ...render(
      <NextIntlClientProvider locale="pl" messages={messages}>
        <HouseholdProvider store={store}>{ui}</HouseholdProvider>
      </NextIntlClientProvider>,
    ),
  };
}

/** A memory store holding `household`, on a device that has already created its plan. */
export async function storeWithPlan(household: Household): Promise<HouseholdStore> {
  const store = createMemoryStore(household);
  await store.markPlanCreated();
  return store;
}
