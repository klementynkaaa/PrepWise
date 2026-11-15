import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMemoryStore, type HouseholdStore } from "@/lib/household";
import { HouseholdProvider } from "./HouseholdProvider";
import { useHousehold } from "./useHousehold";

function Status() {
  return <p>{useHousehold().status}</p>;
}

describe("HouseholdProvider", () => {
  it("starts loading, then reports the stored state", async () => {
    render(
      <HouseholdProvider store={createMemoryStore()}>
        <Status />
      </HouseholdProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(await screen.findByText("ready")).toBeInTheDocument();
  });

  it("treats a store whose load() rejects as unavailable instead of loading forever", async () => {
    const store: HouseholdStore = {
      ...createMemoryStore(),
      load: () => Promise.reject(new Error("boom")),
    };
    render(
      <HouseholdProvider store={store}>
        <Status />
      </HouseholdProvider>,
    );
    expect(await screen.findByText("unavailable")).toBeInTheDocument();
  });
});
