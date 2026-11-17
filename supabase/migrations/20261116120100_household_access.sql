-- Household sharing (S-09): access rules, membership functions and merge.
--
-- - Row-level security is on for every table. Policies are for `authenticated`
--   only; anonymous users have that role too (claim `is_anonymous`), so they
--   are never excluded. The `anon` role (no session) gets nothing.
-- - No client DELETE anywhere: no table grants it and no policy allows it.
-- - Membership changes only through the functions below (`security definer`,
--   empty `search_path`, fully qualified names). Their EXECUTE is revoked from
--   `public` and `anon` and granted to `authenticated`.
-- - Helpers live in the `private` schema, which the Data API does not expose.
-- - Functions that log an invite attempt (`peek_invite`, `redeem_invite`)
--   return `{ ok: false, code }` instead of raising, so the logged attempt is
--   never rolled back. Other errors raise SQLSTATE P0001 (or 22023 for bad
--   input) with the reason code as both message and hint.

create schema private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

-- --- helpers ---------------------------------------------------------------------

-- The signed-in user, or an error.
create function private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001', hint = 'not_authenticated';
  end if;
  return uid;
end;
$$;

create function private.is_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = hid
      and m.user_id = (select auth.uid())
  );
$$;

create function private.is_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.household_members m
    where m.household_id = hid
      and m.user_id = (select auth.uid())
      and m.role = 'owner'
  );
$$;

-- A timestamp as the ISO text the client writes (UTC, milliseconds, `Z`).
create function private.iso(ts timestamptz)
returns text
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.to_char(ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
$$;

-- `field_ts` with every timestamp later than now() replaced by now(), so a
-- device with a fast clock cannot win forever. A value that is not a
-- timestamp raises an error.
create function private.clamp_field_ts(ts jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select coalesce(
    pg_catalog.jsonb_object_agg(
      e.key,
      case
        when (e.value #>> '{}')::timestamptz > pg_catalog.now()
          then pg_catalog.to_jsonb(private.iso(pg_catalog.now()))
        else e.value
      end
    ),
    '{}'::jsonb
  )
  from pg_catalog.jsonb_each(coalesce(ts, '{}'::jsonb)) e;
$$;

-- The latest timestamp in a `field_ts`, or null when it is empty.
create function private.max_field_ts(ts jsonb)
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select max((e.value #>> '{}')::timestamptz)
  from pg_catalog.jsonb_each(coalesce(ts, '{}'::jsonb)) e;
$$;

-- --- the owner rule --------------------------------------------------------------

-- A household with members has exactly one owner. The partial unique index
-- allows at most one; this deferred check requires at least one at commit, so
-- an owner can leave and a member be promoted in the same transaction.
create function private.check_one_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  foreach hid in array array[old.household_id, new.household_id] loop
    continue when hid is null;
    if exists (select 1 from public.household_members m where m.household_id = hid)
      and (
        select count(*) from public.household_members m
        where m.household_id = hid and m.role = 'owner'
      ) <> 1
    then
      raise exception 'household_needs_one_owner'
        using errcode = '23514', hint = 'household_needs_one_owner';
    end if;
  end loop;
  return null;
end;
$$;

create constraint trigger household_members_one_owner_check
  after insert or update or delete on public.household_members
  deferrable initially deferred
  for each row execute function private.check_one_owner();

-- --- merge -----------------------------------------------------------------------

-- Columns of a synced row that are not data: the merge never takes them from
-- the client.
create function private.system_columns()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array['id', 'household_id', 'created_by', 'created_at', 'updated_by', 'updated_at',
    'field_ts'];
$$;

-- BEFORE INSERT on every synced table: the server sets who and when.
create function private.stamp_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.field_ts := private.clamp_field_ts(new.field_ts);
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.created_at := pg_catalog.now();
  new.updated_at := coalesce(private.max_field_ts(new.field_ts), pg_catalog.now());
  return new;
end;
$$;

-- BEFORE UPDATE on every synced table: per-field last write wins by timestamp.
-- 1. A row with `deleted_at` set ignores every later change (delete wins).
-- 2. Incoming `field_ts` values are clamped to now(). A changed column with no
--    incoming timestamp counts as changed now. A `field_ts` equal to the stored
--    one counts as not sent.
-- 3. Per data column, the stored value stays when its stored timestamp is newer.
-- 4. `field_ts` becomes the per-key maximum of stored and incoming.
-- 5. `updated_at` is the latest timestamp, `updated_by` is auth.uid(). Keys and
--    `created_*` never change.
create function private.merge_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_row jsonb := pg_catalog.to_jsonb(old);
  new_row jsonb := pg_catalog.to_jsonb(new);
  stored jsonb := coalesce(old.field_ts, '{}'::jsonb);
  incoming jsonb;
  merged_ts jsonb;
  result jsonb := old_row;
  col text;
  in_ts timestamptz;
  st_ts timestamptz;
begin
  if old_row ? 'deleted_at' and old_row ->> 'deleted_at' is not null then
    return old;
  end if;

  if new.field_ts is not distinct from old.field_ts then
    incoming := '{}'::jsonb;
  else
    incoming := private.clamp_field_ts(new.field_ts);
  end if;

  -- Changed data columns that came without a timestamp are stamped now.
  for col in
    select k from pg_catalog.jsonb_object_keys(new_row) k
    where k <> all (private.system_columns())
  loop
    if not incoming ? col and (new_row -> col) is distinct from (old_row -> col) then
      incoming := incoming || pg_catalog.jsonb_build_object(col, private.iso(pg_catalog.now()));
    end if;
  end loop;

  -- Per-key maximum of the stored and incoming timestamps.
  select coalesce(pg_catalog.jsonb_object_agg(k, v), '{}'::jsonb)
  into merged_ts
  from (
    select s.key as k,
      case
        when i.value is null then s.value
        when (s.value #>> '{}')::timestamptz > (i.value #>> '{}')::timestamptz then s.value
        else i.value
      end as v
    from pg_catalog.jsonb_each(stored) s
    left join pg_catalog.jsonb_each(incoming) i on i.key = s.key
    union all
    select i.key, i.value
    from pg_catalog.jsonb_each(incoming) i
    where not stored ? i.key
  ) keys;

  for col in
    select k from pg_catalog.jsonb_object_keys(new_row) k
    where k <> all (private.system_columns())
  loop
    continue when not incoming ? col;
    in_ts := (incoming ->> col)::timestamptz;
    st_ts := (stored ->> col)::timestamptz;
    -- Setting deleted_at always wins; otherwise the newer timestamp wins and
    -- a tie goes to the incoming value.
    if (col = 'deleted_at' and new_row -> col <> 'null'::jsonb)
      or st_ts is null
      or st_ts <= in_ts
    then
      result := pg_catalog.jsonb_set(result, array[col], new_row -> col);
    end if;
  end loop;

  result := result
    || pg_catalog.jsonb_build_object(
      'field_ts', merged_ts,
      'updated_by', auth.uid(),
      'updated_at', coalesce(private.max_field_ts(merged_ts), pg_catalog.now())
    );

  -- Nothing won: keep the row as it was.
  if result - 'updated_by' - 'updated_at' = old_row - 'updated_by' - 'updated_at' then
    return old;
  end if;

  return pg_catalog.jsonb_populate_record(new, result);
end;
$$;

create trigger households_stamp_insert
  before insert on public.households
  for each row execute function private.stamp_insert();
create trigger households_merge
  before update on public.households
  for each row execute function private.merge_row();

create trigger household_needs_stamp_insert
  before insert on public.household_needs
  for each row execute function private.stamp_insert();
create trigger household_needs_merge
  before update on public.household_needs
  for each row execute function private.merge_row();

create trigger household_steps_stamp_insert
  before insert on public.household_steps
  for each row execute function private.stamp_insert();
create trigger household_steps_merge
  before update on public.household_steps
  for each row execute function private.merge_row();

-- --- grants and policies ---------------------------------------------------------

alter table public.households enable row level security;
alter table public.household_needs enable row level security;
alter table public.household_steps enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.invite_redemptions enable row level security;
alter table public.invite_attempts enable row level security;

-- Start from nothing; Supabase grants every new public table to the API roles.
revoke all on
  public.households,
  public.household_needs,
  public.household_steps,
  public.household_members,
  public.household_invites,
  public.invite_redemptions,
  public.invite_attempts
from public, anon, authenticated;

-- Data rows: members read and write. Households are created only by
-- create_household(), so there is no insert on households.
grant select, update on public.households to authenticated;
grant select, insert, update on public.household_needs, public.household_steps to authenticated;

-- Membership is read-only for clients.
grant select on public.household_members to authenticated;

-- Invites without the code hash.
grant select (id, household_id, created_by, created_at, expires_at, max_uses, use_count, revoked_at)
  on public.household_invites to authenticated;

-- invite_redemptions and invite_attempts: no client access at all.

create policy "Members read their household"
  on public.households for select to authenticated
  using ((select private.is_member(id)));
create policy "Members update their household"
  on public.households for update to authenticated
  using ((select private.is_member(id)))
  with check ((select private.is_member(id)));

create policy "Members read their needs"
  on public.household_needs for select to authenticated
  using ((select private.is_member(household_id)));
create policy "Members add needs"
  on public.household_needs for insert to authenticated
  with check ((select private.is_member(household_id)));
create policy "Members update needs"
  on public.household_needs for update to authenticated
  using ((select private.is_member(household_id)))
  with check ((select private.is_member(household_id)));

create policy "Members read their steps"
  on public.household_steps for select to authenticated
  using ((select private.is_member(household_id)));
create policy "Members add steps"
  on public.household_steps for insert to authenticated
  with check ((select private.is_member(household_id)));
create policy "Members update steps"
  on public.household_steps for update to authenticated
  using ((select private.is_member(household_id)))
  with check ((select private.is_member(household_id)));

create policy "Members read their member list"
  on public.household_members for select to authenticated
  using ((select private.is_member(household_id)));

create policy "Members read their invites"
  on public.household_invites for select to authenticated
  using ((select private.is_member(household_id)));

-- --- invite helpers ----------------------------------------------------------------

-- The code as stored: uppercase, without spaces and dashes. Null when it can't
-- be a code (wrong length or a character outside the alphabet).
create function private.normalize_code(code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when n ~ '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$' then n
  end
  from (select pg_catalog.upper(pg_catalog.regexp_replace(coalesce(code, ''), '[[:space:]-]', '', 'g')) as n) c;
$$;

create function private.hash_code(code text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.sha256(pg_catalog.convert_to(private.normalize_code(code), 'UTF8'));
$$;

-- Whether the user has reached 10 failed attempts in the last hour.
create function private.too_many_attempts(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select count(*) >= 10
  from public.invite_attempts a
  where a.user_id = uid
    and a.failed
    and a.attempted_at > pg_catalog.now() - interval '1 hour';
$$;

create function private.log_attempt(uid uuid, failed boolean, code text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.invite_attempts (user_id, failed, code) values (uid, failed, code);
$$;

-- Logs a failed attempt and returns the result the caller sees.
create function private.attempt_failed(uid uuid, code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.log_attempt(uid, true, code);
  return pg_catalog.jsonb_build_object('ok', false, 'code', code);
end;
$$;

-- Why an invite can't be used, or null when it can.
create function private.invite_problem(inv public.household_invites)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when inv.id is null then 'invite_not_found'
    when inv.revoked_at is not null then 'invite_revoked'
    when inv.expires_at <= pg_catalog.now() then 'invite_expired'
    when inv.use_count >= inv.max_uses then 'invite_used'
  end;
$$;

-- What joining would do to the user's own household: `none` (they have
-- none), `alone` (joining deletes it) or `shared` (joining leaves it).
create function private.my_household_kind(uid uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when mine.household_id is null then 'none'
    when (
      select count(*) from public.household_members m where m.household_id = mine.household_id
    ) = 1 then 'alone'
    else 'shared'
  end
  from (select (
    select m.household_id from public.household_members m where m.user_id = uid
  ) as household_id) mine;
$$;

-- Serialises one user's membership calls, so concurrent calls can't slip past
-- the attempt limit or the one-household rule.
create function private.lock_user(uid uuid)
returns void
language sql
set search_path = ''
as $$
  select pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(uid::text, 0));
$$;

-- The leave rules, for leave_household(), redeem_invite(replace_existing) and
-- account deletion:
-- - the user's open invites for the household are revoked;
-- - the last member leaving deletes the household and, by cascade, every row;
-- - the last owner leaving with others remaining promotes the member with the
--   earliest joined_at.
create function private.leave_household_as(hid uuid, uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  leaving_role text;
begin
  -- One leave at a time per household.
  perform 1 from public.households h where h.id = hid for update;

  delete from public.household_members m
  where m.household_id = hid and m.user_id = uid
  returning m.role into leaving_role;

  if leaving_role is null then
    return;
  end if;

  if not exists (select 1 from public.household_members m where m.household_id = hid) then
    delete from public.households h where h.id = hid;
    return;
  end if;

  update public.household_invites i
  set revoked_at = pg_catalog.now()
  where i.household_id = hid and i.created_by = uid and i.revoked_at is null;

  if leaving_role = 'owner' then
    update public.household_members m
    set role = 'owner'
    where (m.household_id, m.user_id) = (
      select n.household_id, n.user_id
      from public.household_members n
      where n.household_id = hid
      order by n.joined_at, n.user_id
      limit 1
    );
  end if;
end;
$$;

-- --- RPCs ------------------------------------------------------------------------

-- Creates the caller's household from its profile columns and makes the caller
-- its owner. `fields` may hold any of the profile columns (unknown keys are
-- refused); missing ones get the table defaults. Idempotent on `id` for its
-- creator, so a retried upload neither fails nor duplicates.
create function public.create_household(id uuid, fields jsonb default '{}', field_ts jsonb default '{}')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
  allowed constant text[] := array['name', 'adults', 'seniors', 'children', 'small_children',
    'has_pets', 'small_dog', 'medium_dog', 'large_dog', 'cat', 'other_small', 'housing_type',
    'schema_version'];
  defaults constant jsonb := '{"name": null, "adults": 0, "seniors": 0, "children": 0,
    "small_children": 0, "has_pets": false, "small_dog": 0, "medium_dog": 0, "large_dog": 0,
    "cat": 0, "other_small": 0, "housing_type": null, "schema_version": 2}';
  unknown text;
  current_household uuid;
  existing_creator uuid;
  r public.households;
begin
  if id is null then
    raise exception 'invalid_input' using errcode = '22023', hint = 'invalid_input';
  end if;
  fields := coalesce(fields, '{}'::jsonb);
  field_ts := coalesce(field_ts, '{}'::jsonb);
  if pg_catalog.jsonb_typeof(fields) <> 'object' or pg_catalog.jsonb_typeof(field_ts) <> 'object' then
    raise exception 'invalid_input' using errcode = '22023', hint = 'invalid_input';
  end if;

  select k into unknown
  from pg_catalog.jsonb_object_keys(fields) k
  where k <> all (allowed)
  limit 1;
  if unknown is not null then
    raise exception 'unknown_field' using errcode = '22023', hint = 'unknown_field',
      detail = unknown;
  end if;

  perform private.lock_user(uid);

  select m.household_id into current_household
  from public.household_members m where m.user_id = uid;

  select h.created_by into existing_creator from public.households h where h.id = id;
  if found then
    if current_household = id and existing_creator = uid then
      return id;
    end if;
    raise exception 'household_id_taken' using errcode = 'P0001', hint = 'household_id_taken';
  end if;

  if current_household is not null then
    raise exception 'already_in_household' using errcode = 'P0001', hint = 'already_in_household';
  end if;

  r := pg_catalog.jsonb_populate_record(null::public.households, defaults || fields);

  insert into public.households (
    id, name, adults, seniors, children, small_children, has_pets, small_dog, medium_dog,
    large_dog, cat, other_small, housing_type, schema_version, field_ts
  ) values (
    id, r.name, r.adults, r.seniors, r.children, r.small_children, r.has_pets, r.small_dog,
    r.medium_dog, r.large_dog, r.cat, r.other_small, r.housing_type, r.schema_version, field_ts
  );

  insert into public.household_members (household_id, user_id, role, display_name)
  values (id, uid, 'owner', null);

  return id;
end;
$$;

-- A new invite to the household: 8 characters from an alphabet without
-- look-alikes, valid for 48 hours, single use. Only its sha256 is stored; the
-- code is returned once. Any member may invite.
create function public.create_invite(household_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  bytes bytea;
  b integer;
  code text;
begin
  if not private.is_member(household_id) then
    raise exception 'not_member' using errcode = 'P0001', hint = 'not_member';
  end if;

  loop
    code := '';
    bytes := extensions.gen_random_bytes(32);
    for i in 0..31 loop
      b := pg_catalog.get_byte(bytes, i);
      -- 248 = 8 × 31: dropping the rest keeps every character equally likely.
      if b < 248 then
        code := code || pg_catalog.substr(alphabet, b % 31 + 1, 1);
      end if;
      exit when pg_catalog.length(code) = 8;
    end loop;
    continue when pg_catalog.length(code) < 8;

    begin
      insert into public.household_invites (household_id, code_hash, created_by)
      values (household_id, private.hash_code(code), uid);
      return code;
    exception when unique_violation then
      -- The same code is live already: draw another.
    end;
  end loop;
end;
$$;

-- Revokes an invite. Its creator or the household's owner may.
create function public.revoke_invite(invite_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
  inv public.household_invites;
begin
  select * into inv from public.household_invites i where i.id = invite_id for update;
  if not found or not private.is_member(inv.household_id) then
    raise exception 'invite_not_found' using errcode = 'P0001', hint = 'invite_not_found';
  end if;
  if inv.created_by <> uid and not private.is_owner(inv.household_id) then
    raise exception 'not_owner' using errcode = 'P0001', hint = 'not_owner';
  end if;
  update public.household_invites i
  set revoked_at = coalesce(i.revoked_at, pg_catalog.now())
  where i.id = invite_id;
end;
$$;

-- What an invite leads to, for the join screen: the household's name, the
-- inviter's display name, and what joining would do to the caller's own
-- household. Logged as an attempt; failures count towards the limit.
create function public.peek_invite(code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
  inv public.household_invites;
  problem text;
  household_name text;
  inviter_name text;
begin
  perform private.lock_user(uid);
  if private.too_many_attempts(uid) then
    return private.attempt_failed(uid, 'too_many_attempts');
  end if;

  select * into inv from public.household_invites i where i.code_hash = private.hash_code(code);
  problem := private.invite_problem(inv);
  if problem is not null then
    return private.attempt_failed(uid, problem);
  end if;

  select h.name into household_name from public.households h where h.id = inv.household_id;
  select m.display_name into inviter_name
  from public.household_members m
  where m.household_id = inv.household_id and m.user_id = inv.created_by;

  perform private.log_attempt(uid, false, null);
  return pg_catalog.jsonb_build_object(
    'ok', true,
    'household_name', household_name,
    'inviter_display_name', inviter_name,
    'my_household', private.my_household_kind(uid),
    'already_member', exists (
      select 1 from public.household_members m
      where m.household_id = inv.household_id and m.user_id = uid
    )
  );
end;
$$;

-- Joins the invite's household. Returns `{ ok: true, household_id }`, or
-- `{ ok: false, code }` for a failed attempt. A member of another household is
-- refused with `household_exists` unless `replace_existing` is true; with it,
-- they leave their household first, by the leave rules.
create function public.redeem_invite(
  code text,
  display_name text default null,
  replace_existing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
  inv public.household_invites;
  problem text;
  current_household uuid;
  name text := nullif(pg_catalog.btrim(display_name), '');
begin
  if name is not null and pg_catalog.char_length(name) > 40 then
    raise exception 'invalid_display_name' using errcode = '22023', hint = 'invalid_display_name';
  end if;

  perform private.lock_user(uid);
  if private.too_many_attempts(uid) then
    return private.attempt_failed(uid, 'too_many_attempts');
  end if;

  select * into inv from public.household_invites i
  where i.code_hash = private.hash_code(code)
  for update;
  problem := private.invite_problem(inv);
  if problem is not null then
    return private.attempt_failed(uid, problem);
  end if;

  select m.household_id into current_household
  from public.household_members m where m.user_id = uid;

  -- Already a member: nothing to do, and the invite is not used up.
  if current_household = inv.household_id then
    perform private.log_attempt(uid, false, null);
    return pg_catalog.jsonb_build_object('ok', true, 'household_id', inv.household_id);
  end if;

  if current_household is not null then
    if not coalesce(replace_existing, false) then
      -- A valid code: logged, but not counted as a failed guess.
      perform private.log_attempt(uid, false, 'household_exists');
      return pg_catalog.jsonb_build_object('ok', false, 'code', 'household_exists');
    end if;
    perform private.leave_household_as(current_household, uid);
  end if;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (inv.household_id, uid, 'member', name);
  insert into public.invite_redemptions (invite_id, user_id) values (inv.id, uid);
  update public.household_invites i set use_count = i.use_count + 1 where i.id = inv.id;

  perform private.log_attempt(uid, false, null);
  return pg_catalog.jsonb_build_object('ok', true, 'household_id', inv.household_id);
end;
$$;

-- The owner removes another member. Never themselves (they leave instead).
create function public.remove_member(household_id uuid, user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
begin
  if not private.is_owner(household_id) then
    raise exception 'not_owner' using errcode = 'P0001', hint = 'not_owner';
  end if;
  if user_id = uid then
    raise exception 'cannot_remove_self' using errcode = 'P0001', hint = 'cannot_remove_self';
  end if;
  if not exists (
    select 1 from public.household_members m
    where m.household_id = household_id and m.user_id = user_id
  ) then
    raise exception 'not_member' using errcode = 'P0001', hint = 'not_member';
  end if;
  perform private.leave_household_as(household_id, user_id);
end;
$$;

-- The caller leaves the household, by the leave rules.
create function public.leave_household(household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
begin
  if not private.is_member(household_id) then
    raise exception 'not_member' using errcode = 'P0001', hint = 'not_member';
  end if;
  perform private.leave_household_as(household_id, uid);
end;
$$;

-- The caller's household: id, name, the caller's role and the member count.
-- No row when the caller has none.
create function public.my_household()
returns table (household_id uuid, name text, role text, member_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select h.id, h.name, m.role,
    (select count(*)::integer from public.household_members n where n.household_id = h.id)
  from public.household_members m
  join public.households h on h.id = m.household_id
  where m.user_id = (select auth.uid());
$$;

-- --- account deletion ----------------------------------------------------------------

-- Deleting a user by any path (dashboard, admin API, the S-10 Edge Function)
-- applies the leave rules to their household first, so ownership passes on
-- and a sole member's household is erased.
create function private.leave_on_user_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hid uuid;
begin
  for hid in select m.household_id from public.household_members m where m.user_id = old.id loop
    perform private.leave_household_as(hid, old.id);
  end loop;
  return old;
end;
$$;

create trigger household_leave_on_user_delete
  before delete on auth.users
  for each row execute function private.leave_on_user_delete();

-- --- function privileges -------------------------------------------------------------

revoke all on all functions in schema private from public, anon, authenticated;
-- Row-level security policies call these as the querying role.
grant execute on function private.is_member(uuid), private.is_owner(uuid) to authenticated;

revoke all on function
  public.create_household(uuid, jsonb, jsonb),
  public.create_invite(uuid),
  public.revoke_invite(uuid),
  public.peek_invite(text),
  public.redeem_invite(text, text, boolean),
  public.remove_member(uuid, uuid),
  public.leave_household(uuid),
  public.my_household()
from public, anon;

grant execute on function
  public.create_household(uuid, jsonb, jsonb),
  public.create_invite(uuid),
  public.revoke_invite(uuid),
  public.peek_invite(text),
  public.redeem_invite(text, text, boolean),
  public.remove_member(uuid, uuid),
  public.leave_household(uuid),
  public.my_household()
to authenticated;
