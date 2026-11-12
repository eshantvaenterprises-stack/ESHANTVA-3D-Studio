create table if not exists public.admin_artifact_uploads (
  id uuid primary key default gen_random_uuid(),
  public_upload_ref text not null unique default ('UPL-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  request_id uuid not null unique,
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  role_snapshot text not null check (role_snapshot='ADMIN'),
  order_id uuid not null references public.orders(id) on delete restrict,
  public_order_reference text not null check (public_order_reference ~ '^ESHA-[0-9]{4}-[A-Z0-9]{8}$'),
  category text not null check (category in ('design_preview','revised_design','approval_document','verification_image','verification_video','final_document')),
  display_name text not null check (char_length(display_name) between 1 and 180 and display_name !~ '[\\/]'),
  description text check (description is null or char_length(description)<=1000),
  version_label text check (version_label is null or char_length(version_label)<=80),
  expected_mime_type text not null check (expected_mime_type in ('application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/webm')),
  expected_size_bytes bigint not null check (expected_size_bytes>0 and expected_size_bytes<=52428800),
  storage_bucket text not null default 'customer-order-artifacts' check (storage_bucket='customer-order-artifacts'),
  storage_path text not null unique,
  status text not null default 'PREPARED' check (status in ('PREPARED','UPLOADED','PUBLISHED')),
  artifact_id uuid unique references public.order_customer_artifacts(id) on delete restrict,
  uploaded_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((category='verification_image' and expected_mime_type in ('image/jpeg','image/png','image/webp')) or (category='verification_video' and expected_mime_type in ('video/mp4','video/webm')) or (category in ('design_preview','revised_design','approval_document','final_document') and expected_mime_type in ('application/pdf','image/jpeg','image/png','image/webp')))
);

create table if not exists public.admin_artifact_action_events (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  role_snapshot text not null check (role_snapshot='ADMIN'),
  order_id uuid not null references public.orders(id) on delete restrict,
  public_order_reference text not null check (public_order_reference ~ '^ESHA-[0-9]{4}-[A-Z0-9]{8}$'),
  upload_intent_id uuid references public.admin_artifact_uploads(id) on delete restrict,
  artifact_id uuid references public.order_customer_artifacts(id) on delete restrict,
  approval_request_id uuid references public.order_approval_requests(id) on delete restrict,
  action text not null check (action in ('ARTIFACT_UPLOAD_PREPARED','ARTIFACT_UPLOAD_COMPLETED','ARTIFACT_PUBLISHED','APPROVAL_REQUEST_CREATED')),
  created_at timestamptz not null default now(),
  check ((action in ('ARTIFACT_UPLOAD_PREPARED','ARTIFACT_UPLOAD_COMPLETED') and upload_intent_id is not null) or (action='ARTIFACT_PUBLISHED' and upload_intent_id is not null and artifact_id is not null) or (action='APPROVAL_REQUEST_CREATED' and artifact_id is not null and approval_request_id is not null))
);

alter table public.admin_artifact_uploads enable row level security;
alter table public.admin_artifact_uploads force row level security;
alter table public.admin_artifact_action_events enable row level security;
alter table public.admin_artifact_action_events force row level security;
revoke all on table public.admin_artifact_uploads,public.admin_artifact_action_events from anon,authenticated;

create or replace function public.set_admin_artifact_upload_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
revoke all on function public.set_admin_artifact_upload_updated_at() from public,anon,authenticated;
drop trigger if exists admin_artifact_uploads_updated_at on public.admin_artifact_uploads;
create trigger admin_artifact_uploads_updated_at before update on public.admin_artifact_uploads for each row execute function public.set_admin_artifact_upload_updated_at();

create or replace function public.admin_prepare_order_artifact_upload_server(
  p_actor_user_id uuid,p_order_reference text,p_category text,p_display_name text,p_description text,p_version_label text,p_mime_type text,p_size_bytes bigint,p_request_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_role text; v_order_id uuid; v_existing public.admin_artifact_uploads%rowtype; v_upload public.admin_artifact_uploads%rowtype; v_extension text;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1;
  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into v_existing from public.admin_artifact_uploads where request_id=p_request_id limit 1;
  if found then
    if v_existing.admin_user_id=p_actor_user_id and v_existing.public_order_reference=p_order_reference and v_existing.category=p_category and v_existing.display_name=p_display_name and v_existing.description is not distinct from nullif(btrim(coalesce(p_description,'')),'') and v_existing.version_label is not distinct from nullif(btrim(coalesce(p_version_label,'')),'') and v_existing.expected_mime_type=p_mime_type and v_existing.expected_size_bytes=p_size_bytes then return jsonb_build_object('uploadReference',v_existing.public_upload_ref,'status',v_existing.status,'replayed',true); end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  if p_order_reference !~ '^ESHA-[0-9]{4}-[A-Z0-9]{8}$' or p_category not in ('design_preview','revised_design','approval_document','verification_image','verification_video','final_document') or char_length(btrim(coalesce(p_display_name,''))) not between 1 and 180 or p_display_name ~ '[\\/]' or char_length(coalesce(p_description,''))>1000 or char_length(coalesce(p_version_label,''))>80 or p_size_bytes is null or p_size_bytes<1 or p_size_bytes>52428800 or p_mime_type not in ('application/pdf','image/jpeg','image/png','image/webp','video/mp4','video/webm') then raise exception 'ARTIFACT_INPUT_INVALID'; end if;
  if not ((p_category='verification_image' and p_mime_type in ('image/jpeg','image/png','image/webp')) or (p_category='verification_video' and p_mime_type in ('video/mp4','video/webm')) or (p_category in ('design_preview','revised_design','approval_document','final_document') and p_mime_type in ('application/pdf','image/jpeg','image/png','image/webp'))) then raise exception 'ARTIFACT_INPUT_INVALID'; end if;
  select id into v_order_id from public.orders where public_order_id=p_order_reference limit 1; if v_order_id is null then raise exception 'ORDER_UNAVAILABLE'; end if;
  v_extension:=case p_mime_type when 'application/pdf' then 'pdf' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'video/mp4' then 'mp4' when 'video/webm' then 'webm' end;
  insert into public.admin_artifact_uploads(request_id,admin_user_id,role_snapshot,order_id,public_order_reference,category,display_name,description,version_label,expected_mime_type,expected_size_bytes,storage_path)
  values(p_request_id,p_actor_user_id,v_role,v_order_id,p_order_reference,p_category,btrim(p_display_name),nullif(btrim(coalesce(p_description,'')),''),nullif(btrim(coalesce(p_version_label,'')),''),p_mime_type,p_size_bytes,'orders/'||v_order_id::text||'/'||replace(gen_random_uuid()::text,'-','')||'.'||v_extension) returning * into v_upload;
  insert into public.admin_artifact_action_events(request_id,admin_user_id,role_snapshot,order_id,public_order_reference,upload_intent_id,action) values(p_request_id,p_actor_user_id,v_role,v_order_id,p_order_reference,v_upload.id,'ARTIFACT_UPLOAD_PREPARED');
  return jsonb_build_object('uploadReference',v_upload.public_upload_ref,'status',v_upload.status,'replayed',false);
end $$;
revoke all on function public.admin_prepare_order_artifact_upload_server(uuid,text,text,text,text,text,text,bigint,uuid) from public,anon,authenticated;
grant execute on function public.admin_prepare_order_artifact_upload_server(uuid,text,text,text,text,text,text,bigint,uuid) to service_role;

create or replace function public.admin_mark_order_artifact_uploaded_server(p_actor_user_id uuid,p_upload_reference text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_role text; v_upload public.admin_artifact_uploads%rowtype; v_existing public.admin_artifact_action_events%rowtype;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1; if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into v_upload from public.admin_artifact_uploads where public_upload_ref=p_upload_reference for update; if not found or v_upload.admin_user_id<>p_actor_user_id then raise exception 'UPLOAD_UNAVAILABLE'; end if;
  select * into v_existing from public.admin_artifact_action_events where request_id=p_request_id limit 1;
  if found then if v_existing.admin_user_id=p_actor_user_id and v_existing.upload_intent_id=v_upload.id and v_existing.action='ARTIFACT_UPLOAD_COMPLETED' then return jsonb_build_object('uploadReference',v_upload.public_upload_ref,'status',v_upload.status,'replayed',true); end if; raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  if v_upload.status in ('UPLOADED','PUBLISHED') then return jsonb_build_object('uploadReference',v_upload.public_upload_ref,'status',v_upload.status,'replayed',true); end if;
  if v_upload.status<>'PREPARED' then raise exception 'UPLOAD_UNAVAILABLE'; end if;
  update public.admin_artifact_uploads set status='UPLOADED',uploaded_at=now() where id=v_upload.id;
  insert into public.admin_artifact_action_events(request_id,admin_user_id,role_snapshot,order_id,public_order_reference,upload_intent_id,action) values(p_request_id,p_actor_user_id,v_role,v_upload.order_id,v_upload.public_order_reference,v_upload.id,'ARTIFACT_UPLOAD_COMPLETED');
  return jsonb_build_object('uploadReference',v_upload.public_upload_ref,'status','UPLOADED','replayed',false);
end $$;
revoke all on function public.admin_mark_order_artifact_uploaded_server(uuid,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_mark_order_artifact_uploaded_server(uuid,text,uuid) to service_role;

create or replace function public.admin_publish_order_artifact_server(p_actor_user_id uuid,p_order_reference text,p_upload_reference text,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_role text; v_upload public.admin_artifact_uploads%rowtype; v_existing public.admin_artifact_action_events%rowtype; v_artifact public.order_customer_artifacts%rowtype; v_revision integer;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1; if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into v_upload from public.admin_artifact_uploads where public_upload_ref=p_upload_reference and public_order_reference=p_order_reference for update; if not found then raise exception 'UPLOAD_UNAVAILABLE'; end if;
  select * into v_existing from public.admin_artifact_action_events where request_id=p_request_id limit 1;
  if found then if v_existing.admin_user_id=p_actor_user_id and v_existing.upload_intent_id=v_upload.id and v_existing.action='ARTIFACT_PUBLISHED' and v_existing.artifact_id is not null then select * into v_artifact from public.order_customer_artifacts where id=v_existing.artifact_id; return jsonb_build_object('artifactReference',v_artifact.public_artifact_ref,'revision',v_artifact.revision,'replayed',true); end if; raise exception 'IDEMPOTENCY_CONFLICT'; end if;
  if v_upload.status='PUBLISHED' and v_upload.artifact_id is not null then select * into v_artifact from public.order_customer_artifacts where id=v_upload.artifact_id; return jsonb_build_object('artifactReference',v_artifact.public_artifact_ref,'revision',v_artifact.revision,'replayed',true); end if;
  if v_upload.status<>'UPLOADED' then raise exception 'UPLOAD_NOT_READY'; end if;
  perform 1 from public.orders where id=v_upload.order_id and public_order_id=p_order_reference for update; if not found then raise exception 'ORDER_UNAVAILABLE'; end if;
  select coalesce(max(revision),0)+1 into v_revision from public.order_customer_artifacts where order_id=v_upload.order_id and category=v_upload.category;
  insert into public.order_customer_artifacts(order_id,category,display_name,description,version_label,revision,storage_bucket,storage_path,mime_type,size_bytes,customer_visible)
  values(v_upload.order_id,v_upload.category,v_upload.display_name,v_upload.description,v_upload.version_label,v_revision,v_upload.storage_bucket,v_upload.storage_path,v_upload.expected_mime_type,v_upload.expected_size_bytes,true) returning * into v_artifact;
  update public.admin_artifact_uploads set status='PUBLISHED',artifact_id=v_artifact.id,published_at=now() where id=v_upload.id;
  insert into public.admin_artifact_action_events(request_id,admin_user_id,role_snapshot,order_id,public_order_reference,upload_intent_id,artifact_id,action) values(p_request_id,p_actor_user_id,v_role,v_upload.order_id,p_order_reference,v_upload.id,v_artifact.id,'ARTIFACT_PUBLISHED');
  return jsonb_build_object('artifactReference',v_artifact.public_artifact_ref,'revision',v_artifact.revision,'replayed',false);
end $$;
revoke all on function public.admin_publish_order_artifact_server(uuid,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_publish_order_artifact_server(uuid,text,text,uuid) to service_role;
