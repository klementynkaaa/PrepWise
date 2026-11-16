-- Household sharing (S-09): tables.
--
-- The data tables match the row shapes in `src/lib/household/rows.ts` column
-- for column (the pgTAP `columns_are` tests and `rows.test.ts` keep both
-- lists in step). Membership and invites follow the one-household-per-person
-- model. Access rules, functions and triggers are in the next migration.

-- --- data tables ---------------------------------------------------------------

-- One household and its flat profile. `id` is generated on the device and
-- `household_id` equals it, so every synced table is scoped by the same
-- column. Households are never soft-deleted: the last member leaving deletes
-- the row and, by cascade, every row of the household.
create table public.households (
  id uuid primary key,
  household_id uuid not null generated always as (id) stored,
  name text check (name is null or char_length(name) between 1 and 60),
  adults integer not null default 0 check (adults between 0 and 20),
  seniors integer not null default 0 check (seniors between 0 and 20),
  children integer not null default 0 check (children between 0 and 20),
  small_children integer not null default 0 check (small_children between 0 and 20),
  has_pets boolean not null default false,
  small_dog integer not null default 0 check (small_dog between 0 and 20),
  medium_dog integer not null default 0 check (medium_dog between 0 and 20),
  large_dog integer not null default 0 check (large_dog between 0 and 20),
  cat integer not null default 0 check (cat between 0 and 20),
  other_small integer not null default 0 check (other_small between 0 and 20),
  housing_type text check (housing_type in ('flat', 'house')),
  -- Fields are only ever added, so a newer client may write a higher version.
  schema_version integer not null default 2 check (schema_version >= 2),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  field_ts jsonb not null default '{}' check (jsonb_typeof(field_ts) = 'object')
);

comment on table public.households is
  'One shared household and its profile. Created only through create_household().';

-- Set rows: one row per element, id `<household_id>:<element>`. Removing an
-- element sets `selected = false`; the row stays, so a later toggle can win.
create table public.household_needs (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  need text not null check (
    need in ('regularMedicines', 'medicalEquipment', 'limitedMobility', 'specialDiet')
  ),
  selected boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  field_ts jsonb not null default '{}' check (jsonb_typeof(field_ts) = 'object'),
  constraint household_needs_id_matches check (id = household_id::text || ':' || need)
);

create index household_needs_household_id_idx on public.household_needs (household_id);

create table public.household_steps (
  id text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  step text not null check (step in ('people', 'pets', 'housing', 'needs')),
  selected boolean not null default true,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  field_ts jsonb not null default '{}' check (jsonb_typeof(field_ts) = 'object'),
  constraint household_steps_id_matches check (id = household_id::text || ':' || step)
);

create index household_steps_household_id_idx on public.household_steps (household_id);

-- --- membership ----------------------------------------------------------------

create table public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  -- Anonymous users have no name; S-10 asks for one when joining.
  display_name text check (display_name is null or char_length(display_name) between 1 and 40),
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- A person is a member of at most one household.
create unique index household_members_one_household on public.household_members (user_id);

-- At most one owner per household.
create unique index household_members_one_owner on public.household_members (household_id)
  where role = 'owner';

-- --- invites -------------------------------------------------------------------

create table public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  -- sha256 of the normalised code. The code itself is returned once and never stored.
  code_hash bytea not null unique,
  created_by uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '48 hours',
  max_uses integer not null default 1 check (max_uses >= 1),
  use_count integer not null default 0 check (use_count between 0 and max_uses),
  revoked_at timestamptz
);

create index household_invites_household_id_idx on public.household_invites (household_id);

-- Who used which invite.
create table public.invite_redemptions (
  invite_id uuid not null references public.household_invites (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (invite_id, user_id)
);

-- Every peek and redeem attempt, for the per-user limit on failed guesses.
-- `failed` marks a wrong, expired, used, revoked or refused code; `code` is the
-- reason returned to the caller (null on success).
create table public.invite_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempted_at timestamptz not null default now(),
  failed boolean not null,
  code text
);

create index invite_attempts_user_time_idx on public.invite_attempts (user_id, attempted_at);
