-- Tighter checks on household_ticks, matching the client row schema (rows.ts):
-- an item id is at most 64 characters, and a quantity is finite. Postgres sorts
-- NaN above every number, so `quantity >= 0` alone let 'NaN' and 'Infinity' in;
-- `< 'Infinity'` rules out both.

alter table public.household_ticks
  drop constraint household_ticks_item_check,
  add constraint household_ticks_item_check
    check (item ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(item) <= 64),
  drop constraint household_ticks_quantity_check,
  add constraint household_ticks_quantity_check
    check (quantity >= 0 and quantity < 'Infinity'::double precision);
