-- Run AFTER schema.sql + storage.sql (already applied to the live project as migration "04_shipper_portal_and_mfa").
-- 1) Shipper logins for the customer portal. Shippers are NOT staff: they have no row in profiles, so every staff
--    policy (which all go through app_role()/is_staff()) returns nothing for them. They reach their own freight
--    only through the narrow functions below, which never return carrier names, carrier pay, profit or other shippers.
-- 2) Two-step sign-in enforcement: once a staff member has turned on an authenticator app, the database itself refuses
--    their data until the session has passed the code check (so a stolen password alone is useless).
-- 3) Guard on the ID counters so only staff can draw numbers.

-- ---------- 2. two-step enforcement (inside app_role, so it covers every policy at once) ----------
create or replace function mfa_ok() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(auth.jwt()->>'aal','') = 'aal2'
        or not exists (select 1 from auth.mfa_factors f where f.user_id = auth.uid() and f.status = 'verified') $$;
create or replace function app_role() returns text language sql stable security definer set search_path=public as
$$ select role from profiles where id = auth.uid() and active and mfa_ok() $$;
revoke execute on function mfa_ok() from public, anon, authenticated;

-- ---------- 3. counters: staff only ----------
create or replace function next_load_id(p_dept text) returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  if p_dept = 'Dispatch' then return 'DL-'||to_char(now(),'YY')||'-'||lpad(nextval('load_seq_dl')::text,4,'0');
  else return 'ML-'||to_char(now(),'YY')||'-'||lpad(nextval('load_seq_ml')::text,4,'0'); end if;
end $$;
create or replace function next_quote_id() returns text language plpgsql security definer set search_path=public as $$
begin
  if not is_staff() then raise exception 'Not allowed'; end if;
  return 'Q-'||nextval('quote_seq')::text;
end $$;

-- ---------- 1. shipper logins ----------
create table if not exists shipper_users (
  id uuid primary key references auth.users(id) on delete cascade,
  account_id uuid not null references accounts(id),
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists shipper_users_account on shipper_users(account_id);
alter table shipper_users enable row level security;
drop policy if exists su_self on shipper_users;
create policy su_self on shipper_users for select using (id = auth.uid());
drop policy if exists su_admin on shipper_users;
create policy su_admin on shipper_users for all using (is_admin()) with check (is_admin());
drop trigger if exists audit_shipper_users on shipper_users;
create trigger audit_shipper_users after insert or update or delete on shipper_users for each row execute function audit_row('id');

create or replace function my_account() returns uuid language sql stable security definer set search_path=public as
$$ select account_id from shipper_users where id = auth.uid() and active $$;

create or replace function shipper_me() returns json language sql stable security definer set search_path=public as $$
  select json_build_object('name', s.full_name, 'company', a.name, 'email', auth.jwt()->>'email')
  from shipper_users s join accounts a on a.id = s.account_id where s.id = auth.uid() and s.active $$;

-- Only Brokerage freight for the caller's own company. Amount shows only once an invoice is out. Never profit.
create or replace function shipper_loads() returns table (
  id text, origin text, destination text, miles int, pickup_date date, status text,
  invoice_status text, amount numeric, has_bol boolean, has_pod boolean, created_at timestamptz)
language sql stable security definer set search_path=public as $$
  select l.id, l.origin, l.destination, l.miles, l.pickup_date, l.status, l.invoice_status,
         case when l.invoice_status in ('Invoiced','Paid') then m.revenue end,
         exists (select 1 from load_docs d where d.load_id = l.id and d.kind = 'bol'),
         exists (select 1 from load_docs d where d.load_id = l.id and d.kind = 'pod'),
         l.created_at
  from loads l left join load_money m on m.load_id = l.id
  where l.account_id = my_account() and l.dept = 'Brokerage'
  order by l.pickup_date desc nulls last, l.created_at desc $$;

create or replace function shipper_quotes() returns table (
  id text, origin text, destination text, miles int, rate_per_mile numeric, total numeric, sent_on date, status text)
language sql stable security definer set search_path=public as $$
  select q.id, q.origin, q.destination, q.miles, q.rate_per_mile, round(coalesce(q.miles,0) * q.rate_per_mile), q.sent_on, q.status
  from quotes q where q.account_id = my_account() order by q.sent_on desc, q.id desc $$;

-- Path of a BOL or POD for a load that belongs to the caller (the file itself is then fetched with a short-lived link).
create or replace function shipper_doc_path(p_load text, p_kind text) returns text language sql stable security definer set search_path=public as $$
  select d.file_path from load_docs d join loads l on l.id = d.load_id
  where d.load_id = p_load and d.kind = p_kind and p_kind in ('bol','pod')
    and l.account_id = my_account() and l.dept = 'Brokerage' $$;

-- A quote request typed into the portal lands in the staff Inbox like a website request.
create or replace function shipper_request_quote(p_origin text, p_dest text, p_equip text, p_pickup text, p_weight text, p_notes text)
returns void language plpgsql security definer set search_path=public as $$
declare me json; recent int;
begin
  me := shipper_me();
  if me is null then raise exception 'Not allowed'; end if;
  if coalesce(trim(p_origin),'') = '' or coalesce(trim(p_dest),'') = '' then raise exception 'Enter where it picks up and where it delivers.'; end if;
  select count(*) into recent from intake_submissions where fields->>'portal_user' = auth.uid()::text and created_at > now() - interval '1 day';
  if recent >= 20 then raise exception 'That is a lot of requests today. Please call us instead.'; end if;
  insert into intake_submissions(kind, subject, summary, fields) values (
    'Quote Request',
    'Portal quote request: ' || left(trim(p_origin),80) || ' to ' || left(trim(p_dest),80),
    'Sent from the shipper portal by ' || (me->>'name') || ' (' || (me->>'company') || ').',
    jsonb_build_object('company', me->>'company', 'name', me->>'name', 'email', me->>'email',
      'origin', left(trim(p_origin),120), 'dest', left(trim(p_dest),120), 'equip', left(coalesce(p_equip,''),40),
      'date', left(coalesce(p_pickup,''),20), 'weight', left(coalesce(p_weight,''),20), 'notes', left(coalesce(p_notes,''),1000),
      'source', 'Shipper portal', 'portal_user', auth.uid()::text));
end $$;

revoke execute on function my_account(), shipper_me(), shipper_loads(), shipper_quotes(), shipper_doc_path(text,text),
  shipper_request_quote(text,text,text,text,text,text), next_load_id(text), next_quote_id() from public, anon;
grant execute on function my_account(), shipper_me(), shipper_loads(), shipper_quotes(), shipper_doc_path(text,text),
  shipper_request_quote(text,text,text,text,text,text), next_load_id(text), next_quote_id() to authenticated;

-- Shippers may download only the BOL and POD of their own loads.
drop policy if exists "load docs shipper read" on storage.objects;
create policy "load docs shipper read" on storage.objects for select to authenticated using (
  bucket_id = 'load-docs'
  and exists (select 1 from public.loads l where l.id = (storage.foldername(name))[1] and l.account_id = public.my_account() and l.dept = 'Brokerage')
  and (storage.filename(name) like 'bol-%' or storage.filename(name) like 'pod-%'));
