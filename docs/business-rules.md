# Business rules

These rules decide which supplies a household needs and in what order. Keep them in pure, unit-tested functions, not in UI components.

## Quantities

```
recommended quantity = amount per person per day × number of people × number of days
```

- **Duration:** the initial plan covers the first **72 hours** (3 days), the official baseline. The household can extend it to **7 or 14 days**; quantities scale with the number of days, and the longer period is shown as the household's own choice, not an official requirement. When the period grows, items whose quantity increases go back on the list as not yet done; the rest keep their tick.
- **Adults** use the standard per-person amounts.
- **Children** get age-appropriate food, clothing, medication and hygiene supplies.
- **Elderly people** get extra items for mobility, medication and specific care needs.
- **Pets** get separate food and water amounts, based on animal type and size.
- **Declared medical needs** add the relevant supplies: regular medicines add a reminder to keep the household's own dose for the period (never a calculated dose), and powered medical equipment adds backup power.
- **Housing** adds an item: water for flushing in a flat, backup heating in a house.
- **Limited mobility** adds spare power for mobility aids and a whistle.

_Example (illustrative, figure not yet verified):_ at 3 L of drinking water per person per day, a household of three needs 3 × 3 × 3 = **27 L** for 72 hours.

## Source labelling

Every recommended quantity in the plan shows exactly one of these labels:

- **Official guidance:** the figure comes from official Polish recommendations.
- **PREPWISE recommendation:** the figure is PREPWISE's own estimate. Use this where official guidance gives no per-person amount.

Never show an estimate as if it were official. A figure shows "Official guidance" only once it has been verified against a named official source; until then, including every draft figure, it shows "PREPWISE recommendation". The code enforces this, not the content author.

"Official guidance" ("Oficjalne" in the app) needs all of these:

- the item's evidence cites a source from the register that is official, meaning an https page on gov.pl (including PSP and RCB pages);
- a verbatim quote from that source;
- the owner as verifier, with the date of verification;
- an archived (Wayback) link on the source.

Anything less shows "PREPWISE recommendation". The knowledge-base check in CI enforces this; see `knowledge/README.md`.

The shopping list repeats the plan's quantities without the label; it links to the sources ("Skąd te ilości?") instead.

## Priority

Priority goes by criticality, not by a fixed category order:

1. **Essential survival:** water, essential food, necessary medication, first aid
2. **Basic safety and functioning:** lighting, communication, hygiene, warmth
3. **Additional preparedness:** tools, backup equipment, comfort and longer-term supplies

Within a tier, items that are completely missing come before partly available ones. v1 has no inventory and ticks are yes/no, so every unticked item counts as missing and items within a tier are ordered by criticality alone.

**Member-specific sections.** Supplies that exist only for pets or only for small children (0–3) are shown in their own sections after the three tiers. Pet supplies have no tier there. Small-child supplies keep their tier and show it, and a small child's essential food also appears in tier 1 as a pointer to its section, so it never looks less urgent than water.

## Ticks

An item on the shopping list is ticked when the household has it. A tick saves the quantity it was ticked at, and it counts as done only while that quantity covers what the plan needs now:

- A profile edit that grows an item's quantity puts it back as not done; it needs ticking again.
- A profile edit that keeps or shrinks the quantity keeps the tick.
- An item that leaves the plan keeps its tick hidden; if it comes back at the same or a smaller quantity, it is done again.

Progress ("Gotowe x z y") counts the plan's items only and is the same on the list, on Plan and on Start.

## Scenarios

Every plan includes the 72-hour baseline. Each optional emergency adds the items specific to it. If the user picks none, the plan is a general household plan covering water, food, first aid, lighting and hygiene.
