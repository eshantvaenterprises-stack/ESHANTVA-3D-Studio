drop function if exists public.submit_customer_artifact_approval_server(uuid,text,text,text,text);

create or replace function public.submit_customer_artifact_approval_server(
  p_customer_id uuid,
  p_order_reference text,
  p_approval_reference text,
  p_artifact_reference text,
  p_expected_revision integer,
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
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'APPROVAL_STALE';
  end if;
  if p_action = 'REVISION_REQUESTED'
     and (v_message is null or char_length(v_message) < 3 or char_length(v_message) > 1000) then
    raise exception 'REVISION_MESSAGE_INVALID';
  end if;

  select request.id as approval_id, request.status as approval_status, request.target_revision,
         artifact.id as artifact_id, artifact.public_artifact_ref, artifact.revision as artifact_revision,
         artifact.category as artifact_category, artifact.customer_visible, artifact.order_id
  into v_request
  from public.order_approval_requests request
  join public.order_customer_artifacts artifact on artifact.id = request.artifact_id
  join public.orders customer_order on customer_order.id = request.order_id
  where request.public_approval_ref = p_approval_reference
    and artifact.public_artifact_ref = p_artifact_reference
    and artifact.revision = p_expected_revision
    and customer_order.public_order_id = p_order_reference
    and customer_order.customer_id = p_customer_id
    and artifact.order_id = customer_order.id
  for update of request;

  if not found then raise exception 'APPROVAL_UNAVAILABLE'; end if;
  v_new_status := p_action;

  if v_request.approval_status = v_new_status then
    return jsonb_build_object('approvalReference',p_approval_reference,'artifactReference',p_artifact_reference,'revision',p_expected_revision,'status',v_new_status,'replayed',true);
  end if;
  if v_request.approval_status <> 'PENDING' then raise exception 'APPROVAL_ALREADY_RESOLVED'; end if;
  if not v_request.customer_visible or v_request.target_revision <> v_request.artifact_revision or v_request.artifact_revision <> p_expected_revision then
    raise exception 'APPROVAL_STALE';
  end if;
  if exists (
    select 1 from public.order_customer_artifacts newer
    where newer.order_id = v_request.order_id and newer.category = v_request.artifact_category
      and newer.customer_visible and newer.revision > v_request.artifact_revision
  ) then raise exception 'APPROVAL_STALE'; end if;

  update public.order_approval_requests set status=v_new_status,resolved_at=now() where id=v_request.approval_id;
  insert into public.order_approval_actions(approval_request_id,artifact_id,artifact_revision,customer_id,action,customer_message)
  values(v_request.approval_id,v_request.artifact_id,v_request.artifact_revision,p_customer_id,v_new_status,
         case when v_new_status='REVISION_REQUESTED' then v_message else null end)
  on conflict (approval_request_id) do nothing;

  return jsonb_build_object('approvalReference',p_approval_reference,'artifactReference',p_artifact_reference,'revision',p_expected_revision,'status',v_new_status,'replayed',false);
end;
$$;

revoke all on function public.submit_customer_artifact_approval_server(uuid,text,text,text,integer,text,text) from public, anon, authenticated;
grant execute on function public.submit_customer_artifact_approval_server(uuid,text,text,text,integer,text,text) to service_role;
