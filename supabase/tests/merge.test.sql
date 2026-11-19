-- Merge: per-field last write wins by timestamp, clamped to the server clock;
-- delete wins on entity rows; the server sets who changed what; and
-- create_household() stores a full profile, refuses unknown keys and is
-- idempotent.
begin;
create extension if not exists pgtap with schema extensions;
select plan(34);

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

select t.user('00000000-0000-4000-8000-0000000000a1');
select t.user('00000000-0000-4000-8000-0000000000b1');
select t.user('00000000-0000-4000-8000-0000000000c1');

-- --- create_household with a full profile ---------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000a1');

select is(
  public.create_household(
    '11111111-1111-4111-8111-111111111111',
    '{"name": "Dom", "adults": 2, "seniors": 1, "children": 3, "small_children": 1,
      "has_pets": true, "small_dog": 1, "medium_dog": 2, "large_dog": 0, "cat": 4,
      "other_small": 5, "housing_type": "house", "schema_version": 2}',
    '{"name": "2026-01-01T10:00:00.000Z", "adults": "2026-01-01T10:00:01.000Z",
      "seniors": "2026-01-01T10:00:02.000Z", "children": "2026-01-01T10:00:03.000Z",
      "small_children": "2026-01-01T10:00:04.000Z", "has_pets": "2026-01-01T10:00:05.000Z",
      "small_dog": "2026-01-01T10:00:06.000Z", "medium_dog": "2026-01-01T10:00:07.000Z",
      "large_dog": "2026-01-01T10:00:08.000Z", "cat": "2026-01-01T10:00:09.000Z",
      "other_small": "2026-01-01T10:00:10.000Z", "housing_type": "2026-01-01T10:00:11.000Z",
      "schema_version": "2026-01-01T10:00:12.000Z"}'
  ),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'create_household returns the id'
);

select row_eq(
  $$select id, household_id, name, adults, seniors, children, small_children, has_pets,
      small_dog, medium_dog, large_dog, cat, other_small, housing_type, schema_version,
      created_by, updated_by
    from public.households$$,
  row('11111111-1111-4111-8111-111111111111'::uuid, '11111111-1111-4111-8111-111111111111'::uuid,
    'Dom'::text, 2, 1, 3, 1, true, 1, 2, 0, 4, 5, 'house'::text, 2,
    '00000000-0000-4000-8000-0000000000a1'::uuid, '00000000-0000-4000-8000-0000000000a1'::uuid),
  'create_household stores every profile column, and the caller as creator'
);

select is(
  (select field_ts from public.households),
  '{"name": "2026-01-01T10:00:00.000Z", "adults": "2026-01-01T10:00:01.000Z",
    "seniors": "2026-01-01T10:00:02.000Z", "children": "2026-01-01T10:00:03.000Z",
    "small_children": "2026-01-01T10:00:04.000Z", "has_pets": "2026-01-01T10:00:05.000Z",
    "small_dog": "2026-01-01T10:00:06.000Z", "medium_dog": "2026-01-01T10:00:07.000Z",
    "large_dog": "2026-01-01T10:00:08.000Z", "cat": "2026-01-01T10:00:09.000Z",
    "other_small": "2026-01-01T10:00:10.000Z", "housing_type": "2026-01-01T10:00:11.000Z",
    "schema_version": "2026-01-01T10:00:12.000Z"}'::jsonb,
  'create_household stores field_ts as sent'
);

select is((select updated_at from public.households), '2026-01-01T10:00:12.000Z'::timestamptz,
  'updated_at is the latest field timestamp');

select results_eq(
  $$select role, display_name from public.household_members$$,
  $$values ('owner'::text, null::text)$$,
  'the creator is the owner, with no display name yet'
);

select is(
  public.create_household('11111111-1111-4111-8111-111111111111', '{"name": "Inny", "adults": 9}', '{}'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'a retry with the same id returns the id'
);
select results_eq(
  $$select name, adults, (select count(*)::integer from public.household_members) from public.households$$,
  $$values ('Dom'::text, 2, 1)$$,
  'a retry with the same id changes nothing'
);

select t.login('00000000-0000-4000-8000-0000000000b1');
select throws_ok(
  $$select public.create_household('22222222-2222-4222-8222-222222222222', '{"note": "x"}', '{}')$$,
  '22023', 'unknown_field',
  'create_household refuses an unknown key'
);
select throws_ok(
  $$select public.create_household('22222222-2222-4222-8222-222222222222', '{"cat": 21}', '{}')$$,
  '23514', null,
  'create_household applies the table checks'
);
select throws_ok(
  $$select public.create_household('11111111-1111-4111-8111-111111111111', '{}', '{}')$$,
  'P0001', 'household_id_taken',
  'another user cannot claim an existing household id'
);
select lives_ok(
  $$select public.create_household('22222222-2222-4222-8222-222222222222', '{}', '{}')$$,
  'create_household with no fields uses the defaults'
);
select results_eq(
  $$select name, adults, has_pets, housing_type, schema_version, field_ts from public.households$$,
  $$values (null::text, 0, false, null::text, 2, '{}'::jsonb)$$,
  'the defaults are an unnamed, empty household'
);

-- Invite B into A's household, so both edit it.
select t.logout();
delete from public.household_members where user_id = '00000000-0000-4000-8000-0000000000b1';
delete from public.households where id = '22222222-2222-4222-8222-222222222222';
insert into public.household_members (household_id, user_id, role)
values ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000b1', 'member');

-- --- per-field last write wins -----------------------------------------------------------

-- adults was set at 10:00:01, seniors at 10:00:02. B sends adults with an older
-- timestamp and seniors with a newer one.
select t.login('00000000-0000-4000-8000-0000000000b1');
update public.households
set adults = 7, seniors = 4,
  field_ts = '{"adults": "2026-01-01T09:00:00.000Z", "seniors": "2026-01-02T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select adults, seniors, field_ts ->> 'adults', field_ts ->> 'seniors', field_ts ->> 'cat'
    from public.households$$,
  $$values (2, 4, '2026-01-01T10:00:01.000Z', '2026-01-02T00:00:00.000Z', '2026-01-01T10:00:09.000Z')$$,
  'an older timestamp loses and a newer one wins, column by column; other keys stay'
);
select is((select updated_at from public.households), '2026-01-02T00:00:00.000Z'::timestamptz,
  'updated_at is the latest merged timestamp');
select is((select updated_by from public.households), '00000000-0000-4000-8000-0000000000b1'::uuid,
  'updated_by is the user who changed the row');

-- Nothing newer: the row stays exactly as it was.
update public.households
set children = 0, field_ts = '{"children": "2025-01-01T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select children, field_ts ->> 'children' from public.households$$,
  $$values (3, '2026-01-01T10:00:03.000Z')$$,
  'an update where every field is older changes nothing'
);

-- A future timestamp is clamped to the server's now().
update public.households
set cat = 1, field_ts = '{"cat": "2099-01-01T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select cat, (field_ts ->> 'cat')::timestamptz <= now(), updated_at <= now() from public.households$$,
  $$values (1, true, true)$$,
  'a future timestamp is clamped to now()'
);

-- A changed column without a timestamp counts as changed now.
update public.households set other_small = 0 where id = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select other_small, (field_ts ->> 'other_small')::timestamptz > '2026-01-01T10:00:10.000Z'
    from public.households$$,
  $$values (0, true)$$,
  'a change without a timestamp is stamped with the server time'
);

-- field_ts keeps only keys that name a data column.
update public.households
set field_ts = '{"bogus": "2026-01-01T00:00:00.000Z", "updated_at": "2026-01-01T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111';
select is(
  (select field_ts ?| array['bogus', 'updated_at'] from public.households),
  false,
  'an update drops field_ts keys for system columns and for no column'
);

-- The server columns and the keys cannot be changed by a client.
update public.households
set created_by = '00000000-0000-4000-8000-0000000000c1',
  updated_by = '00000000-0000-4000-8000-0000000000c1',
  created_at = '2000-01-01T00:00:00Z',
  name = 'Dom B', field_ts = '{"name": "2026-01-03T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111';
select results_eq(
  $$select name, created_by, updated_by, created_at > '2000-01-02'::timestamptz from public.households$$,
  $$values ('Dom B'::text, '00000000-0000-4000-8000-0000000000a1'::uuid,
    '00000000-0000-4000-8000-0000000000b1'::uuid, true)$$,
  'created_by, updated_by and created_at come from the server, not the client'
);

-- --- set rows: selected toggles merge by timestamp ------------------------------------------

insert into public.household_needs (id, household_id, need, selected, created_by, updated_by,
  updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:specialDiet', '11111111-1111-4111-8111-111111111111',
  'specialDiet', true, '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000c1',
  now(), '{"need": "2026-01-01T00:00:00.000Z", "selected": "2026-01-01T00:00:00.000Z"}');
insert into public.household_steps (id, household_id, step, selected, field_ts)
values ('11111111-1111-4111-8111-111111111111:people', '11111111-1111-4111-8111-111111111111',
  'people', true, '{"selected": "2026-01-01T00:00:00.000Z", "bogus": "2026-01-01T00:00:00.000Z"}');
select is(
  (select field_ts from public.household_steps),
  '{"selected": "2026-01-01T00:00:00.000Z"}'::jsonb,
  'an insert drops field_ts keys that name no column'
);
select t.logout();
delete from public.household_steps;
select t.login('00000000-0000-4000-8000-0000000000b1');
select results_eq(
  $$select created_by, updated_by, updated_at from public.household_needs$$,
  $$values ('00000000-0000-4000-8000-0000000000b1'::uuid, '00000000-0000-4000-8000-0000000000b1'::uuid,
    '2026-01-01T00:00:00.000Z'::timestamptz)$$,
  'an insert takes created_by and updated_by from auth.uid(), and updated_at from field_ts'
);

update public.household_needs
set selected = false, field_ts = '{"selected": "2026-01-03T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111:specialDiet';
select is((select selected from public.household_needs), false, 'a newer toggle off wins');

select t.login('00000000-0000-4000-8000-0000000000a1');
update public.household_needs
set selected = true, field_ts = '{"selected": "2026-01-02T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111:specialDiet';
select results_eq(
  $$select selected, updated_by from public.household_needs$$,
  $$values (false, '00000000-0000-4000-8000-0000000000b1'::uuid)$$,
  'an older toggle on loses, and the row keeps its last writer'
);

update public.household_needs
set selected = true, field_ts = '{"selected": "2026-01-04T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111:specialDiet';
select results_eq(
  $$select selected, field_ts ->> 'selected', field_ts ->> 'need' from public.household_needs$$,
  $$values (true, '2026-01-04T00:00:00.000Z', '2026-01-01T00:00:00.000Z')$$,
  'a newer toggle on wins, so a removed element can come back'
);

insert into public.household_steps (id, household_id, step, selected, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:pets', '11111111-1111-4111-8111-111111111111',
  'pets', true, now(), '{"selected": "2026-01-05T00:00:00.000Z"}');
update public.household_steps
set selected = false, field_ts = '{"selected": "2026-01-04T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111:pets';
select is((select selected from public.household_steps), true,
  'steps merge by timestamp too');

select throws_ok(
  $$insert into public.household_steps (id, household_id, step, selected, updated_at, field_ts)
    values ('11111111-1111-4111-8111-111111111111:people', '11111111-1111-4111-8111-111111111111',
      'housing', true, now(), '{}')$$,
  '23514', null,
  'a set row id must be <household_id>:<element>'
);

-- --- tick rows: selected and quantity merge per field ---------------------------------------

insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
values ('11111111-1111-4111-8111-111111111111:drinking-water', '11111111-1111-4111-8111-111111111111',
  'drinking-water', true, 4, now(), '{"item": "2026-01-01T00:00:00.000Z",
  "selected": "2026-01-01T00:00:00.000Z", "quantity": "2026-01-01T00:00:00.000Z"}');

-- One device unticks; another, whose untick-then-tick is older, re-ticks at a
-- grown quantity. The newer untick wins `selected`; the newer quantity wins too.
update public.household_ticks
set selected = false, field_ts = '{"selected": "2026-01-03T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111:drinking-water';
update public.household_ticks
set selected = true, quantity = 6.5,
  field_ts = '{"selected": "2026-01-02T00:00:00.000Z", "quantity": "2026-01-02T00:00:00.000Z"}'
where id = '11111111-1111-4111-8111-111111111111:drinking-water';
select results_eq(
  $$select selected, quantity from public.household_ticks$$,
  $$values (false, 6.5::double precision)$$,
  'ticks merge per field: the newer selected and the newer quantity each win'
);
select results_eq(
  $$select field_ts ->> 'selected', field_ts ->> 'quantity', field_ts ->> 'item'
    from public.household_ticks$$,
  $$values ('2026-01-03T00:00:00.000Z', '2026-01-02T00:00:00.000Z', '2026-01-01T00:00:00.000Z')$$,
  'a tick keeps the newest timestamp per column'
);

select throws_ok(
  $$insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
    values ('11111111-1111-4111-8111-111111111111:DrinkingWater',
      '11111111-1111-4111-8111-111111111111', 'DrinkingWater', true, 1, now(), '{}')$$,
  '23514', null,
  'a tick item must be a kebab-case slug'
);
select throws_ok(
  $$insert into public.household_ticks (id, household_id, item, selected, quantity, updated_at, field_ts)
    values ('11111111-1111-4111-8111-111111111111:candles',
      '11111111-1111-4111-8111-111111111111', 'candles', true, -1, now(), '{}')$$,
  '23514', null,
  'a tick quantity is never negative'
);

-- --- entity rows: delete wins (a test-only table with the shared triggers) ----------------

select t.logout();
create table public.test_items (
  id uuid primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  note text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_by uuid,
  updated_at timestamptz not null default now(),
  field_ts jsonb not null default '{}',
  deleted_at timestamptz
);
create trigger test_items_stamp_insert before insert on public.test_items
  for each row execute function private.stamp_insert();
create trigger test_items_merge before update on public.test_items
  for each row execute function private.merge_row();

select t.login('00000000-0000-4000-8000-0000000000a1');
insert into public.test_items (id, household_id, note, field_ts)
values ('44444444-4444-4444-8444-444444444444', '11111111-1111-4111-8111-111111111111', 'woda',
  '{"note": "2026-01-01T00:00:00.000Z"}');

-- The delete carries an older timestamp than the note, and still wins.
update public.test_items
set deleted_at = '2026-01-02T00:00:00Z', field_ts = '{"deleted_at": "2025-12-01T00:00:00.000Z"}'
where id = '44444444-4444-4444-8444-444444444444';
select isnt((select deleted_at from public.test_items), null, 'setting deleted_at deletes the entity');

update public.test_items
set note = 'później', field_ts = '{"note": "2026-02-01T00:00:00.000Z"}'
where id = '44444444-4444-4444-8444-444444444444';
select is((select note from public.test_items), 'woda',
  'a later edit of a deleted entity is ignored (delete wins)');

update public.test_items
set deleted_at = null, field_ts = '{"deleted_at": "2026-03-01T00:00:00.000Z"}'
where id = '44444444-4444-4444-8444-444444444444';
select isnt((select deleted_at from public.test_items), null,
  'a deleted entity cannot be brought back');

select * from finish();
rollback;
