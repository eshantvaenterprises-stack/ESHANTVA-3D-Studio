drop function if exists public.admin_prepare_order_artifact_upload_server(uuid,text,uuid,text,text,text,text,text,bigint);
drop function if exists public.admin_publish_order_artifact_server(uuid,text,uuid);
drop table if exists public.admin_artifact_upload_sessions;

create or replace function public.admin_create_artifact_approval_request_server(
  p_actor_user_id uuid,p_order_reference text,p_artifact_reference text,p_expected_revision integer,p_request_id uuid
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_role text; v_order_id uuid; v_artifact public.order_customer_artifacts%rowtype; v_existing_event public.admin_artifact_action_events%rowtype; v_existing_approval public.order_approval_requests%rowtype; v_approval public.order_approval_requests%rowtype;
begin
  select role into v_role from public.admin_users where user_id=p_actor_user_id and active=true limit 1;
  if v_role is distinct from 'ADMIN' then raise exception 'ADMIN_MUTATION_FORBIDDEN'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_request_id::text,0));
  select * into v_existing_event from public.admin_artifact_action_events where request_id=p_request_id limit 1;
  if found then
    if v_existing_event.admin_user_id=p_actor_user_id and v_existing_event.public_order_reference=p_order_reference and v_existing_event.action='APPROVAL_REQUEST_CREATED' and v_existing_event.artifact_id is not null and v_existing_event.approval_request_id is not null then
      select * into v_artifact from public.order_customer_artifacts where id=v_existing_event.artifact_id;
      select * into v_approval from public.order_approval_requests where id=v_existing_event.approval_request_id;
      if v_artifact.public_artifact_ref=p_artifact_reference and v_artifact.revision=p_expected_revision then return jsonb_build_object('approvalReference',v_approval.public_approval_ref,'artifactReference',v_artifact.public_artifact_ref,'revision',v_approval.target_revision,'status',v_approval.status,'replayed',true); end if;
    end if;
    raise exception 'IDEMPOTENCY_CONFLICT';
  end if;
  select id into v_order_id from public.orders where public_order_id=p_order_reference limit 1;
  if v_order_id is null then raise exception 'ORDER_UNAVAILABLE'; end if;
  select * into v_artifact from public.order_customer_artifacts where public_artifact_ref=p_artifact_reference and order_id=v_order_id and customer_visible=true and revision=p_expected_revision for update;
  if not found then raise exception 'ARTIFACT_UNAVAILABLE'; end if;
  if exists(select 1 from public.order_customer_artifacts newer where newer.order_id=v_artifact.order_id and newer.category=v_artifact.category and newer.customer_visible=true and newer.revision>v_artifact.revision) then raise exception 'ARTIFACT_STALE'; end if;
  select * into v_existing_approval from public.order_approval_requests where artifact_id=v_artifact.id limit 1;
  if found then raise exception 'APPROVAL_ALREADY_EXISTS'; end if;
  insert into public.order_approval_requests(order_id,artifact_id,target_revision,status) values(v_order_id,v_artifact.id,v_artifact.revision,'PENDING') returning * into v_approval;
  insert into public.admin_artifact_action_events(request_id,admin_user_id,role_snapshot,order_id,public_order_reference,artifact_id,approval_request_id,action) values(p_request_id,p_actor_user_id,v_role,v_order_id,p_order_reference,v_artifact.id,v_approval.id,'APPROVAL_REQUEST_CREATED');
  return jsonb_build_object('approvalReference',v_approval.public_approval_ref,'artifactReference',v_artifact.public_artifact_ref,'revision',v_approval.target_revision,'status',v_approval.status,'replayed',false);
end $$;
revoke all on function public.admin_create_artifact_approval_request_server(uuid,text,text,integer,uuid) from public,anon,authenticated;
grant execute on function public.admin_create_artifact_approval_request_server(uuid,text,text,integer,uuid) to service_role;
