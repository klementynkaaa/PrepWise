// Pure CalVer release tag logic: vYYYY.MM.DD, with .2, .3, ... for later
// releases on the same day. The day is the Europe/Warsaw calendar day.

const TIME_ZONE = "Europe/Warsaw";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "2026-11-14" for the Warsaw calendar day containing `date`.
export function warsawDay(date) {
  const parts = Object.fromEntries(formatter.formatToParts(date).map((p) => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}

// The first free tag for `date`, given every existing tag name.
// Unrelated tags (other formats, other days) are ignored.
export function nextReleaseTag(date, existingTags = []) {
  const [year, month, day] = warsawDay(date).split("-");
  const base = `v${year}.${month}.${day}`;
  const taken = new Set(existingTags);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n += 1) {
    const candidate = `${base}.${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}
