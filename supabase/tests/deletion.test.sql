-- Account deletion: deleting a user by any path applies the leave rules first.
begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

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
  '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1'
]) u;

-- Shared household H: owner A, members B (earlier) and C. Sole household S: D.
select t.login('00000000-0000-4000-8000-0000000000a1');
select public.create_household('11111111-1111-4111-8111-111111111111', '{"name": "Dom"}', '{}');
select public.create_invite('11111111-1111-4111-8111-111111111111');
select t.login('00000000-0000-4000-8000-0000000000d1');
select public.create_household('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{"name": "Sam"}', '{}');
insert into public.household_needs (id, household_id, need, selected, updated_at, field_ts)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd:specialDiet', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'specialDiet', true, now(), '{}');
insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd:candles', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'candles', true, 2, now(), '{}');
insert into public.household_emergencies (id, household_id, emergency, selected, updated_at, field_ts)
values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd:blackout', 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'blackout', true, now(), '{}');
select t.logout();
insert into public.household_members (household_id, user_id, role, joined_at) values
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000c1', 'member', now() + interval '2 minutes'),
  ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000b1', 'member', now() + interval '1 minute');

-- --- the owner of a shared household --------------------------------------------------------

select lives_ok(
  $$delete from auth.users where id = '00000000-0000-4000-8000-0000000000a1'$$,
  'the owner of a shared household is deleted'
);
select is(
  (select count(*)::integer from public.households where id = '11111111-1111-4111-8111-111111111111'),
  1,
  'the shared household stays'
);
select results_eq(
  $$select user_id, role from public.household_members
    where household_id = '11111111-1111-4111-8111-111111111111' order by joined_at$$,
  $$values ('00000000-0000-4000-8000-0000000000b1'::uuid, 'owner'::text),
    ('00000000-0000-4000-8000-0000000000c1'::uuid, 'member'::text)$$,
  'the earliest member becomes the owner'
);
select is(
  (select count(*)::integer from public.household_invites
   where created_by = '00000000-0000-4000-8000-0000000000a1'),
  0,
  'the deleted user''s invites are gone'
);

-- --- a member who is not the owner ---------------------------------------------------------------

select lives_ok(
  $$delete from auth.users where id = '00000000-0000-4000-8000-0000000000c1'$$,
  'a member is deleted'
);
select results_eq(
  $$select user_id, role from public.household_members
    where household_id = '11111111-1111-4111-8111-111111111111'$$,
  $$values ('00000000-0000-4000-8000-0000000000b1'::uuid, 'owner'::text)$$,
  'the owner stays the owner'
);

-- --- a sole member ---------------------------------------------------------------------------------

select lives_ok(
  $$delete from auth.users where id = '00000000-0000-4000-8000-0000000000d1'$$,
  'a sole member is deleted'
);
select is(
  (select count(*)::integer from public.households where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    + (select count(*)::integer from public.household_needs
       where household_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    + (select count(*)::integer from public.household_ticks
       where household_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd')
    + (select count(*)::integer from public.household_emergencies
       where household_id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  0,
  'their household and its rows, ticks and emergencies included, are deleted'
);

select lives_ok($$set constraints household_members_one_owner_check immediate$$,
  'the owner rule holds after the deletions');

select * from finish();
rollback;
