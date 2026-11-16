-- Members: only the owner removes, never themselves; a removed member loses
-- access at once; the last owner leaving promotes the earliest member; the last
-- member leaving erases the household; exactly one owner per household.
begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

-- Test helpers, rolled back with the test.
create schema t;
grant usage on schema t to authenticated;

-- A user in auth.users; anonymous unless said otherwise.
create function t.user(id uuid, anonymous boolean default true)
returns uuid
language sql
as $$
  insert into auth.users (id, aud, role, is_anonymous)
  values (id, 'authenticated', 'authenticated', anonymous)
  returning id;
$$;

-- Act as the user through the Data API: role `authenticated` plus JWT claims.
create function t.login(id uuid, anonymous boolean default true)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', id, 'role', 'authenticated', 'is_anonymous', anonymous)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

-- Back to the test runner (postgres), with no user.
create function t.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

grant execute on all functions in schema t to authenticated;

select t.user(u::uuid) from unnest(array[
  '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1',
  '00000000-0000-4000-8000-0000000000e1'
]) u;

-- H: owner A, members B, C and D. C joined before B and D, so C is the earliest
-- member (and B sorts before C by id, so the order is not by id).
select t.login('00000000-0000-4000-8000-0000000000a1');
select public.create_household('11111111-1111-4111-8111-111111111111', '{"name": "Dom"}', '{}');
insert into public.household_needs (id, household_id, need, selected, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:specialDiet', '11111111-1111-4111-8111-111111111111',
  'specialDiet', true, now(), '{}');
select t.logout();
insert into public.household_members (household_id, user_id, role, joined_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000b1', 'member', now() + interval '2 minutes'),
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c1', 'member', now() + interval '1 minute'),
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000d1', 'member', now() + interval '3 minutes');

-- --- my_household ---------------------------------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000b1');
select results_eq(
  $$select household_id, name, role, member_count from public.my_household()$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid, 'Dom'::text, 'member'::text, 4)$$,
  'my_household returns the id, name, role and member count'
);

-- --- removing --------------------------------------------------------------------------

select throws_ok(
  $$select public.remove_member('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000d1')$$,
  'P0001', 'not_owner',
  'a member cannot remove another member'
);
select t.login('00000000-0000-4000-8000-0000000000a1');
select throws_ok(
  $$select public.remove_member('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000a1')$$,
  'P0001', 'cannot_remove_self',
  'the owner cannot remove themselves'
);
select throws_ok(
  $$select public.remove_member('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000e1')$$,
  'P0001', 'not_member',
  'the owner cannot remove someone who is not a member'
);

-- D has an invite out; removing D revokes it.
select t.login('00000000-0000-4000-8000-0000000000d1');
select public.create_invite('11111111-1111-4111-8111-111111111111');
select t.login('00000000-0000-4000-8000-0000000000a1');
select lives_ok(
  $$select public.remove_member('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000d1')$$,
  'the owner removes a member'
);

select t.login('00000000-0000-4000-8000-0000000000d1');
select is(
  (select count(*)::integer from public.households)
    + (select count(*)::integer from public.household_needs)
    + (select count(*)::integer from public.household_members)
    + (select count(*)::integer from public.household_invites),
  0,
  'a removed member reads nothing straight away'
);
select is_empty($$select * from public.my_household()$$, 'a removed member has no household');
update public.households set name = 'Po usunięciu';
select t.logout();
select is((select name from public.households), 'Dom', 'a removed member can no longer write');
select is(
  (select revoked_at is not null from public.household_invites
   where created_by = '00000000-0000-4000-8000-0000000000d1'),
  true,
  'a removed member''s open invites are revoked'
);

-- --- one owner -------------------------------------------------------------------------------

select throws_ok(
  $$update public.household_members set role = 'owner'
    where user_id = '00000000-0000-4000-8000-0000000000b1'$$,
  '23505', null,
  'a second owner is rejected'
);
select throws_ok(
  $$update public.household_members set role = 'member'
    where user_id = '00000000-0000-4000-8000-0000000000a1';
    set constraints household_members_one_owner_check immediate$$,
  '23514', 'household_needs_one_owner',
  'a household with members but no owner is rejected'
);

-- --- leaving ---------------------------------------------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000e1');
select throws_ok(
  $$select public.leave_household('11111111-1111-4111-8111-111111111111')$$,
  'P0001', 'not_member',
  'a non-member cannot leave'
);

-- The owner leaves: C, the earliest member, becomes the owner.
select t.login('00000000-0000-4000-8000-0000000000a1');
select lives_ok($$select public.leave_household('11111111-1111-4111-8111-111111111111')$$,
  'the owner leaves');
select t.logout();
set constraints household_members_one_owner_check immediate;
select results_eq(
  $$select user_id, role from public.household_members order by user_id$$,
  $$values ('00000000-0000-4000-8000-0000000000b1'::uuid, 'member'::text),
    ('00000000-0000-4000-8000-0000000000c1'::uuid, 'owner'::text)$$,
  'the last owner leaving promotes the member with the earliest joined_at'
);
set constraints household_members_one_owner_check deferred;

select t.login('00000000-0000-4000-8000-0000000000a1');
select is((select count(*)::integer from public.households), 0, 'who left reads nothing');

select t.login('00000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$select public.remove_member('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000b1')$$,
  'the promoted owner removes a member'
);
select results_eq(
  $$select household_id, role, member_count from public.my_household()$$,
  $$values ('11111111-1111-4111-8111-111111111111'::uuid, 'owner'::text, 1)$$,
  'C is the sole member and owner'
);

-- The last member leaves: the household and every row are erased.
select public.create_invite('11111111-1111-4111-8111-111111111111');
insert into public.household_steps (id, household_id, step, selected, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:people', '11111111-1111-4111-8111-111111111111',
  'people', true, now(), '{}');
select lives_ok($$select public.leave_household('11111111-1111-4111-8111-111111111111')$$,
  'the last member leaves');
select t.logout();
select is((select count(*)::integer from public.households), 0, 'the household is deleted');
select is(
  (select count(*)::integer from public.household_needs)
    + (select count(*)::integer from public.household_steps)
    + (select count(*)::integer from public.household_members),
  0,
  'every need, step and membership is deleted'
);
select is(
  (select count(*)::integer from public.household_invites)
    + (select count(*)::integer from public.invite_redemptions),
  0,
  'every invite and redemption is deleted'
);

-- Leaving was a membership change, never a client DELETE: the deferred owner
-- check passes at commit time.
select lives_ok($$set constraints household_members_one_owner_check immediate$$,
  'the owner rule holds after every change');

-- A user who never had a household can create one afterwards.
select t.login('00000000-0000-4000-8000-0000000000c1');
select lives_ok(
  $$select public.create_household('22222222-2222-4222-8222-222222222222', '{}', '{}')$$,
  'after leaving, a user may create a new household'
);

select * from finish();
rollback;
