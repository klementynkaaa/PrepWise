-- Schema: the tables match `src/lib/household/rows.ts` column for column
-- (`TABLE_COLUMNS`, mirrored in `rows.test.ts`), every table has row-level
-- security, clients can never DELETE, the invite code hash is never readable,
-- and the functions run with fixed privileges.
begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

-- --- columns ---------------------------------------------------------------------

select columns_are('public', 'households', array[
  'id', 'household_id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'field_ts',
  'name', 'adults', 'seniors', 'children', 'small_children', 'has_pets', 'small_dog',
  'medium_dog', 'large_dog', 'cat', 'other_small', 'housing_type', 'schema_version'
], 'households has exactly the TABLE_COLUMNS.households columns');

select columns_are('public', 'household_needs', array[
  'id', 'household_id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'field_ts',
  'need', 'selected'
], 'household_needs has exactly the TABLE_COLUMNS.household_needs columns');

select columns_are('public', 'household_steps', array[
  'id', 'household_id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'field_ts',
  'step', 'selected'
], 'household_steps has exactly the TABLE_COLUMNS.household_steps columns');

select columns_are('public', 'household_ticks', array[
  'id', 'household_id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'field_ts',
  'item', 'selected', 'quantity'
], 'household_ticks has exactly the TABLE_COLUMNS.household_ticks columns');

select columns_are('public', 'household_emergencies', array[
  'id', 'household_id', 'created_by', 'created_at', 'updated_by', 'updated_at', 'field_ts',
  'emergency', 'selected'
], 'household_emergencies has exactly the TABLE_COLUMNS.household_emergencies columns');

select columns_are('public', 'household_members', array[
  'household_id', 'user_id', 'role', 'display_name', 'joined_at'
], 'household_members columns');

select columns_are('public', 'household_invites', array[
  'id', 'household_id', 'code_hash', 'created_by', 'created_at', 'expires_at', 'max_uses',
  'use_count', 'revoked_at'
], 'household_invites columns');

select columns_are('public', 'invite_redemptions', array['invite_id', 'user_id', 'redeemed_at'],
  'invite_redemptions columns');

select columns_are('public', 'invite_attempts', array['id', 'user_id', 'attempted_at', 'failed', 'code'],
  'invite_attempts columns');

select col_is_pk('public', 'household_members', array['household_id', 'user_id'],
  'a membership is keyed by household and user');

select is(
  (select attgenerated from pg_attribute
   where attrelid = 'public.households'::regclass and attname = 'household_id'),
  's'::"char",
  'households.household_id is a stored generated column'
);

select col_is_null('public', 'households', 'name', 'households.name is nullable (unnamed)');
select col_is_null('public', 'household_members', 'display_name',
  'household_members.display_name is nullable (set in S-10)');

-- --- row-level security ----------------------------------------------------------

select is(
  (select count(*)::integer from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity),
  0,
  'every public table has row-level security on'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public' and cmd = 'DELETE'),
  0,
  'no policy allows DELETE'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and not (roles = array['authenticated']::name[])),
  0,
  'every policy is for authenticated only'
);

select is(
  (select count(*)::integer from pg_policies
   where schemaname = 'public' and tablename = 'households' and cmd = 'INSERT'),
  0,
  'no policy inserts households (only create_household does)'
);

-- --- table privileges --------------------------------------------------------------

select ok(not has_table_privilege('authenticated', format('public.%I', t), 'DELETE'),
  format('authenticated cannot DELETE from %s', t))
from unnest(array['households', 'household_needs', 'household_steps', 'household_ticks',
  'household_emergencies', 'household_members', 'household_invites', 'invite_redemptions', 'invite_attempts']) t;

select ok(
  not has_table_privilege('anon', format('public.%I', t), 'SELECT,INSERT,UPDATE,DELETE'),
  format('anon has no access to %s', t))
from unnest(array['households', 'household_needs', 'household_steps', 'household_ticks',
  'household_emergencies', 'household_members', 'household_invites', 'invite_redemptions', 'invite_attempts']) t;

select ok(not has_table_privilege('authenticated', 'public.households', 'INSERT'),
  'authenticated cannot INSERT households');
select ok(
  not has_table_privilege('authenticated', 'public.household_members', 'INSERT,UPDATE'),
  'authenticated cannot write household_members');
select ok(
  not has_table_privilege('authenticated', 'public.household_invites', 'INSERT,UPDATE'),
  'authenticated cannot write household_invites');
select ok(
  not has_column_privilege('authenticated', 'public.household_invites', 'code_hash', 'SELECT'),
  'authenticated cannot read household_invites.code_hash');
select ok(
  not has_table_privilege('authenticated', 'public.invite_attempts', 'SELECT,INSERT,UPDATE'),
  'authenticated has no access to invite_attempts');
select ok(
  not has_table_privilege('authenticated', 'public.invite_redemptions', 'SELECT,INSERT,UPDATE'),
  'authenticated has no access to invite_redemptions');

-- --- functions ----------------------------------------------------------------------

select ok(
  has_function_privilege('authenticated', f, 'EXECUTE')
    and not has_function_privilege('anon', f, 'EXECUTE')
    and not exists (
      select 1 from aclexplode((select proacl from pg_proc where oid = f::regprocedure)) a
      where a.grantee = 0
    ),
  format('%s: execute for authenticated only', f))
from unnest(array[
  'public.create_household(uuid, jsonb, jsonb)',
  'public.create_invite(uuid)',
  'public.revoke_invite(uuid)',
  'public.peek_invite(text)',
  'public.redeem_invite(text, text, boolean)',
  'public.remove_member(uuid, uuid)',
  'public.leave_household(uuid)',
  'public.my_household()'
]) f;

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname in ('public', 'private') and p.prokind = 'f'
     and not coalesce('search_path=""' = any (p.proconfig), false)),
  0,
  'every function in public and private sets an empty search_path'
);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.prokind = 'f' and not p.prosecdef),
  0,
  'every RPC is security definer'
);

select ok(
  (select prosecdef from pg_proc where oid = 'private.is_member(uuid)'::regprocedure)
    and (select prosecdef from pg_proc where oid = 'private.is_owner(uuid)'::regprocedure),
  'the membership helpers are security definer'
);

select is(
  (select count(*)::integer from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and has_function_privilege('authenticated', p.oid, 'EXECUTE')),
  2,
  'authenticated may execute only the two membership helpers in private'
);

select ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'anon cannot use the private schema');

-- A private function added by a later migration is not executable by API roles.
create function private.t_later_helper() returns int language sql as 'select 1';
select ok(
  not has_function_privilege('authenticated', 'private.t_later_helper()', 'execute'),
  'a private function created later is not executable by authenticated'
);

select * from finish();
rollback;
