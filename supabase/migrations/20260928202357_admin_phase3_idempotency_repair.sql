create or replace function public.admin_transition_custom_request_status_server(
  p_actor_user_id uuid,p_request_reference text,p_expected_status text,p_target_status text,p_request_id uuid
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_role text; v_target record; v_existing record; v_allowed boolean:=false;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1;
  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into v_existing from public.admin_request_action_events where request_id=p_request_id limit 1;
  if found then
    if v_existing.admin_user_id=p_actor_user_id and v_existing.request_kind='CUSTOM'
       and v_existing.public_request_reference=p_request_reference
       and v_existing.previous_status=p_expected_status and v_existing.new_status=p_target_status then
      return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',true);
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  select id,status into v_target from public.custom_requests where public_request_id=p_request_reference for update;
  if not found then raise exception 'REQUEST_UNAVAILABLE'; end if;
  if v_target.status<>p_expected_status then raise exception 'REQUEST_STATUS_STALE'; end if;
  v_allowed :=
    (p_expected_status='SUBMITTED' and p_target_status='UNDER_REVIEW') or
    (p_expected_status='UNDER_REVIEW' and p_target_status in ('NEEDS_INFORMATION','QUOTED','DECLINED')) or
    (p_expected_status='NEEDS_INFORMATION' and p_target_status='UNDER_REVIEW') or
    (p_expected_status='QUOTED' and p_target_status in ('ACCEPTED','DECLINED'));
  if not v_allowed then raise exception 'REQUEST_TRANSITION_UNAVAILABLE'; end if;
  update public.custom_requests set status=p_target_status where id=v_target.id and status=p_expected_status;
  if not found then raise exception 'REQUEST_STATUS_STALE'; end if;
  insert into public.custom_request_events(request_id,event_type,from_status,to_status,public_message,internal_metadata)
  values(v_target.id,'STATUS_CHANGED',p_expected_status,p_target_status,'Request status updated.',jsonb_build_object('source','admin_requests'));
  insert into public.admin_request_action_events(request_id,admin_user_id,role_snapshot,request_kind,custom_request_id,public_request_reference,action,previous_status,new_status)
  values(p_request_id,p_actor_user_id,v_role,'CUSTOM',v_target.id,p_request_reference,'CUSTOM_REQUEST_STATUS_CHANGED',p_expected_status,p_target_status);
  return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',false);
end; $$;
revoke all on function public.admin_transition_custom_request_status_server(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_transition_custom_request_status_server(uuid,text,text,text,uuid) to service_role;

create or replace function public.admin_transition_bulk_request_status_server(
  p_actor_user_id uuid,p_request_reference text,p_expected_status text,p_target_status text,p_request_id uuid
) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_role text; v_target record; v_existing record; v_allowed boolean:=false;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1;
  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into v_existing from public.admin_request_action_events where request_id=p_request_id limit 1;
  if found then
    if v_existing.admin_user_id=p_actor_user_id and v_existing.request_kind='BULK'
       and v_existing.public_request_reference=p_request_reference
       and v_existing.previous_status=p_expected_status and v_existing.new_status=p_target_status then
      return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',true);
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  select id,status into v_target from public.bulk_requests where public_request_id=p_request_reference for update;
  if not found then raise exception 'REQUEST_UNAVAILABLE'; end if;
  if v_target.status<>p_expected_status then raise exception 'REQUEST_STATUS_STALE'; end if;
  v_allowed :=
    (p_expected_status='SUBMITTED' and p_target_status='UNDER_REVIEW') or
    (p_expected_status='UNDER_REVIEW' and p_target_status in ('MORE_INFORMATION_REQUIRED','QUOTATION_PREPARATION','REJECTED')) or
    (p_expected_status='MORE_INFORMATION_REQUIRED' and p_target_status='UNDER_REVIEW') or
    (p_expected_status='QUOTATION_PREPARATION' and p_target_status='QUOTATION_SENT') or
    (p_expected_status='QUOTATION_SENT' and p_target_status='AWAITING_CUSTOMER_APPROVAL') or
    (p_expected_status='AWAITING_CUSTOMER_APPROVAL' and p_target_status in ('ACCEPTED','REJECTED'));
  if not v_allowed then raise exception 'REQUEST_TRANSITION_UNAVAILABLE'; end if;
  update public.bulk_requests set status=p_target_status where id=v_target.id and status=p_expected_status;
  if not found then raise exception 'REQUEST_STATUS_STALE'; end if;
  insert into public.bulk_request_events(bulk_request_id,event_type,from_status,to_status,public_message,internal_metadata)
  values(v_target.id,'STATUS_CHANGED',p_expected_status,p_target_status,'Bulk request status updated.',jsonb_build_object('source','admin_requests'));
  insert into public.admin_request_action_events(request_id,admin_user_id,role_snapshot,request_kind,bulk_request_id,public_request_reference,action,previous_status,new_status)
  values(p_request_id,p_actor_user_id,v_role,'BULK',v_target.id,p_request_reference,'BULK_REQUEST_STATUS_CHANGED',p_expected_status,p_target_status);
  return jsonb_build_object('requestReference',p_request_reference,'previousStatus',p_expected_status,'status',p_target_status,'replayed',false);
end; $$;
revoke all on function public.admin_transition_bulk_request_status_server(uuid,text,text,text,uuid) from public,anon,authenticated;
grant execute on function public.admin_transition_bulk_request_status_server(uuid,text,text,text,uuid) to service_role;
