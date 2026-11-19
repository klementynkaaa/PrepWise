-- Access: members (anonymous ones included) read and write their household's
-- rows; anyone else sees nothing; nobody deletes; households are created only
-- through create_household().
begin;
create extension if not exists pgtap with schema extensions;
select plan(32);

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

-- A (anonymous) owns household H with a need, a step and a tick. X (signed in with an
-- email, not anonymous) has no household. Y owns another household.
select t.user('00000000-0000-4000-8000-0000000000a1');
select t.user('00000000-0000-4000-8000-0000000000b1', false);
select t.user('00000000-0000-4000-8000-0000000000c1');

select t.login('00000000-0000-4000-8000-0000000000a1');
select public.create_household('11111111-1111-4111-8111-111111111111', '{"name": "Dom"}', '{}');
insert into public.household_needs (id, household_id, need, selected, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:specialDiet',
  '11111111-1111-4111-8111-111111111111', 'specialDiet', true, now(), '{}');
insert into public.household_steps (id, household_id, step, selected, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:people',
  '11111111-1111-4111-8111-111111111111', 'people', true, now(), '{}');
insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:drinking-water',
  '11111111-1111-4111-8111-111111111111', 'drinking-water', true, 4, now(), '{}');
select public.create_invite('11111111-1111-4111-8111-111111111111');

select t.login('00000000-0000-4000-8000-0000000000c1');
select public.create_household('22222222-2222-4222-8222-222222222222', '{}', '{}');

-- --- an anonymous member reads and writes ------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000a1');

select is((select name from public.households), 'Dom', 'an anonymous member reads their household');
select is((select count(*)::integer from public.households), 1,
  'a member sees only their own household');
select is((select count(*)::integer from public.household_needs), 1, 'an anonymous member reads needs');
select is((select count(*)::integer from public.household_steps), 1, 'an anonymous member reads steps');
select is((select count(*)::integer from public.household_ticks), 1, 'an anonymous member reads ticks');
select is((select count(*)::integer from public.household_members), 1, 'a member reads the member list');
select is((select count(*)::integer from public.household_invites), 1, 'a member reads the invites');

select lives_ok(
  $$update public.households set adults = 2, field_ts = '{"adults": "2026-01-01T00:00:00.000Z"}'
    where id = '11111111-1111-4111-8111-111111111111'$$,
  'an anonymous member updates the household');
select is((select adults from public.households), 2, 'the update is stored');

select lives_ok(
  $$insert into public.household_needs (id, household_id, need, selected, updated_at, field_ts)
    values ('11111111-1111-4111-8111-111111111111:limitedMobility',
      '11111111-1111-4111-8111-111111111111', 'limitedMobility', true, now(), '{}')$$,
  'an anonymous member adds a need');
select lives_ok(
  $$update public.household_steps set selected = false
    where id = '11111111-1111-4111-8111-111111111111:people'$$,
  'an anonymous member updates a step');
select is((select selected from public.household_steps), false, 'the step update is stored');

select lives_ok(
  $$insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
    values ('11111111-1111-4111-8111-111111111111:candles',
      '11111111-1111-4111-8111-111111111111', 'candles', true, 2, now(), '{}')$$,
  'an anonymous member ticks an item');
select lives_ok(
  $$update public.household_ticks set quantity = 4.5
    where id = '11111111-1111-4111-8111-111111111111:drinking-water'$$,
  'an anonymous member updates a tick');
select is(
  (select quantity from public.household_ticks
   where id = '11111111-1111-4111-8111-111111111111:drinking-water'),
  4.5::double precision,
  'the tick update is stored, fraction included');

select throws_ok(
  $$insert into public.household_needs (id, household_id, need, selected, updated_at, field_ts)
    values ('22222222-2222-4222-8222-222222222222:specialDiet',
      '22222222-2222-4222-8222-222222222222', 'specialDiet', true, now(), '{}')$$,
  '42501', null,
  'a member cannot add rows to another household');
select throws_ok(
  $$insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
    values ('22222222-2222-4222-8222-222222222222:candles',
      '22222222-2222-4222-8222-222222222222', 'candles', true, 1, now(), '{}')$$,
  '42501', null,
  'a member cannot tick items of another household');

-- --- a non-member sees nothing -----------------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000b1', false);

select is(
  (select count(*)::integer from public.households)
    + (select count(*)::integer from public.household_needs)
    + (select count(*)::integer from public.household_steps)
    + (select count(*)::integer from public.household_ticks)
    + (select count(*)::integer from public.household_members)
    + (select count(*)::integer from public.household_invites),
  0,
  'a non-member sees no household, need, step, tick, member or invite');

select is_empty($$select * from public.my_household()$$, 'a non-member has no household');

update public.households set name = 'Hacked' where id = '11111111-1111-4111-8111-111111111111';
update public.household_needs set selected = false;
update public.household_ticks set selected = false;

select t.logout();
select is(
  (select name from public.households where id = '11111111-1111-4111-8111-111111111111'),
  'Dom',
  'a non-member''s update changes nothing');
select is(
  (select count(*)::integer from public.household_needs where not selected),
  0,
  'a non-member''s update of needs changes nothing');
select is(
  (select count(*)::integer from public.household_ticks where not selected),
  0,
  'a non-member''s update of ticks changes nothing');

-- --- no client DELETE and no client household insert -------------------------------

select t.login('00000000-0000-4000-8000-0000000000a1');

select throws_ok($$delete from public.households$$, '42501', null,
  'a member cannot DELETE their household');
select throws_ok($$delete from public.household_needs$$, '42501', null,
  'a member cannot DELETE a need');
select throws_ok($$delete from public.household_steps$$, '42501', null,
  'a member cannot DELETE a step');
select throws_ok($$delete from public.household_ticks$$, '42501', null,
  'a member cannot DELETE a tick');
select throws_ok($$delete from public.household_members$$, '42501', null,
  'a member cannot DELETE a membership');
select throws_ok($$delete from public.household_invites$$, '42501', null,
  'a member cannot DELETE an invite');

select throws_ok(
  $$insert into public.households (id) values ('33333333-3333-4333-8333-333333333333')$$,
  '42501', null,
  'a client cannot insert a household directly');

select throws_ok($$select code_hash from public.household_invites$$, '42501', null,
  'a member cannot read the invite code hash');

-- --- no session ----------------------------------------------------------------------

select t.logout();
set local role anon;
select throws_ok($$select * from public.households$$, '42501', null,
  'without a session (anon) the tables are closed');
select throws_ok($$select public.my_household()$$, '42501', null,
  'without a session (anon) the functions are closed');
reset role;

select * from finish();
rollback;
