-- Prioritized action list: ticked shopping-list items.
--
-- A set table like household_needs and household_steps (one row per item, id
-- `<household_id>:<item>`, `selected` instead of deletion), matching
-- `householdTickRowSchema` in `src/lib/household/rows.ts` column for column.
-- `item` is a bundled item id (kebab-case slug), checked by format rather than
-- by a list, so a newer catalogue needs no migration. `quantity` is the plan's
-- quantity when the item was last ticked; it may be fractional.

create table public.household_ticks (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  item text not null check (item ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  selected boolean not null default true,
  quantity double precision not null check (quantity >= 0),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  field_ts jsonb not null default '{}' check (jsonb_typeof(field_ts) = 'object'),
  constraint household_ticks_id_matches check (id = household_id::text || ':' || item)
);

comment on table public.household_ticks is
  'Ticked shopping-list items of a household: one row per item, unticking sets selected = false.';

create index household_ticks_household_id_idx on public.household_ticks (household_id);

-- The same per-field merge and server stamps as every synced table.
create trigger household_ticks_stamp_insert
  before insert on public.household_ticks
  for each row execute function private.stamp_insert();
create trigger household_ticks_merge
  before update on public.household_ticks
  for each row execute function private.merge_row();

-- --- grants and policies ---------------------------------------------------------

alter table public.household_ticks enable row level security;

-- Start from nothing; Supabase grants every new public table to the API roles.
revoke all on public.household_ticks from public, anon, authenticated;

-- Members read and write; nobody deletes (unticking is an update).
grant select, insert, update on public.household_ticks to authenticated;

create policy "Members read their ticks"
  on public.household_ticks for select to authenticated
  using ((select private.is_member(household_id)));
create policy "Members add ticks"
  on public.household_ticks for insert to authenticated
  with check ((select private.is_member(household_id)));
create policy "Members update ticks"
  on public.household_ticks for update to authenticated
  using ((select private.is_member(household_id)))
  with check ((select private.is_member(household_id)));
