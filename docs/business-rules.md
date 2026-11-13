# Business rules

These rules decide which supplies a household needs and in what order. Keep them in pure, unit-tested functions, not in UI components.

## Quantities

```
recommended quantity = amount per person per day × number of people × number of days
```

- **Duration:** the initial plan covers the first **72 hours** (3 days).
- **Adults** use the standard per-person amounts.
- **Children** get age-appropriate food, clothing, medication and hygiene supplies.
- **Elderly people** get extra items for mobility, medication and specific care needs.
- **Pets** get separate food and water amounts, based on animal type and size.
- **Declared medical needs** add the relevant supplies.

_Example (illustrative, figure not yet verified):_ at 3 L of drinking water per person per day, a household of three needs 3 × 3 × 3 = **27 L** for 72 hours.

## Source labelling

Every recommended quantity shows exactly one of these labels:

- **Official guidance:** the figure comes from official Polish recommendations.
- **PREPWISE recommendation:** the figure is PREPWISE's own estimate. Use this where official guidance gives no per-person amount.

Never show an estimate as if it were official.

## Priority

Priority goes by criticality, not by a fixed category order:

1. **Essential survival:** water, essential food, necessary medication, first aid
2. **Basic safety and functioning:** lighting, communication, hygiene, warmth
3. **Additional preparedness:** tools, backup equipment, comfort and longer-term supplies

Within a tier, items that are completely missing come before partly available ones. v1 has no inventory and ticks are yes/no, so every unticked item counts as missing and items within a tier are ordered by criticality alone.

## Scenarios

Every plan includes the 72-hour baseline. Each optional emergency adds the items specific to it. If the user picks none, the plan is a general household plan covering water, food, first aid, lighting and hygiene.
