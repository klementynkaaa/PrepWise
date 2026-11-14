/** Joins class names, skipping empty parts. Internal to the design system. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
