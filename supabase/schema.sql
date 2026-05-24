-- PODMatch AI production foundation schema
-- Run this in Supabase SQL editor.

create extension if not exists "pgcrypto";

-- =========================
-- ENUMS
-- =========================

do $$ begin
  create type public.organization_role as enum ('owner', 'admin', 'member');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.packet_status as enum ('draft', 'uploaded', 'analyzing', 'ready_to_bill', 'needs_review', 'blocked', 'failed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.document_type as enum (
    'unknown',
    'rate_confirmation',
    'invoice',
    'bol',
    'pod',
    'lumper_receipt',
    'detention_evidence',
    'accessorial_backup',
    'remittance',
    'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.blocker_severity as enum ('low', 'medium', 'high', 'critical');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.subscription_plan as enum ('free', 'starter', 'team', 'appsumo_tier_1', 'appsumo_tier_2', 'appsumo_tier_3');
exception
  when duplicate_object then null;
end $$;

-- =========================
-- PROFILES
-- =========================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  company_name text,
  phone text,
  avatar_url text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
on public.profiles for select
using (auth.uid() = id);

create policy "Users can update own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can insert own profile"
on public.profiles for insert
with check (auth.uid() = id);

-- =========================
-- ORGANIZATIONS
-- =========================

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_email text,
  plan public.subscription_plan not null default 'free',
  monthly_packet_limit integer not null default 10,
  packets_used_this_month integer not null default 0,
  billing_period_start date not null default current_date,
  stripe_customer_id text,
  stripe_subscription_id text,
  appsumo_code text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- =========================
-- ORGANIZATION MEMBERS
-- =========================

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organization_members enable row level security;

create policy "Members can view their organizations"
on public.organizations for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = organizations.id
    and om.user_id = auth.uid()
  )
);

create policy "Users can view their own memberships"
on public.organization_members for select
using (user_id = auth.uid());
-- =========================
-- SHIPMENT PACKETS
-- =========================

create table if not exists public.shipment_packets (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,

  load_number text,
  broker_name text,
  customer_name text,
  carrier_name text,
  pickup_date date,
  delivery_date date,
  origin text,
  destination text,

  invoice_total numeric(12,2),
  rate_confirmation_total numeric(12,2),
  accessorial_total numeric(12,2),

  status public.packet_status not null default 'draft',
  readiness_score integer,
  payment_delay_risk public.blocker_severity,
  revenue_at_risk numeric(12,2) default 0,

  notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shipment_packets enable row level security;

create policy "Members can view shipment packets"
on public.shipment_packets for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = shipment_packets.organization_id
    and om.user_id = auth.uid()
  )
);

create policy "Members can insert shipment packets"
on public.shipment_packets for insert
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = shipment_packets.organization_id
    and om.user_id = auth.uid()
  )
);

create policy "Members can update shipment packets"
on public.shipment_packets for update
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = shipment_packets.organization_id
    and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = shipment_packets.organization_id
    and om.user_id = auth.uid()
  )
);

-- =========================
-- SHIPMENT DOCUMENTS
-- =========================

create table if not exists public.shipment_documents (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.shipment_packets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  file_name text not null,
  file_path text not null,
  file_size integer,
  mime_type text,
  document_type public.document_type not null default 'unknown',

  extracted_text text,
  extracted_fields jsonb not null default '{}'::jsonb,
  confidence numeric(5,2),

  created_at timestamptz not null default now()
);

alter table public.shipment_documents enable row level security;

create policy "Members can view shipment documents"
on public.shipment_documents for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = shipment_documents.organization_id
    and om.user_id = auth.uid()
  )
);

create policy "Members can insert shipment documents"
on public.shipment_documents for insert
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = shipment_documents.organization_id
    and om.user_id = auth.uid()
  )
);

-- =========================
-- ANALYSIS REPORTS
-- =========================

create table if not exists public.analysis_reports (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null references public.shipment_packets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  readiness_score integer not null,
  status public.packet_status not null,
  payment_delay_risk public.blocker_severity not null,
  summary text not null,
  fix_recommendations jsonb not null default '[]'::jsonb,
  extracted_values jsonb not null default '{}'::jsonb,
  model_name text,
  model_output jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now()
);

alter table public.analysis_reports enable row level security;

create policy "Members can view analysis reports"
on public.analysis_reports for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = analysis_reports.organization_id
    and om.user_id = auth.uid()
  )
);

create policy "Members can insert analysis reports"
on public.analysis_reports for insert
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = analysis_reports.organization_id
    and om.user_id = auth.uid()
  )
);

-- =========================
-- BILLING BLOCKERS
-- =========================

create table if not exists public.billing_blockers (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.analysis_reports(id) on delete cascade,
  packet_id uuid not null references public.shipment_packets(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,

  severity public.blocker_severity not null,
  title text not null,
  description text not null,
  recommended_fix text not null,
  amount_at_risk numeric(12,2) default 0,
  related_document_id uuid references public.shipment_documents(id) on delete set null,

  resolved boolean not null default false,
  resolved_at timestamptz,

  created_at timestamptz not null default now()
);

alter table public.billing_blockers enable row level security;

create policy "Members can view billing blockers"
on public.billing_blockers for select
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = billing_blockers.organization_id
    and om.user_id = auth.uid()
  )
);

create policy "Members can insert billing blockers"
on public.billing_blockers for insert
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = billing_blockers.organization_id
    and om.user_id = auth.uid()
  )
);

create policy "Members can update billing blockers"
on public.billing_blockers for update
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = billing_blockers.organization_id
    and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = billing_blockers.organization_id
    and om.user_id = auth.uid()
  )
);

-- =========================
-- BROKER RULE PROFILES
-- =========================

create table if not exists public.broker_rule_profiles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  broker_name text not null,
  required_documents public.document_type[] not null default array['rate_confirmation','invoice','pod']::public.document_type[],
  rules jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, broker_name)
);

alter table public.broker_rule_profiles enable row level security;

create policy "Members can manage broker rule profiles"
on public.broker_rule_profiles for all
using (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = broker_rule_profiles.organization_id
    and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.organization_members om
    where om.organization_id = broker_rule_profiles.organization_id
    and om.user_id = auth.uid()
  )
);

-- =========================
-- APPSUMO CODES
-- =========================

create table if not exists public.appsumo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  plan public.subscription_plan not null,
  monthly_packet_limit integer not null,
  redeemed_by uuid references auth.users(id) on delete set null,
  redeemed_organization_id uuid references public.organizations(id) on delete set null,
  redeemed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.appsumo_codes enable row level security;

create policy "Users can view unredeemed matching appsumo code"
on public.appsumo_codes for select
using (redeemed_by is null);

-- =========================
-- UPDATED_AT TRIGGER
-- =========================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_organizations_updated_at on public.organizations;
create trigger set_organizations_updated_at
before update on public.organizations
for each row execute function public.set_updated_at();

drop trigger if exists set_shipment_packets_updated_at on public.shipment_packets;
create trigger set_shipment_packets_updated_at
before update on public.shipment_packets
for each row execute function public.set_updated_at();

drop trigger if exists set_broker_rule_profiles_updated_at on public.broker_rule_profiles;
create trigger set_broker_rule_profiles_updated_at
before update on public.broker_rule_profiles
for each row execute function public.set_updated_at();

-- =========================
-- NEW USER BOOTSTRAP
-- =========================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  company text;
begin
  company := coalesce(new.raw_user_meta_data->>'company_name', new.raw_user_meta_data->>'full_name', 'My Company');

  insert into public.profiles (id, full_name, company_name)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    company
  );

  insert into public.organizations (name, billing_email, created_by)
  values (company, new.email, new.id)
  returning id into org_id;

  insert into public.organization_members (organization_id, user_id, role)
  values (org_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- =========================
-- STORAGE
-- =========================

insert into storage.buckets (id, name, public)
values ('shipment-documents', 'shipment-documents', false)
on conflict (id) do nothing;

create policy "Members can upload shipment documents"
on storage.objects for insert
with check (
  bucket_id = 'shipment-documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
    and om.organization_id::text = split_part(name, '/', 1)
  )
);

create policy "Members can view shipment documents"
on storage.objects for select
using (
  bucket_id = 'shipment-documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
    and om.organization_id::text = split_part(name, '/', 1)
  )
);

create policy "Members can delete shipment documents"
on storage.objects for delete
using (
  bucket_id = 'shipment-documents'
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
    and om.organization_id::text = split_part(name, '/', 1)
  )
);