create table if not exists public.admin_request_action_events (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  role_snapshot text not null check (role_snapshot in ('ADMIN','STAFF')),
  request_kind text not null check (request_kind in ('CUSTOM','BULK')),
  custom_request_id uuid references public.custom_requests(id) on delete restrict,
  bulk_request_id uuid references public.bulk_requests(id) on delete restrict,
  public_request_reference text not null,
  action text not null check (action in ('CUSTOM_REQUEST_STATUS_CHANGED','BULK_REQUEST_STATUS_CHANGED')),
  previous_status text not null,
  new_status text not null,
  created_at timestamptz not null default now(),
  check (
    (request_kind='CUSTOM' and custom_request_id is not null and bulk_request_id is null and action='CUSTOM_REQUEST_STATUS_CHANGED')
    or
    (request_kind='BULK' and bulk_request_id is not null and custom_request_id is null and action='BULK_REQUEST_STATUS_CHANGED')
  )
);

create index if not exists admin_request_action_events_admin_created_idx
  on public.admin_request_action_events(admin_user_id, created_at desc);
create index if not exists admin_request_action_events_custom_created_idx
  on public.admin_request_action_events(custom_request_id, created_at desc)
  where custom_request_id is not null;
create index if not exists admin_request_action_events_bulk_created_idx
  on public.admin_request_action_events(bulk_request_id, created_at desc)
  where bulk_request_id is not null;

alter table public.admin_request_action_events enable row level security;
alter table public.admin_request_action_events force row level security;
revoke all on table public.admin_request_action_events from anon, authenticated;

create or replace function public.admin_customer_activity_page_server(
  p_offset integer,
  p_limit integer,
  p_customer_id uuid default null
) returns table (
  customer_id uuid,
  order_count bigint,
  custom_request_count bigint,
  bulk_request_count bigint,
  last_activity timestamptz,
  total_count bigint
)
language sql
security invoker
set search_path = ''
as $$
  with activity as (
    select o.customer_id, 'ORDER'::text as activity_kind, o.created_at as activity_at
    from public.orders o
    union all
    select c.customer_id, 'CUSTOM'::text, coalesce(c.submitted_at,c.created_at)
    from public.custom_requests c
    where c.status <> 'DRAFT' and c.public_request_id is not null
    union all
    select b.customer_id, 'BULK'::text, coalesce(b.submitted_at,b.created_at)
    from public.bulk_requests b
    where b.status <> 'DRAFT' and b.public_request_id is not null
  ),
  grouped as (
    select
      a.customer_id,
      count(*) filter (where a.activity_kind='ORDER')::bigint as order_count,
      count(*) filter (where a.activity_kind='CUSTOM')::bigint as custom_request_count,
      count(*) filter (where a.activity_kind='BULK')::bigint as bulk_request_count,
      max(a.activity_at) as last_activity
    from activity a
    where p_customer_id is null or a.customer_id=p_customer_id
    group by a.customer_id
  )
  select
    g.customer_id,
    g.order_count,
    g.custom_request_count,
    g.bulk_request_count,
    g.last_activity,
    count(*) over()::bigint as total_count
  from grouped g
  order by g.last_activity desc, g.customer_id
  offset greatest(coalesce(p_offset,0),0)
  limit least(greatest(coalesce(p_limit,20),1),50);
$$;

revoke all on function public.admin_customer_activity_page_server(integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_customer_activity_page_server(integer,integer,uuid) to service_role;

create or replace function public.admin_transition_custom_request_status_server(
  p_actor_user_id uuid,
  p_request_reference text,
  p_expected_status text,
  p_target_status text,
  p_request_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
  v_target record;
  v_existing record;
  v_allowed boolean := false;
begin
  select role into v_role
  from public.admin_users
  where user_id=p_actor_user_id and active=true
  limit 1;

  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;

  select * into v_existing
  from public.admin_request_action_events
  where request_id=p_request_id
  limit 1;

  if found then
    if v_existing.admin_user_id=p_actor_user_id
       and v_existing.request_kind='CUSTOM'
       and v_existing.public_request_reference=p_request_reference
       and v_existing.previous_status=p_expected_status
       and v_existing.new_status=p_target_status then
      return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',true);
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;

  select id,status into v_target
  from public.custom_requests
  where public_request_id=p_request_reference
  for update;

  if not found then raise exception 'REQUEST_UNAVAILABLE'; end if;
  if v_target.status<>p_expected_status then raise exception 'REQUEST_STATUS_STALE'; end if;

  v_allowed :=
    (p_expected_status='SUBMITTED' and p_target_status='UNDER_REVIEW')
    or (p_expected_status='UNDER_REVIEW' and p_target_status in ('NEEDS_INFORMATION','QUOTED','DECLINED'))
    or (p_expected_status='NEEDS_INFORMATION' and p_target_status='UNDER_REVIEW')
    or (p_expected_status='QUOTED' and p_target_status in ('ACCEPTED','DECLINED'));

  if not v_allowed then raise exception 'REQUEST_TRANSITION_UNAVAILABLE'; end if;

  update public.custom_requests
  set status=p_target_status
  where id=v_target.id and status=p_expected_status;

  if not found then raise exception 'REQUEST_STATUS_STALE'; end if;

  insert into public.custom_request_events(request_id,event_type,from_status,to_status,public_message,internal_metadata)
  values(v_target.id,'STATUS_CHANGED',p_expected_status,p_target_status,'Request status updated.',jsonb_build_object('source','admin_requests'));

  insert into public.admin_request_action_events(
    request_id,admin_user_id,role_snapshot,request_kind,custom_request_id,
    public_request_reference,action,previous_status,new_status
  ) values(
    p_request_id,p_actor_user_id,v_role,'CUSTOM',v_target.id,
    p_request_reference,'CUSTOM_REQUEST_STATUS_CHANGED',p_expected_status,p_target_status
  );

  return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',false);
end;
$$;

revoke all on function public.admin_transition_custom_request_status_server(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_transition_custom_request_status_server(uuid,text,text,text,uuid) to service_role;

create or replace function public.admin_transition_bulk_request_status_server(
  p_actor_user_id uuid,
  p_request_reference text,
  p_expected_status text,
  p_target_status text,
  p_request_id uuid
) returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role text;
  v_target record;
  v_existing record;
  v_allowed boolean := false;
begin
  select role into v_role
  from public.admin_users
  where user_id=p_actor_user_id and active=true
  limit 1;

  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;

  select * into v_existing
  from public.admin_request_action_events
  where request_id=p_request_id
  limit 1;

  if found then
    if v_existing.admin_user_id=p_actor_user_id
       and v_existing.request_kind='BULK'
       and v_existing.public_request_reference=p_request_reference
       and v_existing.previous_status=p_expected_status
       and v_existing.new_status=p_target_status then
      return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',true);
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;

  select id,status into v_target
  from public.bulk_requests
  where public_request_id=p_request_reference
  for update;

  if not found then raise exception 'REQUEST_UNAVAILABLE'; end if;
  if v_target.status<>p_expected_status then raise exception 'REQUEST_STATUS_STALE'; end if;

  v_allowed :=
    (p_expected_status='SUBMITTED' and p_target_status='UNDER_REVIEW')
    or (p_expected_status='UNDER_REVIEW' and p_target_status in ('MORE_INFORMATION_REQUIRED','QUOTATION_PREPARATION','REJECTED'))
    or (p_expected_status='MORE_INFORMATION_REQUIRED' and p_target_status='UNDER_REVIEW')
    or (p_expected_status='QUOTATION_PREPARATION' and p_target_status='QUOTATION_SENT')
    or (p_expected_status='QUOTATION_SENT' and p_target_status='AWAITING_CUSTOMER_APPROVAL')
    or (p_expected_status='AWAITING_CUSTOMER_APPROVAL' and p_target_status in ('ACCEPTED','REJECTED'));

  if not v_allowed then raise exception 'REQUEST_TRANSITION_UNAVAILABLE'; end if;

  update public.bulk_requests
  set status=p_target_status
  where id=v_target.id and status=p_expected_status;

  if not found then raise exception 'REQUEST_STATUS_STALE'; end if;

  insert into public.bulk_request_events(bulk_request_id,event_type,from_status,to_status,public_message,internal_metadata)
  values(v_target.id,'STATUS_CHANGED',p_expected_status,p_target_status,'Bulk request status updated.',jsonb_build_object('source','admin_requests'));

  insert into public.admin_request_action_events(
    request_id,admin_user_id,role_snapshot,request_kind,bulk_request_id,
    public_request_reference,action,previous_status,new_status
  ) values(
    p_request_id,p_actor_user_id,v_role,'BULK',v_target.id,
    p_request_reference,'BULK_REQUEST_STATUS_CHANGED',p_expected_status,p_target_status
  );

  return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',false);
end;
$$;

revoke all on function public.admin_transition_bulk_request_status_server(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_transition_bulk_request_status_server(uuid,text,text,text,uuid) to service_role;
