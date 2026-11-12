create table if not exists public.admin_order_action_events (
  id bigint generated always as identity primary key,
  request_id uuid not null unique,
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  role_snapshot text not null check (role_snapshot in ('ADMIN','STAFF')),
  order_id uuid not null references public.orders(id) on delete restrict,
  public_order_reference text not null check (public_order_reference ~ '^ESHA-[0-9]{4}-[A-Z0-9]{8}$'),
  action text not null check (action = 'ORDER_STATUS_CHANGED'),
  previous_status text not null,
  new_status text not null,
  created_at timestamptz not null default now()
);
create index if not exists admin_order_action_events_admin_created_idx on public.admin_order_action_events(admin_user_id, created_at desc);
create index if not exists admin_order_action_events_order_created_idx on public.admin_order_action_events(order_id, created_at desc);
alter table public.admin_order_action_events enable row level security;
alter table public.admin_order_action_events force row level security;
revoke all on table public.admin_order_action_events from anon, authenticated;
create or replace function public.admin_transition_order_status_server(p_actor_user_id uuid,p_order_reference text,p_expected_status text,p_target_status text,p_request_id uuid) returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare v_role text; v_order record; v_existing record; v_allowed boolean := false;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1;
  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  select event.admin_user_id,event.order_id,event.public_order_reference,event.previous_status,event.new_status into v_existing from public.admin_order_action_events event where event.request_id=p_request_id limit 1;
  if found then
    if v_existing.admin_user_id=p_actor_user_id and v_existing.public_order_reference=p_order_reference and v_existing.previous_status=p_expected_status and v_existing.new_status=p_target_status then
      return jsonb_build_object('orderReference',p_order_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',true);
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  select id,status,delivery_method into v_order from public.orders where public_order_id=p_order_reference for update;
  if not found then raise exception 'ORDER_UNAVAILABLE'; end if;
  if v_order.status<>p_expected_status then raise exception 'ORDER_STATUS_STALE'; end if;
  v_allowed :=
    (p_expected_status='paid' and p_target_status='under_review') or
    (p_expected_status='under_review' and p_target_status='confirmed') or
    (p_expected_status='confirmed' and p_target_status='in_production') or
    (p_expected_status='in_production' and p_target_status='ready_for_pickup' and v_order.delivery_method='pickup') or
    (p_expected_status='in_production' and p_target_status='shipped' and v_order.delivery_method in ('shipping','local_delivery')) or
    (p_expected_status='ready_for_pickup' and p_target_status='delivered' and v_order.delivery_method='pickup') or
    (p_expected_status='shipped' and p_target_status='delivered' and v_order.delivery_method in ('shipping','local_delivery'));
  if not v_allowed then raise exception 'ORDER_TRANSITION_UNAVAILABLE'; end if;
  update public.orders set status=p_target_status where id=v_order.id and status=p_expected_status;
  if not found then raise exception 'ORDER_STATUS_STALE'; end if;
  insert into public.order_events(order_id,event_type,from_status,to_status,internal_metadata) values(v_order.id,'status_changed',p_expected_status,p_target_status,jsonb_build_object('source','admin_orders'));
  insert into public.admin_order_action_events(request_id,admin_user_id,role_snapshot,order_id,public_order_reference,action,previous_status,new_status) values(p_request_id,p_actor_user_id,v_role,v_order.id,p_order_reference,'ORDER_STATUS_CHANGED',p_expected_status,p_target_status);
  return jsonb_build_object('orderReference',p_order_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',false);
end; $$;
revoke all on function public.admin_transition_order_status_server(uuid,text,text,text,uuid) from public, anon, authenticated;
grant execute on function public.admin_transition_order_status_server(uuid,text,text,text,uuid) to service_role;
