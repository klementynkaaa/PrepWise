"use client";

import { useRef, type KeyboardEvent } from "react";

/**
 * Keyboard behaviour for a radiogroup of buttons: only the checked radio is
 * tabbable (roving tabindex); arrow keys move selection and focus, wrapping
 * around; Home/End jump to the ends. Space/Enter select via the native click.
 */
export function useRovingRadio<T extends string>(
  values: readonly T[],
  value: T,
  onChange: (next: T) => void,
) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const active = values.includes(value) ? value : values[0];

  function move(index: number, event: KeyboardEvent<HTMLButtonElement>) {
    const last = values.length - 1;
    let next: number;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = index === last ? 0 : index + 1;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = index === 0 ? last : index - 1;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = last;
        break;
      default:
        return;
    }
    event.preventDefault();
    onChange(values[next]);
    refs.current[next]?.focus();
  }

  return (index: number) => ({
    ref: (element: HTMLButtonElement | null) => {
      refs.current[index] = element;
    },
    type: "button" as const,
    role: "radio" as const,
    "aria-checked": values[index] === value,
    tabIndex: values[index] === active ? 0 : -1,
    onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => move(index, event),
    onClick: () => onChange(values[index]),
  });
}
