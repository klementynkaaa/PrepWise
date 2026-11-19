import { act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderScreen } from "@/features/household/test-utils";
import { Generating, SAVE_TIMEOUT_MS, STEP_MS } from "./Generating";

const SAVE_STARTS_MS = STEP_MS * 3;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("Generating", () => {
  it("fails a save that never settles after the timeout, once", async () => {
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    renderScreen(
      <Generating save={() => new Promise(() => {})} onSaved={onSaved} onFailed={onFailed} />,
    );

    await act(() => vi.advanceTimersByTimeAsync(SAVE_STARTS_MS + SAVE_TIMEOUT_MS - 1));
    expect(onFailed).not.toHaveBeenCalled();

    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("ignores a save that resolves after the timeout already failed it", async () => {
    let resolveSave: () => void = () => {};
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    renderScreen(
      <Generating
        save={() => new Promise<void>((resolve) => (resolveSave = resolve))}
        onSaved={onSaved}
        onFailed={onFailed}
      />,
    );

    await act(() => vi.advanceTimersByTimeAsync(SAVE_STARTS_MS + SAVE_TIMEOUT_MS));
    await act(async () => resolveSave());
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("opens the plan when the save resolves in time, and the timeout never fires", async () => {
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    renderScreen(
      <Generating save={() => Promise.resolve()} onSaved={onSaved} onFailed={onFailed} />,
    );

    await act(() => vi.advanceTimersByTimeAsync(SAVE_STARTS_MS + SAVE_TIMEOUT_MS * 2));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onFailed).not.toHaveBeenCalled();
  });

  it("neither fails nor opens the plan when it closes while the save hangs", async () => {
    const onSaved = vi.fn();
    const onFailed = vi.fn();
    const { unmount } = renderScreen(
      <Generating save={() => new Promise(() => {})} onSaved={onSaved} onFailed={onFailed} />,
    );

    await act(() => vi.advanceTimersByTimeAsync(SAVE_STARTS_MS));
    unmount();
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS * 2);
    expect(onFailed).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
