-- ESHANTVA Page 4: secure custom-request foundation.
-- Timestamps are timestamptz and stored in UTC by PostgreSQL.

create table if not exists public.custom_requests (
  id uuid primary key default gen_random_uuid(),
  public_request_id text unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','QUOTED','ACCEPTED','DECLINED','CANCELLED','CONVERTED_TO_ORDER')),
  request_type text check (request_type is null or request_type in ('3d_file','drawing_dimensions','image_reference','modify_design','custom_product','replacement_part','other')),
  title text,
  description text,
  intended_use text,
  quantity integer check (quantity is null or quantity between 1 and 100000),
  target_date date,
  delivery_method text check (delivery_method is null or delivery_method in ('shipping','local_pickup','local_delivery')),
  delivery_pin_code text,
  delivery_city text,
  delivery_state text,
  verification_requested boolean not null default false,
  customer_notes text,
  customer_name text,
  customer_email text,
  customer_phone text,
  communication_method text check (communication_method is null or communication_method in ('email','phone')),
  preferred_language text check (preferred_language is null or preferred_language in ('english','hindi','assamese')),
  source_product_slug text,
  policy_consent_at timestamptz,
  accuracy_consent_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (public_request_id is null or public_request_id ~ '^CR-[0-9]{4}-[A-Z0-9]{6}$'),
  check (char_length(coalesce(title, '')) <= 120),
  check (char_length(coalesce(description, '')) <= 3000),
  check (char_length(coalesce(customer_notes, '')) <= 3000)
);

create table if not exists public.custom_request_specifications (
  request_id uuid primary key references public.custom_requests(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete restrict,
  length_mm numeric(14,3),
  width_mm numeric(14,3),
  height_mm numeric(14,3),
  provided_unit text not null default 'mm' check (provided_unit in ('mm','cm','in')),
  material_preference text,
  color_preference text,
  color_details text,
  personalization jsonb not null default '{}'::jsonb check (jsonb_typeof(personalization) = 'object'),
  functional_details jsonb not null default '{}'::jsonb check (jsonb_typeof(functional_details) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_request_files (
  id uuid primary key,
  request_id uuid not null references public.custom_requests(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete restrict,
  storage_bucket text not null default 'custom-request-files',
  storage_path text not null unique,
  original_filename text not null,
  file_extension text not null,
  mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  upload_status text not null default 'PREPARED' check (upload_status in ('PREPARED','READY','REJECTED')),
  signature_status text not null default 'PENDING' check (signature_status in ('PENDING','VALIDATED','UNVERIFIED_ALLOWED','REJECTED')),
  scan_status text not null default 'NOT_CONFIGURED' check (scan_status in ('NOT_CONFIGURED','PENDING','CLEAN','QUARANTINED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.custom_request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.custom_requests(id) on delete cascade,
  event_type text not null,
  from_status text,
  to_status text,
  public_message text,
  actor_hash text,
  internal_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_request_messages (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.custom_requests(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete restrict,
  sender_type text not null check (sender_type in ('CUSTOMER','STUDIO','SYSTEM')),
  body text not null check (char_length(body) between 1 and 5000),
  visible_to_customer boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists custom_requests_customer_created_idx on public.custom_requests (customer_id, created_at desc);
create index if not exists custom_requests_status_created_idx on public.custom_requests (status, created_at desc);
create index if not exists custom_requests_created_at_idx on public.custom_requests (created_at desc);
create index if not exists custom_requests_request_type_idx on public.custom_requests (request_type) where request_type is not null;
create index if not exists custom_request_files_request_idx on public.custom_request_files (request_id);
create index if not exists custom_request_files_customer_idx on public.custom_request_files (customer_id);
create index if not exists custom_request_events_request_created_idx on public.custom_request_events (request_id, created_at desc);
create index if not exists custom_request_events_rate_limit_idx on public.custom_request_events (actor_hash, created_at desc) where event_type = 'SUBMISSION_ATTEMPT';
create index if not exists custom_request_messages_request_created_idx on public.custom_request_messages (request_id, created_at);

create or replace function public.set_custom_request_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists custom_requests_updated_at on public.custom_requests;
create trigger custom_requests_updated_at before update on public.custom_requests for each row execute function public.set_custom_request_updated_at();
drop trigger if exists custom_request_specifications_updated_at on public.custom_request_specifications;
create trigger custom_request_specifications_updated_at before update on public.custom_request_specifications for each row execute function public.set_custom_request_updated_at();
drop trigger if exists custom_request_files_updated_at on public.custom_request_files;
create trigger custom_request_files_updated_at before update on public.custom_request_files for each row execute function public.set_custom_request_updated_at();

alter table public.custom_requests enable row level security;
alter table public.custom_requests force row level security;
alter table public.custom_request_specifications enable row level security;
alter table public.custom_request_specifications force row level security;
alter table public.custom_request_files enable row level security;
alter table public.custom_request_files force row level security;
alter table public.custom_request_events enable row level security;
alter table public.custom_request_events force row level security;
alter table public.custom_request_messages enable row level security;
alter table public.custom_request_messages force row level security;

drop policy if exists custom_requests_owner_read on public.custom_requests;
create policy custom_requests_owner_read on public.custom_requests for select to authenticated using ((select auth.uid()) = customer_id);
drop policy if exists custom_request_specifications_owner_read on public.custom_request_specifications;
create policy custom_request_specifications_owner_read on public.custom_request_specifications for select to authenticated using ((select auth.uid()) = customer_id);
drop policy if exists custom_request_files_owner_read on public.custom_request_files;
create policy custom_request_files_owner_read on public.custom_request_files for select to authenticated using ((select auth.uid()) = customer_id);
drop policy if exists custom_request_messages_owner_read on public.custom_request_messages;
create policy custom_request_messages_owner_read on public.custom_request_messages for select to authenticated using ((select auth.uid()) = customer_id and visible_to_customer);

-- Customer writes are mediated by the Edge Function. No direct insert/update/delete
-- policies exist on request tables. The secret/service role stays server-side.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'custom-request-files', 'custom-request-files', false, 52428800,
  array['model/stl','application/sla','application/vnd.ms-pki.stl','model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml','model/obj','text/plain','application/step','model/step','model/gltf-binary','model/gltf+json','application/json','application/pdf','image/jpeg','image/png','application/octet-stream']
)
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists custom_request_storage_owner_insert on storage.objects;
create policy custom_request_storage_owner_insert on storage.objects for insert to authenticated
with check (bucket_id = 'custom-request-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists custom_request_storage_owner_read on storage.objects;
create policy custom_request_storage_owner_read on storage.objects for select to authenticated
using (bucket_id = 'custom-request-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Atomic final submission. Only the server role may call this function.
create or replace function public.submit_custom_request_server(
  p_request_id uuid,
  p_customer_id uuid,
  p_public_request_id text,
  p_submission jsonb,
  p_file_ids uuid[]
) returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_owned_ready_files integer;
  v_total_bytes bigint;
begin
  if not exists (select 1 from public.custom_requests where id = p_request_id and customer_id = p_customer_id and status = 'DRAFT') then
    raise exception 'Draft request not found or not owned by caller';
  end if;

  select count(*), coalesce(sum(size_bytes), 0) into v_owned_ready_files, v_total_bytes
  from public.custom_request_files
  where request_id = p_request_id and customer_id = p_customer_id and upload_status = 'READY' and id = any(coalesce(p_file_ids, array[]::uuid[]));
  if v_owned_ready_files <> cardinality(coalesce(p_file_ids, array[]::uuid[])) or v_total_bytes > 157286400 then
    raise exception 'Attached files are not ready or exceed the total limit';
  end if;

  update public.custom_requests set
    public_request_id = p_public_request_id,
    status = 'SUBMITTED',
    request_type = p_submission->>'requestType',
    title = p_submission->>'title',
    description = p_submission->>'description',
    intended_use = p_submission->>'intendedUse',
    quantity = (p_submission->>'quantity')::integer,
    target_date = nullif(p_submission->>'targetDate', '')::date,
    delivery_method = p_submission->>'deliveryMethod',
    delivery_pin_code = nullif(p_submission->>'pinCode', ''),
    delivery_city = nullif(p_submission->>'city', ''),
    delivery_state = nullif(p_submission->>'state', ''),
    verification_requested = coalesce((p_submission->>'verificationRequested')::boolean, false),
    customer_notes = nullif(p_submission->>'notes', ''),
    customer_name = p_submission->>'customerName',
    customer_email = lower(p_submission->>'customerEmail'),
    customer_phone = nullif(p_submission->>'customerPhone', ''),
    communication_method = p_submission->>'communicationMethod',
    preferred_language = p_submission->>'language',
    source_product_slug = nullif(p_submission->>'sourceProductSlug', ''),
    policy_consent_at = v_now,
    accuracy_consent_at = v_now,
    submitted_at = v_now
  where id = p_request_id;

  insert into public.custom_request_specifications (
    request_id, customer_id, length_mm, width_mm, height_mm, provided_unit,
    material_preference, color_preference, color_details, personalization, functional_details
  ) values (
    p_request_id, p_customer_id,
    nullif(p_submission->>'lengthMm', '')::numeric,
    nullif(p_submission->>'widthMm', '')::numeric,
    nullif(p_submission->>'heightMm', '')::numeric,
    p_submission->>'dimensionUnit', p_submission->>'material', p_submission->>'colorPreference',
    nullif(p_submission->>'colorDetails', ''),
    jsonb_build_object('type', p_submission->>'personalizationType', 'text', p_submission->>'personalizationText'),
    coalesce(p_submission->'functionalDetails', '{}'::jsonb)
  ) on conflict (request_id) do update set
    length_mm = excluded.length_mm, width_mm = excluded.width_mm, height_mm = excluded.height_mm,
    provided_unit = excluded.provided_unit, material_preference = excluded.material_preference,
    color_preference = excluded.color_preference, color_details = excluded.color_details,
    personalization = excluded.personalization, functional_details = excluded.functional_details;

  insert into public.custom_request_events (request_id, event_type, from_status, to_status, public_message)
  values (p_request_id, 'STATUS_CHANGED', 'DRAFT', 'SUBMITTED', 'Request submitted for review.');
  return v_now;
end;
$$;

revoke all on function public.submit_custom_request_server(uuid, uuid, text, jsonb, uuid[]) from public, anon, authenticated;
grant execute on function public.submit_custom_request_server(uuid, uuid, text, jsonb, uuid[]) to service_role;
