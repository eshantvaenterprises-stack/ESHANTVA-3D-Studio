-- ESHANTVA Page 5: private bulk-enquiry, line-item, file, event and quote foundations.

create table if not exists public.bulk_requests (
  id uuid primary key default gen_random_uuid(), public_request_id text unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT','SUBMITTED','UNDER_REVIEW','MORE_INFORMATION_REQUIRED','QUOTATION_PREPARATION','QUOTATION_SENT','AWAITING_CUSTOMER_APPROVAL','ACCEPTED','REJECTED','CANCELLED','CONVERTED_TO_ORDER')),
  bulk_type text check (bulk_type is null or bulk_type in ('existing_product','customized_product','custom_requirement')),
  organization_type text, organization_name text, contact_person text, role_designation text,
  email text, phone text, preferred_language text, po_reference text,
  repeat_type text check (repeat_type is null or repeat_type in ('one_time','repeat','not_sure')),
  repeat_frequency text, quantity_per_cycle integer check (quantity_per_cycle is null or quantity_per_cycle between 1 and 1000000), repeat_notes text,
  requirement_title text, requirement_description text, intended_use text, dimensions text,
  material_preference text, color_preference text, target_date date,
  delivery_method text check (delivery_method is null or delivery_method in ('shipping','local_pickup','local_delivery')),
  postal_code text, city text, state text, target_budget numeric(14,2), target_unit_price numeric(14,2),
  verification_requested boolean not null default false, customer_notes text,
  accuracy_consent_at timestamptz, file_consent_at timestamptz, submitted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (public_request_id is null or public_request_id ~ '^BR-[0-9]{4}-[A-Z0-9]{6}$'),
  check (char_length(coalesce(requirement_description,'')) <= 3000),
  check (char_length(coalesce(customer_notes,'')) <= 3000)
);

create table if not exists public.bulk_request_items (
  id uuid primary key default gen_random_uuid(), bulk_request_id uuid not null references public.bulk_requests(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete restrict,
  product_id text, product_slug text, item_type text not null check (item_type in ('CATALOG','CUSTOM')),
  description text, quantity integer not null check (quantity between 1 and 1000000),
  configuration jsonb not null default '{}'::jsonb check (jsonb_typeof(configuration) = 'object'),
  same_customization_for_all boolean, customization_notes text, notes text, created_at timestamptz not null default now()
);

create table if not exists public.bulk_request_files (
  id uuid primary key, bulk_request_id uuid not null references public.bulk_requests(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete restrict,
  storage_bucket text not null default 'bulk-request-files', storage_path text not null unique,
  original_filename text not null, file_extension text not null, mime_type text not null,
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  check (file_extension <> '.csv' or size_bytes <= 5242880),
  file_role text not null default 'OTHER' check (file_role in ('3D_MODEL','DRAWING','REFERENCE','LOGO','PERSONALIZATION_LIST','SPECIFICATION','OTHER')),
  upload_status text not null default 'PREPARED' check (upload_status in ('PREPARED','READY','REJECTED')),
  signature_status text not null default 'PENDING' check (signature_status in ('PENDING','VALIDATED','UNVERIFIED_ALLOWED','REJECTED')),
  scan_status text not null default 'NOT_CONFIGURED' check (scan_status in ('NOT_CONFIGURED','PENDING','CLEAN','QUARANTINED')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.bulk_request_events (
  id bigint generated always as identity primary key, bulk_request_id uuid not null references public.bulk_requests(id) on delete cascade,
  event_type text not null, from_status text, to_status text, public_message text, actor_hash text,
  internal_metadata jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);

create table if not exists public.bulk_quotations (
  id uuid primary key default gen_random_uuid(), bulk_request_id uuid not null references public.bulk_requests(id) on delete restrict,
  version integer not null check (version >= 1), status text not null default 'DRAFT' check (status in ('DRAFT','SENT','SUPERSEDED','ACCEPTED','DECLINED')),
  commercial_snapshot jsonb not null default '{}'::jsonb, sent_at timestamptz, accepted_at timestamptz,
  created_at timestamptz not null default now(), unique (bulk_request_id, version)
);

create index if not exists bulk_requests_customer_created_idx on public.bulk_requests(customer_id, created_at desc);
create index if not exists bulk_requests_status_created_idx on public.bulk_requests(status, created_at desc);
create index if not exists bulk_items_request_idx on public.bulk_request_items(bulk_request_id);
create index if not exists bulk_files_request_idx on public.bulk_request_files(bulk_request_id);
create index if not exists bulk_events_request_created_idx on public.bulk_request_events(bulk_request_id, created_at desc);
create index if not exists bulk_events_rate_idx on public.bulk_request_events(actor_hash, created_at desc) where event_type = 'SUBMISSION_ATTEMPT';

create or replace function public.set_bulk_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.set_bulk_updated_at() from public, anon, authenticated;
drop trigger if exists bulk_requests_updated_at on public.bulk_requests;
create trigger bulk_requests_updated_at before update on public.bulk_requests for each row execute function public.set_bulk_updated_at();
drop trigger if exists bulk_files_updated_at on public.bulk_request_files;
create trigger bulk_files_updated_at before update on public.bulk_request_files for each row execute function public.set_bulk_updated_at();

alter table public.bulk_requests enable row level security; alter table public.bulk_requests force row level security;
alter table public.bulk_request_items enable row level security; alter table public.bulk_request_items force row level security;
alter table public.bulk_request_files enable row level security; alter table public.bulk_request_files force row level security;
alter table public.bulk_request_events enable row level security; alter table public.bulk_request_events force row level security;
alter table public.bulk_quotations enable row level security; alter table public.bulk_quotations force row level security;

drop policy if exists bulk_requests_owner_read on public.bulk_requests;
create policy bulk_requests_owner_read on public.bulk_requests for select to authenticated using ((select auth.uid()) = customer_id);
drop policy if exists bulk_items_owner_read on public.bulk_request_items;
create policy bulk_items_owner_read on public.bulk_request_items for select to authenticated using ((select auth.uid()) = customer_id);
drop policy if exists bulk_files_owner_read on public.bulk_request_files;
create policy bulk_files_owner_read on public.bulk_request_files for select to authenticated using ((select auth.uid()) = customer_id);
-- Events and quotations have no direct customer policy yet; expose approved public projections through a future server endpoint.
-- All customer writes are mediated by the Edge Function. No direct write policy exists.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values (
  'bulk-request-files','bulk-request-files',false,52428800,
  array['model/stl','application/sla','application/vnd.ms-pki.stl','model/3mf','application/vnd.ms-package.3dmanufacturing-3dmodel+xml','model/obj','text/plain','application/step','model/step','model/gltf-binary','model/gltf+json','application/json','application/pdf','image/jpeg','image/png','application/octet-stream','text/csv','application/csv']
) on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
drop policy if exists bulk_storage_owner_insert on storage.objects;
create policy bulk_storage_owner_insert on storage.objects for insert to authenticated with check (bucket_id='bulk-request-files' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists bulk_storage_owner_read on storage.objects;
create policy bulk_storage_owner_read on storage.objects for select to authenticated using (bucket_id='bulk-request-files' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.submit_bulk_request_server(p_request_id uuid,p_customer_id uuid,p_public_request_id text,p_submission jsonb,p_file_ids uuid[])
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare v_now timestamptz:=now(); v_owned integer; v_total bigint;
begin
  if not exists(select 1 from public.bulk_requests where id=p_request_id and customer_id=p_customer_id and status='DRAFT') then raise exception 'Owned draft was not found'; end if;
  select count(*),coalesce(sum(size_bytes),0) into v_owned,v_total from public.bulk_request_files where bulk_request_id=p_request_id and customer_id=p_customer_id and upload_status='READY' and id=any(coalesce(p_file_ids,array[]::uuid[]));
  if v_owned<>cardinality(coalesce(p_file_ids,array[]::uuid[])) or v_total>157286400 then raise exception 'Attached files are not ready or exceed limits'; end if;
  update public.bulk_requests set public_request_id=p_public_request_id,status='SUBMITTED',bulk_type=p_submission->>'bulkType',organization_type=p_submission->>'organizationType',organization_name=nullif(p_submission->>'organizationName',''),contact_person=p_submission->>'contactPerson',role_designation=nullif(p_submission->>'role',''),email=lower(p_submission->>'email'),phone=nullif(p_submission->>'phone',''),preferred_language=p_submission->>'preferredLanguage',po_reference=nullif(p_submission->>'poReference',''),repeat_type=p_submission->>'repeatType',repeat_frequency=nullif(p_submission->>'repeatFrequency',''),quantity_per_cycle=nullif(p_submission->>'quantityPerCycle','')::integer,repeat_notes=nullif(p_submission->>'repeatNotes',''),requirement_title=nullif(p_submission->>'requirementTitle',''),requirement_description=nullif(p_submission->>'requirementDescription',''),intended_use=nullif(p_submission->>'intendedUse',''),dimensions=nullif(p_submission->>'dimensions',''),material_preference=nullif(p_submission->>'materialPreference',''),color_preference=nullif(p_submission->>'colorPreference',''),target_date=nullif(p_submission->>'targetDate','')::date,delivery_method=p_submission->>'deliveryMethod',postal_code=nullif(p_submission->>'postalCode',''),city=nullif(p_submission->>'city',''),state=nullif(p_submission->>'state',''),target_budget=nullif(p_submission->>'targetBudget','')::numeric,target_unit_price=nullif(p_submission->>'targetUnitPrice','')::numeric,verification_requested=coalesce((p_submission->>'verificationRequested')::boolean,false),customer_notes=nullif(p_submission->>'customerNotes',''),accuracy_consent_at=v_now,file_consent_at=case when cardinality(coalesce(p_file_ids,array[]::uuid[]))>0 then v_now else null end,submitted_at=v_now where id=p_request_id;
  delete from public.bulk_request_items where bulk_request_id=p_request_id;
  insert into public.bulk_request_items(bulk_request_id,customer_id,product_id,product_slug,item_type,description,quantity,configuration,same_customization_for_all,customization_notes,notes)
  select p_request_id,p_customer_id,nullif(item->>'productId',''),nullif(item->>'productSlug',''),upper(item->>'itemType'),nullif(item->>'description',''),(item->>'quantity')::integer,coalesce(item->'configuration','{}'::jsonb),nullif(item->>'sameCustomizationForAll','')::boolean,nullif(item->>'customizationNotes',''),nullif(item->>'notes','') from jsonb_array_elements(p_submission->'items') item;
  insert into public.bulk_request_events(bulk_request_id,event_type,public_message,internal_metadata)
  select p_request_id,'PRODUCT_ADDED','A product or custom item was added to the submitted enquiry.',jsonb_build_object('product_slug',nullif(item->>'productSlug',''),'item_type',item->>'itemType')
  from jsonb_array_elements(p_submission->'items') item;
  insert into public.bulk_request_events(bulk_request_id,event_type,from_status,to_status,public_message) values(p_request_id,'BULK_ENQUIRY_SUBMITTED','DRAFT','SUBMITTED','Bulk enquiry submitted for review.');
  return v_now;
end; $$;
revoke all on function public.submit_bulk_request_server(uuid,uuid,text,jsonb,uuid[]) from public,anon,authenticated;
grant execute on function public.submit_bulk_request_server(uuid,uuid,text,jsonb,uuid[]) to service_role;
