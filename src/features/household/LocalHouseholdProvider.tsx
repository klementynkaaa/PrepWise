"use client";

import { useState, type ReactNode } from "react";
import { createPowerSyncStore } from "@/lib/household";
import { HouseholdProvider } from "./HouseholdProvider";

/**
 * The app's provider: household data kept on this device, in PowerSync's local
 * database. Nothing syncs from here and no request leaves the device.
 */
export function LocalHouseholdProvider({ children }: { children: ReactNode }) {
  // Creating the store touches nothing; the database opens on the first load().
  const [store] = useState(() => createPowerSyncStore());
  return <HouseholdProvider store={store}>{children}</HouseholdProvider>;
}
