-- Invites: any member invites; peek shows the household; redeem adds a member;
-- bad codes fail with their reason and stay logged; one household per person,
-- with an explicit replace; at most 10 failed attempts per user per hour.
begin;
create extension if not exists pgtap with schema extensions;
select plan(55);

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

create table t.codes (name text primary key, code text not null);
grant all on t.codes to authenticated;

-- A owns H ("Dom"). B joins it. C has no household. D owns a household alone.
-- E shares a household with F (E owns it). G only guesses.
select t.user(u::uuid) from unnest(array[
  '00000000-0000-4000-8000-0000000000a1', '00000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000d1',
  '00000000-0000-4000-8000-0000000000e1', '00000000-0000-4000-8000-0000000000f1',
  '00000000-0000-4000-8000-000000000071'
]) u;

select t.login('00000000-0000-4000-8000-0000000000d1');
select public.create_household('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{"name": "D"}', '{}');

select t.login('00000000-0000-4000-8000-0000000000e1');
select public.create_household('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', '{"name": "E"}', '{}');
insert into t.codes values ('e', public.create_invite('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'));
select t.login('00000000-0000-4000-8000-0000000000f1');
select public.redeem_invite((select code from t.codes where name = 'e'), 'F', false);

select t.login('00000000-0000-4000-8000-0000000000a1');
select public.create_household('11111111-1111-4111-8111-111111111111', '{"name": "Dom"}', '{}');
select t.logout();
update public.household_members set display_name = 'Ania'
where user_id = '00000000-0000-4000-8000-0000000000a1';
select t.login('00000000-0000-4000-8000-0000000000a1');

-- --- creating invites ------------------------------------------------------------------

insert into t.codes values ('a1', public.create_invite('11111111-1111-4111-8111-111111111111'));
select matches((select code from t.codes where name = 'a1'), '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$',
  'a code is 8 characters from the alphabet without look-alikes');

select t.logout();
select results_eq(
  $$select code_hash = sha256(convert_to((select code from t.codes where name = 'a1'), 'UTF8')),
      max_uses, use_count, expires_at = now() + interval '48 hours', revoked_at is null
    from public.household_invites where household_id = '11111111-1111-4111-8111-111111111111'$$,
  $$values (true, 1, 0, true, true)$$,
  'only the sha256 of the code is stored; single use, valid for 48 hours'
);

select t.login('00000000-0000-4000-8000-0000000000c1');
select throws_ok(
  $$select public.create_invite('11111111-1111-4111-8111-111111111111')$$,
  'P0001', 'not_member',
  'a non-member cannot invite'
);

-- --- peek and redeem --------------------------------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000b1');
select is(
  public.peek_invite((select code from t.codes where name = 'a1')),
  '{"ok": true, "household_name": "Dom", "inviter_display_name": "Ania", "my_household": "none",
    "already_member": false}'::jsonb,
  'peek shows the household name and the inviter, and that B has no household'
);
select is(
  public.redeem_invite(lower(substr((select code from t.codes where name = 'a1'), 1, 4)) || '- '
    || substr((select code from t.codes where name = 'a1'), 5), 'Bartek', false),
  '{"ok": true, "household_id": "11111111-1111-4111-8111-111111111111"}'::jsonb,
  'redeem (lowercase, with a dash and a space) adds B to the household'
);
select results_eq(
  $$select role, display_name from public.household_members
    where user_id = '00000000-0000-4000-8000-0000000000b1'$$,
  $$values ('member'::text, 'Bartek'::text)$$,
  'B is a member, with the display name they gave'
);
select is((select name from public.households), 'Dom', 'B now reads the household');

-- Any member invites, not only the owner.
insert into t.codes values ('b1', public.create_invite('11111111-1111-4111-8111-111111111111'));
select matches((select code from t.codes where name = 'b1'), '^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$',
  'a member (not the owner) creates an invite');

-- A member redeeming again is a no-op that does not use the invite up.
select is(
  public.redeem_invite((select code from t.codes where name = 'b1'), 'Bartek', false),
  '{"ok": true, "household_id": "11111111-1111-4111-8111-111111111111"}'::jsonb,
  'a member redeeming an invite to their household succeeds'
);
select is(
  public.peek_invite((select code from t.codes where name = 'b1')) ->> 'already_member',
  'true',
  'peek tells a member they are in that household already'
);
select t.logout();
select results_eq(
  $$select use_count from public.household_invites i
    where i.code_hash = sha256(convert_to((select code from t.codes where name = 'b1'), 'UTF8'))$$,
  $$values (0)$$,
  'a member redeeming again does not use the invite up'
);
select is(
  (select count(*)::integer from public.household_members
   where household_id = '11111111-1111-4111-8111-111111111111'),
  2,
  'a member redeeming again adds no second membership'
);
select results_eq(
  $$select use_count from public.household_invites i
    where i.code_hash = sha256(convert_to((select code from t.codes where name = 'a1'), 'UTF8'))$$,
  $$values (1)$$,
  'a redeemed invite counts the use'
);

-- --- failures and their codes ------------------------------------------------------------

select t.login('00000000-0000-4000-8000-0000000000c1');
select is(public.redeem_invite((select code from t.codes where name = 'a1'), null, false),
  '{"ok": false, "code": "invite_used"}'::jsonb, 'a used-up invite fails with invite_used');
select is(public.peek_invite((select code from t.codes where name = 'a1')),
  '{"ok": false, "code": "invite_used"}'::jsonb, 'peek on a used-up invite fails with invite_used');
select is(public.redeem_invite('ZZZZ2222', null, false),
  '{"ok": false, "code": "invite_not_found"}'::jsonb, 'a wrong code fails with invite_not_found');
select is(public.peek_invite('not a code'),
  '{"ok": false, "code": "invite_not_found"}'::jsonb, 'a malformed code fails with invite_not_found');

select t.logout();
insert into t.codes values ('expired', 'EXP22222'), ('revoked', 'REV22222');
insert into public.household_invites (household_id, code_hash, created_by, expires_at)
values ('11111111-1111-4111-8111-111111111111', sha256(convert_to('EXP22222', 'UTF8')),
  '00000000-0000-4000-8000-0000000000a1', now() - interval '1 second');
insert into public.household_invites (household_id, code_hash, created_by)
values ('11111111-1111-4111-8111-111111111111', sha256(convert_to('REV22222', 'UTF8')),
  '00000000-0000-4000-8000-0000000000b1');

select t.login('00000000-0000-4000-8000-0000000000c1');
select is(public.redeem_invite('EXP22222', null, false),
  '{"ok": false, "code": "invite_expired"}'::jsonb, 'an expired invite fails with invite_expired');

-- Revoking: the creator or the owner may, another member may not.
select t.login('00000000-0000-4000-8000-0000000000a1');
insert into t.codes values ('a2', public.create_invite('11111111-1111-4111-8111-111111111111'));
select t.logout();
create table t.ids (name text primary key, id uuid not null);
grant select on t.ids to authenticated;
insert into t.ids
select c.name, i.id
from t.codes c
join public.household_invites i on i.code_hash = sha256(convert_to(c.code, 'UTF8'))
where c.name in ('a2', 'b1', 'revoked');

select t.login('00000000-0000-4000-8000-0000000000b1');
select throws_ok(
  format('select public.revoke_invite(%L)', (select id from t.ids where name = 'a2')),
  'P0001', 'not_owner', 'a member cannot revoke an invite they did not create');
select lives_ok(
  format('select public.revoke_invite(%L)', (select id from t.ids where name = 'b1')),
  'the creator revokes their own invite');
select t.login('00000000-0000-4000-8000-0000000000a1');
select lives_ok(
  format('select public.revoke_invite(%L)', (select id from t.ids where name = 'revoked')),
  'the owner revokes a member''s invite');
select t.login('00000000-0000-4000-8000-0000000000c1');
select throws_ok(
  format('select public.revoke_invite(%L)', (select id from t.ids where name = 'a2')),
  'P0001', 'invite_not_found', 'a non-member cannot revoke (the invite is not found for them)');
select t.logout();
select results_eq(
  $$select name, revoked_at is not null from t.ids join public.household_invites i using (id)
    order by name$$,
  $$values ('a2'::text, false), ('b1', true), ('revoked', true)$$,
  'only the allowed revokes took effect'
);
select t.login('00000000-0000-4000-8000-0000000000c1');
select is(public.redeem_invite('REV22222', null, false),
  '{"ok": false, "code": "invite_revoked"}'::jsonb, 'a revoked invite fails with invite_revoked');
select is(public.peek_invite('REV22222'),
  '{"ok": false, "code": "invite_revoked"}'::jsonb, 'peek on a revoked invite fails with invite_revoked');

select t.logout();
select is(
  (select count(*)::integer from public.invite_attempts
   where user_id = '00000000-0000-4000-8000-0000000000c1' and failed),
  7,
  'every failed peek and redeem stays logged'
);
select results_eq(
  $$select code from public.invite_attempts
    where user_id = '00000000-0000-4000-8000-0000000000c1' order by id$$,
  $$values ('invite_used'), ('invite_used'), ('invite_not_found'), ('invite_not_found'),
    ('invite_expired'), ('invite_revoked'), ('invite_revoked')$$,
  'each attempt is logged with its reason'
);

-- --- one household per person, and replacing it ----------------------------------------------

select t.logout();
select throws_ok(
  $$insert into public.household_members (household_id, user_id, role)
    values ('11111111-1111-4111-8111-111111111111', '00000000-0000-4000-8000-0000000000d1', 'member')$$,
  '23505', null,
  'a second membership for the same user is rejected'
);

select t.login('00000000-0000-4000-8000-0000000000d1');
select throws_ok(
  $$select public.create_household('99999999-9999-4999-8999-999999999999', '{}', '{}')$$,
  'P0001', 'already_in_household',
  'create_household refuses a member of another household'
);

select t.login('00000000-0000-4000-8000-0000000000a1');
insert into t.codes values ('d', public.create_invite('11111111-1111-4111-8111-111111111111'));
insert into t.codes values ('f', public.create_invite('11111111-1111-4111-8111-111111111111'));
insert into t.codes values ('e2', public.create_invite('11111111-1111-4111-8111-111111111111'));

-- D owns a household alone.
select t.login('00000000-0000-4000-8000-0000000000d1');
select is(public.peek_invite((select code from t.codes where name = 'd')) ->> 'my_household', 'alone',
  'peek reports alone for a sole member');
select is(public.redeem_invite((select code from t.codes where name = 'd'), 'D', false),
  '{"ok": false, "code": "household_exists"}'::jsonb,
  'a member of another household is refused without replace_existing');
select is(
  (select household_id from public.household_members where user_id = '00000000-0000-4000-8000-0000000000d1'),
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd'::uuid,
  'the refusal leaves the membership as it was'
);
select is(public.redeem_invite((select code from t.codes where name = 'd'), 'D', true),
  '{"ok": true, "household_id": "11111111-1111-4111-8111-111111111111"}'::jsonb,
  'with replace_existing they join');
select t.logout();
select is(
  (select count(*)::integer from public.households where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'),
  0,
  'their old household, where they were alone, is deleted'
);

-- E owns a household shared with F.
select t.login('00000000-0000-4000-8000-0000000000e1');
select is(public.peek_invite((select code from t.codes where name = 'e2')) ->> 'my_household', 'shared',
  'peek reports shared for a household with other members');
select is(public.redeem_invite((select code from t.codes where name = 'e2'), 'E', true),
  '{"ok": true, "household_id": "11111111-1111-4111-8111-111111111111"}'::jsonb,
  'with replace_existing the owner of a shared household joins');
select t.logout();
select results_eq(
  $$select user_id, role from public.household_members
    where household_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'$$,
  $$values ('00000000-0000-4000-8000-0000000000f1'::uuid, 'owner'::text)$$,
  'their old household stays, and its ownership passes to the remaining member'
);
select is(
  (select household_id from public.household_members where user_id = '00000000-0000-4000-8000-0000000000e1'),
  '11111111-1111-4111-8111-111111111111'::uuid,
  'they are a member of the new household only'
);
select is(
  (select revoked_at is not null from public.household_invites
   where created_by = '00000000-0000-4000-8000-0000000000e1'
     and household_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'),
  true,
  'their open invites to the old household are revoked when they leave'
);

-- --- the attempt limit -------------------------------------------------------------------------

select t.login('00000000-0000-4000-8000-000000000071');
select is(public.peek_invite('ZZZZ2222') ->> 'code', 'invite_not_found', format('guess %s by peek', n))
from generate_series(1, 5) n;
select is(public.redeem_invite('ZZZZ2222', null, false) ->> 'code', 'invite_not_found',
  format('guess %s by redeem', n + 5))
from generate_series(1, 4) n;
-- A success in between is not a failure.
select is(public.peek_invite((select code from t.codes where name = 'f')) ->> 'ok', 'true',
  'a good peek is not counted as a failure');
select is(public.redeem_invite('ZZZZ2222', null, false) ->> 'code', 'invite_not_found',
  'the tenth failure is still answered');
select is(public.redeem_invite((select code from t.codes where name = 'f'), 'G', false),
  '{"ok": false, "code": "too_many_attempts"}'::jsonb,
  'the eleventh attempt after ten failures in an hour is refused, even with a good code');
select is(public.peek_invite((select code from t.codes where name = 'f')),
  '{"ok": false, "code": "too_many_attempts"}'::jsonb,
  'peek shares the same limit');

select t.logout();
select results_eq(
  $$select count(*) filter (where failed)::integer, count(*) filter (where not failed)::integer
    from public.invite_attempts where user_id = '00000000-0000-4000-8000-000000000071'$$,
  $$values (12, 1)$$,
  'every failed attempt stays logged, the refused ones included'
);
select is(
  (select count(*)::integer from public.household_members
   where user_id = '00000000-0000-4000-8000-000000000071'),
  0,
  'the refused redeem added no membership'
);

-- An hour later the limit no longer applies.
update public.invite_attempts set attempted_at = now() - interval '61 minutes'
where user_id = '00000000-0000-4000-8000-000000000071';
select t.login('00000000-0000-4000-8000-000000000071');
select is(public.redeem_invite((select code from t.codes where name = 'f'), 'G', false) ->> 'ok', 'true',
  'failures older than an hour no longer count');

select * from finish();
rollback;
