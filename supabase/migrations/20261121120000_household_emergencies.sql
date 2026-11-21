-- Optional emergencies: the emergencies a household added to its plan.
--
-- A set table like household_needs and household_ticks (one row per emergency,
-- id `<household_id>:<emergency>`, `selected` instead of deletion), matching
-- `householdEmergencyRowSchema` in `src/lib/household/rows.ts` column for column.
-- `emergency` is a bundled emergency id (kebab-case slug, at most 64
-- characters), checked by format rather than by a list, so a newer catalogue
-- needs no migration.

create table public.household_emergencies (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  emergency text not null
    check (emergency ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(emergency) <= 64),
  selected boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  field_ts jsonb not null default '{}' check (jsonb_typeof(field_ts) = 'object'),
  constraint household_emergencies_id_matches check (id = household_id::text || ':' || emergency)
);

comment on table public.household_emergencies is
  'Emergencies a household added to its plan: one row per emergency, removing one sets selected = false.';

create index household_emergencies_household_id_idx on public.household_emergencies (household_id);

-- The same per-field merge and server stamps as every synced table.
create trigger household_emergencies_stamp_insert
  before insert on public.household_emergencies
  for each row execute function private.stamp_insert();
create trigger household_emergencies_merge
  before update on public.household_emergencies
  for each row execute function private.merge_row();

-- --- grants and policies ---------------------------------------------------------

alter table public.household_emergencies enable row level security;

-- Start from nothing; Supabase grants every new public table to the API roles.
revoke all on public.household_emergencies from public, anon, authenticated;

-- Members read and write; nobody deletes (removing an emergency is an update).
grant select, insert, update on public.household_emergencies to authenticated;

create policy "Members read their emergencies"
  on public.household_emergencies for select to authenticated
  using ((select private.is_member(household_id)));
create policy "Members add emergencies"
  on public.household_emergencies for insert to authenticated
  with check ((select private.is_member(household_id)));
create policy "Members update emergencies"
  on public.household_emergencies for update to authenticated
  using ((select private.is_member(household_id)))
  with check ((select private.is_member(household_id)));
