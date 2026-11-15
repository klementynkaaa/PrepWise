"use client";

import { useContext } from "react";
import { HouseholdContext, type HouseholdContextValue } from "./HouseholdProvider";

/** The stored household and the `saveStep` action. Needs a HouseholdProvider above. */
export function useHousehold(): HouseholdContextValue {
  const value = useContext(HouseholdContext);
  if (!value) throw new Error("useHousehold needs a HouseholdProvider");
  return value;
}
