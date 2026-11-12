create table if not exists public.order_customer_artifacts (
  id uuid primary key default gen_random_uuid(),
  public_artifact_ref text not null unique default (
    'ART-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  order_id uuid not null references public.orders(id) on delete cascade,
  category text not null check (category in (
    'design_preview',
    'revised_design',
    'approval_document',
    'verification_image',
    'verification_video',
    'final_document'
  )),
  display_name text not null check (char_length(display_name) between 1 and 180 and display_name !~ '[\\/]'),
  description text check (description is null or char_length(description) <= 1000),
  version_label text check (version_label is null or char_length(version_label) <= 80),
  revision integer not null check (revision >= 1),
  storage_bucket text not null default 'customer-order-artifacts' check (storage_bucket = 'customer-order-artifacts'),
  storage_path text not null unique,
  mime_type text not null check (mime_type in (
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm'
  )),
  size_bytes bigint not null check (size_bytes > 0 and size_bytes <= 52428800),
  customer_visible boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id, category, revision),
  check (public_artifact_ref ~ '^ART-[0-9]{4}-[A-Z0-9]{8}$'),
  check (
    (category = 'verification_image' and mime_type in ('image/jpeg','image/png','image/webp'))
    or (category = 'verification_video' and mime_type in ('video/mp4','video/webm'))
    or (category in ('design_preview','revised_design','approval_document','final_document') and mime_type in ('application/pdf','image/jpeg','image/png','image/webp'))
  )
);

create table if not exists public.order_approval_requests (
  id uuid primary key default gen_random_uuid(),
  public_approval_ref text not null unique default (
    'APR-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  order_id uuid not null references public.orders(id) on delete cascade,
  artifact_id uuid not null references public.order_customer_artifacts(id) on delete restrict,
  target_revision integer not null check (target_revision >= 1),
  status text not null default 'PENDING' check (status in ('PENDING','APPROVED','REVISION_REQUESTED')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  check (public_approval_ref ~ '^APR-[0-9]{4}-[A-Z0-9]{8}$'),
  unique (artifact_id)
);

create table if not exists public.order_approval_actions (
  id bigint generated always as identity primary key,
  approval_request_id uuid not null unique references public.order_approval_requests(id) on delete restrict,
  artifact_id uuid not null references public.order_customer_artifacts(id) on delete restrict,
  artifact_revision integer not null check (artifact_revision >= 1),
  customer_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (action in ('APPROVED','REVISION_REQUESTED')),
  customer_message text check (customer_message is null or char_length(customer_message) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists order_customer_artifacts_order_created_idx
  on public.order_customer_artifacts(order_id, created_at desc);
create index if not exists order_customer_artifacts_order_category_revision_idx
  on public.order_customer_artifacts(order_id, category, revision desc)
  where customer_visible;
create index if not exists order_approval_requests_order_status_idx
  on public.order_approval_requests(order_id, status, requested_at desc);
create index if not exists order_approval_actions_customer_created_idx
  on public.order_approval_actions(customer_id, created_at desc);

create or replace function public.set_order_customer_artifact_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_order_customer_artifact_updated_at() from public, anon, authenticated;

drop trigger if exists order_customer_artifacts_updated_at on public.order_customer_artifacts;
create trigger order_customer_artifacts_updated_at
before update on public.order_customer_artifacts
for each row execute function public.set_order_customer_artifact_updated_at();

alter table public.order_customer_artifacts enable row level security;
alter table public.order_customer_artifacts force row level security;
alter table public.order_approval_requests enable row level security;
alter table public.order_approval_requests force row level security;
alter table public.order_approval_actions enable row level security;
alter table public.order_approval_actions force row level security;

revoke all on table
  public.order_customer_artifacts,
  public.order_approval_requests,
  public.order_approval_actions
from anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'customer-order-artifacts',
  'customer-order-artifacts',
  false,
  52428800,
  array['application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/webm']
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.submit_customer_artifact_approval_server(
  p_customer_id uuid,
  p_order_reference text,
  p_approval_reference text,
  p_action text,
  p_message text
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_request record;
  v_new_status text;
  v_message text := nullif(btrim(coalesce(p_message, '')), '');
begin
  if p_action not in ('APPROVED','REVISION_REQUESTED') then
    raise exception 'APPROVAL_ACTION_INVALID';
  end if;

  if p_action = 'REVISION_REQUESTED' and (v_message is null or char_length(v_message) < 3 or char_length(v_message) > 1000) then
    raise exception 'REVISION_MESSAGE_INVALID';
  end if;

  select
    request.id as approval_id,
    request.status as approval_status,
    request.target_revision,
    artifact.id as artifact_id,
    artifact.revision as artifact_revision,
    artifact.category as artifact_category,
    artifact.customer_visible,
    artifact.order_id
  into v_request
  from public.order_approval_requests request
  join public.order_customer_artifacts artifact on artifact.id = request.artifact_id
  join public.orders customer_order on customer_order.id = request.order_id
  where request.public_approval_ref = p_approval_reference
    and customer_order.public_order_id = p_order_reference
    and customer_order.customer_id = p_customer_id
    and artifact.order_id = customer_order.id
  for update of request;

  if not found then
    raise exception 'APPROVAL_UNAVAILABLE';
  end if;

  v_new_status := p_action;

  if v_request.approval_status = v_new_status then
    return jsonb_build_object(
      'approvalReference', p_approval_reference,
      'status', v_new_status,
      'replayed', true
    );
  end if;

  if v_request.approval_status <> 'PENDING' then
    raise exception 'APPROVAL_ALREADY_RESOLVED';
  end if;

  if not v_request.customer_visible or v_request.target_revision <> v_request.artifact_revision then
    raise exception 'APPROVAL_STALE';
  end if;

  if exists (
    select 1
    from public.order_customer_artifacts newer
    where newer.order_id = v_request.order_id
      and newer.category = v_request.artifact_category
      and newer.customer_visible
      and newer.revision > v_request.artifact_revision
  ) then
    raise exception 'APPROVAL_STALE';
  end if;

  update public.order_approval_requests
  set status = v_new_status,
      resolved_at = now()
  where id = v_request.approval_id;

  insert into public.order_approval_actions (
    approval_request_id,
    artifact_id,
    artifact_revision,
    customer_id,
    action,
    customer_message
  ) values (
    v_request.approval_id,
    v_request.artifact_id,
    v_request.artifact_revision,
    p_customer_id,
    v_new_status,
    case when v_new_status = 'REVISION_REQUESTED' then v_message else null end
  )
  on conflict (approval_request_id) do nothing;

  return jsonb_build_object(
    'approvalReference', p_approval_reference,
    'status', v_new_status,
    'replayed', false
  );
end;
$$;

revoke all on function public.submit_customer_artifact_approval_server(uuid,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_customer_artifact_approval_server(uuid,text,text,text,text) to service_role;
