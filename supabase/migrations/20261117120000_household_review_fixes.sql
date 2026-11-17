-- Fixes from the S-09 implementation review (F6, F7, F8).
--
-- - remove_member and leave_household lock the household row before checking
--   the caller's role, so a removal can't act on a role the caller just lost.
-- - redeem_invite locks the households involved (by id) before the invite row,
--   the same order the leave rules use, so two people swapping households at
--   once no longer deadlock.
-- - create_household maps a concurrent duplicate id to household_id_taken.
-- - The insert and merge triggers drop `field_ts` keys that name no data
--   column (F7).
--
-- - Functions created from now on are not executable by PUBLIC (F8). A rule
--   for one schema can't remove the built-in PUBLIC grant, so the rule covers
--   every function the migration role creates. Public RPCs still get their
--   grants from Supabase's own default for schema public, and each one
--   revokes and grants explicitly anyway.
--
-- `create or replace` keeps each function's owner and grants.

alter default privileges for role postgres revoke execute on functions from public;

create or replace function public.create_household(id uuid, fields jsonb default '{}', field_ts jsonb default '{}')
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

  -- Another account creating the same id at the same moment passes the check
  -- above too; its insert then fails here instead of raising a raw 23505.
  begin
    insert into public.households (
      id, name, adults, seniors, children, small_children, has_pets, small_dog, medium_dog,
      large_dog, cat, other_small, housing_type, schema_version, field_ts
    ) values (
      id, r.name, r.adults, r.seniors, r.children, r.small_children, r.has_pets, r.small_dog,
      r.medium_dog, r.large_dog, r.cat, r.other_small, r.housing_type, r.schema_version, field_ts
    );
  exception when unique_violation then
    raise exception 'household_id_taken' using errcode = 'P0001', hint = 'household_id_taken';
  end;

  insert into public.household_members (household_id, user_id, role, display_name)
  values (id, uid, 'owner', null);

  return id;
end;
$$;

create or replace function public.redeem_invite(
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
  target uuid;
  name text := nullif(pg_catalog.btrim(display_name), '');
begin
  if name is not null and pg_catalog.char_length(name) > 40 then
    raise exception 'invalid_display_name' using errcode = '22023', hint = 'invalid_display_name';
  end if;

  perform private.lock_user(uid);
  if private.too_many_attempts(uid) then
    return private.attempt_failed(uid, 'too_many_attempts');
  end if;

  -- Lock order: households (by id), then the invite row. Leaving revokes
  -- invites while holding the household lock, so taking the invite first
  -- could deadlock with a redeem in the opposite direction.
  select i.household_id into target
  from public.household_invites i
  where i.code_hash = private.hash_code(code);
  perform 1 from public.households h
  where h.id in (
    target,
    (select m.household_id from public.household_members m where m.user_id = uid)
  )
  order by h.id
  for update;

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

create or replace function public.remove_member(household_id uuid, user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
begin
  -- Lock first, so the role is checked against the state the removal acts on.
  perform 1 from public.households h where h.id = household_id for update;
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

create or replace function public.leave_household(household_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_variable
declare
  uid uuid := private.require_user();
begin
  perform 1 from public.households h where h.id = household_id for update;
  if not private.is_member(household_id) then
    raise exception 'not_member' using errcode = 'P0001', hint = 'not_member';
  end if;
  perform private.leave_household_as(household_id, uid);
end;
$$;

-- --- field_ts keys (F7) ---------------------------------------------------------

-- `field_ts` with only the keys that name a data column of the row: a key
-- for a system column or for no column at all is dropped, so a client cannot
-- grow `field_ts` with keys the merge never reads (S-09 review, F7).
create function private.data_field_ts(ts jsonb, row_data jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(pg_catalog.jsonb_object_agg(e.key, e.value), '{}'::jsonb)
  from pg_catalog.jsonb_each(coalesce(ts, '{}'::jsonb)) e
  where row_data ? e.key
    and e.key <> all (private.system_columns());
$$;

revoke all on function private.data_field_ts(jsonb, jsonb) from public, anon, authenticated;

create or replace function private.stamp_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.field_ts := private.clamp_field_ts(
    private.data_field_ts(new.field_ts, pg_catalog.to_jsonb(new))
  );
  new.created_by := auth.uid();
  new.updated_by := auth.uid();
  new.created_at := pg_catalog.now();
  new.updated_at := coalesce(private.max_field_ts(new.field_ts), pg_catalog.now());
  return new;
end;
$$;

create or replace function private.merge_row()
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
    incoming := private.clamp_field_ts(private.data_field_ts(new.field_ts, new_row));
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
