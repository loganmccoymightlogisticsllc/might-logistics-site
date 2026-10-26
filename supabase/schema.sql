-- Might Logistics back end: one database for every department.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query > paste > Run).
-- Privacy rules are enforced HERE, in the database, so a bug in a web page cannot leak data:
--   * employees never see money (revenue, profit, estimated profit): those live in admin-only tables
--   * brokers see brokerage work, dispatchers see dispatch work, sales sees only what they sourced
--   * the audit log is admin-only and cannot be edited or deleted by anyone

-- ---------- people ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','broker','dispatcher','sales')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function app_role() returns text language sql stable security definer set search_path=public as
$$ select role from profiles where id = auth.uid() and active $$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path=public as
$$ select coalesce(app_role() = 'admin', false) $$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path=public as
$$ select app_role() is not null $$;
create or replace function my_dept() returns text language sql stable security definer set search_path=public as
$$ select case app_role() when 'broker' then 'Brokerage' when 'dispatcher' then 'Dispatch' end $$;

-- ---------- companies ----------
create table if not exists accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('Carrier','Shipper')),
  mc text, dot text, city text, state text, phone text,
  trucks int, equipment text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists accounts_mc on accounts(mc);
create index if not exists accounts_name on accounts(lower(name));

create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  name text not null, role text, email text, phone text,
  created_at timestamptz not null default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  dept text not null check (dept in ('Dispatch','Brokerage')),
  name text not null,
  stage text not null,
  owner_id uuid references profiles(id),
  sourced_by uuid references profiles(id),      -- the sales rep who found it, if any
  source text,
  created_at timestamptz not null default now()
);
create index if not exists opp_account on opportunities(account_id);

-- money for opportunities: admin only
create table if not exists opp_money (
  opportunity_id uuid primary key references opportunities(id) on delete cascade,
  est_monthly_profit numeric(12,2) not null default 0
);

-- ---------- loads ----------
create sequence if not exists load_seq_dl start 1;
create sequence if not exists load_seq_ml start 1;
create table if not exists loads (
  id text primary key,                          -- DL-26-0001 (dispatch) or ML-26-0001 (brokerage)
  account_id uuid not null references accounts(id),
  opportunity_id uuid references opportunities(id),
  dept text not null check (dept in ('Dispatch','Brokerage')),
  created_by uuid default auth.uid(),
  origin text not null, destination text not null,
  miles int, pickup_date date,
  status text not null default 'Booked' check (status in ('Booked','Shipped','Delivered')),
  carrier_id uuid references accounts(id),
  invoice_status text not null default 'Not ready' check (invoice_status in ('Not ready','Ready','Invoiced','Paid')),
  pay_status text not null default 'Held' check (pay_status in ('Held','Released')),
  created_at timestamptz not null default now()
);
create index if not exists loads_account on loads(account_id);
create index if not exists loads_pickup on loads(pickup_date);

-- money for loads: admin only
create table if not exists load_money (
  load_id text primary key references loads(id) on delete cascade,
  revenue numeric(12,2) not null default 0,
  profit numeric(12,2) not null default 0
);

create table if not exists load_docs (
  id uuid primary key default gen_random_uuid(),
  load_id text not null references loads(id) on delete cascade,
  kind text not null check (kind in ('rc','bol','pod')),
  file_path text not null,                      -- path inside the private "load-docs" storage bucket
  file_name text,
  uploaded_by uuid default auth.uid(),
  uploaded_at timestamptz not null default now(),
  unique (load_id, kind)
);

-- invoice-ready gate: a load cannot be Ready/Invoiced/Paid without a delivered status and a POD
create or replace function check_invoice_gate() returns trigger language plpgsql as $$
begin
  if new.invoice_status in ('Ready','Invoiced','Paid') then
    if new.status <> 'Delivered' or not exists (select 1 from load_docs where load_id = new.id and kind = 'pod') then
      raise exception 'Load % cannot be invoiced until it is delivered and the proof of delivery is uploaded', new.id;
    end if;
  end if;
  if new.pay_status = 'Released' and new.dept = 'Brokerage' and new.invoice_status not in ('Invoiced','Paid') then
    raise exception 'Carrier payment on % cannot be released until the shipper invoice is out', new.id;
  end if;
  return new;
end $$;
drop trigger if exists loads_invoice_gate on loads;
create trigger loads_invoice_gate before insert or update on loads for each row execute function check_invoice_gate();

-- ---------- quotes ----------
create table if not exists quotes (
  id text primary key,
  opportunity_id uuid references opportunities(id),
  account_id uuid not null references accounts(id),
  owner_id uuid references profiles(id) default auth.uid(),
  origin text not null, destination text not null, miles int,
  rate_per_mile numeric(8,2) not null,
  sent_on date not null default current_date,
  last_touch date not null default current_date,
  followups int not null default 0,
  status text not null default 'Sent' check (status in ('Sent','Won','Lost')),
  lost_reason text
);

-- ---------- carrier vetting ----------
create table if not exists carrier_vetting (
  account_id uuid primary key references accounts(id) on delete cascade,
  authority_status text not null default 'Active',
  authority_since date,
  auto_amount numeric(12,0), auto_expires date,
  cargo_amount numeric(12,0), cargo_expires date,
  safety_rating text not null default 'Not rated',
  out_of_service boolean not null default false,
  checked_on date
);

-- ---------- sales ----------
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Carrier','Shipper')),
  company text not null, contact_name text, contact_title text, phone text, email text, website text,
  city text, state text, mc text, industry text, employees int, fit int,
  agent_id uuid references profiles(id),
  status text not null default 'New',
  assigned_on date default current_date,
  account_id uuid references accounts(id)
);
create index if not exists leads_agent on leads(agent_id, status);

create table if not exists prospect_runs (
  id uuid primary key default gen_random_uuid(),
  ran_at timestamptz not null default now(),
  ran_by uuid default auth.uid(),
  pulled int, kept int, detail jsonb
);
create table if not exists dnc_numbers (phone text primary key, added_on date default current_date, source text);

-- ---------- activity, notifications, settings ----------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references accounts(id) on delete cascade,
  dept text not null check (dept in ('Dispatch','Brokerage','Sales')),
  type text not null,
  body text not null,
  by_user uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  to_user uuid not null references profiles(id) on delete cascade,
  body text not null, link text,
  created_at timestamptz not null default now(), read_at timestamptz
);
create table if not exists app_settings (key text primary key, value jsonb not null);
insert into app_settings(key,value) values
 ('vetting', '{"minAuto":750000,"minCargo":100000,"minAgeDays":90,"warnDays":30}'),
 ('quote_followup', '{"days":2,"max":3}')
on conflict do nothing;

-- ---------- website submissions (written only by the server, never by a browser) ----------
create table if not exists intake_submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('Quote Request','Dispatch Signup','Carrier Onboarding')),
  subject text,
  summary text,
  fields jsonb not null default '{}',
  file_paths jsonb not null default '[]',        -- paths inside the private "intake-files" storage bucket
  ip_hash text,
  status text not null default 'New' check (status in ('New','In progress','Done','Spam')),
  handled_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists intake_created on intake_submissions(created_at desc);
create index if not exists intake_ip on intake_submissions(ip_hash, created_at);

-- ---------- audit log: who did what, when. Cannot be changed. ----------
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  actor_label text not null default 'system',
  action text not null,
  table_name text not null,
  record_id text,
  changes jsonb,
  old_row jsonb,
  new_row jsonb
);
create index if not exists audit_at on audit_log(at desc);
create index if not exists audit_actor on audit_log(actor, at desc);

create or replace function audit_row() returns trigger language plpgsql security definer set search_path=public as $$
declare pk text := coalesce(TG_ARGV[0],'id'); oj jsonb; nj jsonb; rid text; ch jsonb; lbl text;
begin
  if TG_OP in ('UPDATE','DELETE') then oj := to_jsonb(OLD); end if;
  if TG_OP in ('INSERT','UPDATE') then nj := to_jsonb(NEW); end if;
  rid := coalesce(nj, oj) ->> pk;
  if TG_OP = 'UPDATE' then
    select jsonb_object_agg(k, jsonb_build_object('from', oj->k, 'to', nj->k)) into ch
      from jsonb_object_keys(nj) k where oj->k is distinct from nj->k;
    if ch is null then return NEW; end if;
  end if;
  select coalesce(full_name || ' (' || role || ')', 'system') into lbl from profiles where id = auth.uid();
  insert into audit_log(actor, actor_label, action, table_name, record_id, changes, old_row, new_row)
    values (auth.uid(), coalesce(lbl,'system'), TG_OP, TG_TABLE_NAME, rid, ch, oj, nj);
  return coalesce(NEW, OLD);
end $$;

create or replace function audit_block() returns trigger language plpgsql as $$
begin raise exception 'The audit log cannot be changed'; end $$;
drop trigger if exists audit_no_change on audit_log;
create trigger audit_no_change before update or delete on audit_log for each row execute function audit_block();
drop trigger if exists audit_no_truncate on audit_log;
create trigger audit_no_truncate before truncate on audit_log for each statement execute function audit_block();

do $$
declare t record;
begin
  for t in select * from (values ('profiles','id'),('accounts','id'),('contacts','id'),('opportunities','id'),('opp_money','opportunity_id'),
      ('loads','id'),('load_money','load_id'),('load_docs','id'),('quotes','id'),('carrier_vetting','account_id'),('leads','id'),
      ('prospect_runs','id'),('app_settings','key'),('intake_submissions','id'),('dnc_numbers','phone')) v(tbl,pk) loop
    execute format('drop trigger if exists audit_%1$s on %1$I', t.tbl);
    execute format('create trigger audit_%1$s after insert or update or delete on %1$I for each row execute function audit_row(%2$L)', t.tbl, t.pk);
  end loop;
end $$;

-- ---------- row level security ----------
do $$
declare t text;
begin
  foreach t in array array['profiles','accounts','contacts','opportunities','opp_money','loads','load_money','load_docs','quotes','carrier_vetting',
    'leads','prospect_runs','dnc_numbers','activities','notifications','app_settings','intake_submissions','audit_log'] loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;
revoke all on all tables in schema public from anon;

-- profiles: everyone on staff can see names; only admin changes people
create policy profiles_read on profiles for select using (is_staff());
create policy profiles_admin on profiles for all using (is_admin()) with check (is_admin());

-- accounts + contacts: the whole company list is visible to staff (so nobody cold-calls another department's customer)
create policy accounts_read on accounts for select using (is_staff());
create policy accounts_add on accounts for insert with check (is_staff());
create policy accounts_edit on accounts for update using (app_role() in ('admin','broker','dispatcher'));
create policy accounts_del on accounts for delete using (is_admin());
create policy contacts_read on contacts for select using (is_staff());
create policy contacts_add on contacts for insert with check (is_staff());
create policy contacts_edit on contacts for update using (app_role() in ('admin','broker','dispatcher'));
create policy contacts_del on contacts for delete using (is_admin());

-- opportunities: admin all; broker/dispatcher their department; sales only what they sourced
create policy opp_read on opportunities for select using (is_admin() or dept = my_dept() or (app_role()='sales' and sourced_by = auth.uid()));
create policy opp_add on opportunities for insert with check (is_admin() or dept = my_dept() or (app_role()='sales' and sourced_by = auth.uid()));
create policy opp_edit on opportunities for update using (is_admin() or dept = my_dept()) with check (is_admin() or dept = my_dept());
create policy opp_del on opportunities for delete using (is_admin());
create policy oppmoney_admin on opp_money for all using (is_admin()) with check (is_admin());

-- loads: admin all; broker/dispatcher their department; sales none
create policy loads_read on loads for select using (is_admin() or dept = my_dept());
create policy loads_add on loads for insert with check (is_admin() or dept = my_dept());
create policy loads_edit on loads for update using (is_admin() or dept = my_dept()) with check (is_admin() or dept = my_dept());
create policy loads_del on loads for delete using (is_admin());
create policy loadmoney_admin on load_money for all using (is_admin()) with check (is_admin());
create policy docs_read on load_docs for select using (exists (select 1 from loads l where l.id = load_id and (is_admin() or l.dept = my_dept())));
create policy docs_add on load_docs for insert with check (exists (select 1 from loads l where l.id = load_id and (is_admin() or l.dept = my_dept())));
create policy docs_edit on load_docs for update using (exists (select 1 from loads l where l.id = load_id and (is_admin() or l.dept = my_dept())));
create policy docs_del on load_docs for delete using (is_admin());

-- invoice and carrier payment status: only admin may move a load to Invoiced / Paid or release payment
create or replace function guard_billing() returns trigger language plpgsql as $$
begin
  if not is_admin() and auth.uid() is not null then
    if new.invoice_status in ('Invoiced','Paid') and new.invoice_status is distinct from old.invoice_status then
      raise exception 'Only an admin can mark a load invoiced or paid'; end if;
    if new.pay_status = 'Released' and new.pay_status is distinct from old.pay_status then
      raise exception 'Only an admin can release carrier payment'; end if;
  end if;
  return new;
end $$;
drop trigger if exists loads_guard_billing on loads;
create trigger loads_guard_billing before update on loads for each row execute function guard_billing();

-- quotes: brokerage (and admin)
create policy quotes_all on quotes for all using (is_admin() or app_role()='broker') with check (is_admin() or app_role()='broker');

-- carrier vetting: admin, brokers, dispatchers
create policy vet_read on carrier_vetting for select using (app_role() in ('admin','broker','dispatcher'));
create policy vet_write on carrier_vetting for insert with check (app_role() in ('admin','broker','dispatcher'));
create policy vet_edit on carrier_vetting for update using (app_role() in ('admin','broker','dispatcher'));

-- leads: sales see their own; admin all
create policy leads_read on leads for select using (is_admin() or (app_role()='sales' and agent_id = auth.uid()));
create policy leads_edit on leads for update using (is_admin() or (app_role()='sales' and agent_id = auth.uid()));
create policy leads_admin on leads for insert with check (is_admin());
create policy leads_del on leads for delete using (is_admin());
create policy runs_admin on prospect_runs for all using (is_admin()) with check (is_admin());
create policy dnc_admin on dnc_numbers for all using (is_admin()) with check (is_admin());

-- activities: by department; sales see their own
create policy act_read on activities for select using (is_admin() or dept = my_dept() or (app_role()='sales' and dept='Sales' and by_user = auth.uid()));
create policy act_add on activities for insert with check (is_admin() or dept = my_dept() or (app_role()='sales' and dept='Sales'));

-- notifications: your own
create policy note_read on notifications for select using (to_user = auth.uid());
create policy note_edit on notifications for update using (to_user = auth.uid());

-- settings: staff read, admin write
create policy set_read on app_settings for select using (is_staff());
create policy set_admin on app_settings for all using (is_admin()) with check (is_admin());

-- website submissions: brokers read quote requests, dispatchers read signups, admin all. Nobody else.
create policy intake_read on intake_submissions for select using (
  is_admin() or (app_role()='broker' and kind in ('Quote Request','Carrier Onboarding')) or (app_role()='dispatcher' and kind in ('Dispatch Signup','Carrier Onboarding')));
create policy intake_edit on intake_submissions for update using (
  is_admin() or (app_role()='broker' and kind in ('Quote Request','Carrier Onboarding')) or (app_role()='dispatcher' and kind in ('Dispatch Signup','Carrier Onboarding')));

-- audit log: admin read only. No insert/update/delete policy exists for anyone.
create policy audit_read on audit_log for select using (is_admin());

-- ---------- hardening (applied after the first run; fixes Supabase security-advisor warnings) ----------
alter function check_invoice_gate() set search_path = public;
alter function audit_block() set search_path = public;
alter function guard_billing() set search_path = public;
revoke execute on function app_role(), is_admin(), is_staff(), my_dept() from public, anon;
grant execute on function app_role(), is_admin(), is_staff(), my_dept() to authenticated;
revoke execute on function audit_row(), audit_block(), check_invoice_gate(), guard_billing() from public, anon, authenticated;
