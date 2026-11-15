"use client";

import { useState, type ReactNode } from "react";
import { createIndexedDbStore } from "@/lib/household";
import { HouseholdProvider } from "./HouseholdProvider";

/** The app's provider: household data kept in IndexedDB on this device. */
export function IndexedDbHouseholdProvider({ children }: { children: ReactNode }) {
  // Creating the store touches nothing; IndexedDB opens on the first load().
  const [store] = useState(() => createIndexedDbStore());
  return <HouseholdProvider store={store}>{children}</HouseholdProvider>;
}
