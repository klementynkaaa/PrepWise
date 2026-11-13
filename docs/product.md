# Product

## Problem

Many households in Poland read the official emergency-preparedness recommendations and decide to build a home emergency kit. Then they stall. The checklists conflict, there's too much information, and nobody says what to buy, how much, or where to start. Existing tools assume you already have a stockpile to manage, or they leave you to translate a generic list yourself.

PREPWISE takes a household from "I don't know where to start" to "I'm prepared": a personalised plan, clear quantities, and a prioritised list of what to get first.

## Who it's for

The household manager: the person who organises the home and is starting to prepare supplies for the family. She is not a prepper or survivalist. She is the only user. The other household members are covered by her plan but don't use the app.

## MVP scope

The first session should end with a personalised plan and a clear first step.

1. **Describe the household:** adults, children, elderly people, pets and special medical needs. Household size follows from this.
2. **See the plan:** every plan starts from the official 72-hour baseline. Specific emergencies (blackout, flooding, water disruption, severe weather, evacuation) are optional add-ons, each explained in plain language.
3. **Browse by priority:** supplies are grouped by priority category (e.g. "Water and food"). Each item shows what is needed, how much and why.
4. **Get an action list:** a prioritised shopping list of what to get first and what to do next.
5. **Track progress:** tick items off. Progress persists between sessions, and items can be unticked.

**Targets:** the first plan takes at most 8 steps and under 5 minutes. Every quantity shows its source (see [Business rules](business-rules.md)).

## Guardrails

- **Household data stays on the device.** Nothing about the household is sent anywhere.
- **Works offline.** The profile, plan, list and ticking all work with no connection.
- **Polish first.** All screens and guidance are in Polish at launch.
- **Accessible to non-experts.** Text stays readable at large system font sizes, the app works with a screen reader, and specialist terms are explained.

## Non-goals (v1)

- Accounts, sync, family sharing or payments
- Step-by-step instructions for what to do during or after a crisis (v1 is about preparing)
- Markets outside Poland
- Inventory tracking, storage boxes or QR codes, expiry reminders or notifications

## Known limitations and open questions

- **Ticks can go stale.** A ticked item may later be used up or expire. Inventory and expiry tracking would fix this and are planned for later.
- **Data is lost with the device.** Reinstalling the app or changing phones loses data, because there's no backup in v1.
- **Baseline figures aren't verified yet.** The per-person, per-day amounts (water, food, etc.) and their official Polish sources still need checking before the plan content ships.
