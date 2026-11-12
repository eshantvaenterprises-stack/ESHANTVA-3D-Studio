-- Prepared locally only. No seed content, customers or migrations applied to Main.
create table public.website_content_documents (
 kind text not null check(kind in ('faq','about','project')), content_key text not null check(content_key ~ '^[a-z][a-z0-9-]{0,79}$'),
 revision integer not null default 0 check(revision>=0), published_revision integer check(published_revision>0 and published_revision<=revision), state text not null default 'DRAFT' check(state in ('DRAFT','REVIEW','PUBLISHED','UNPUBLISHED')),
 primary key(kind,content_key)
);
create table public.website_content_revisions (
 kind text not null,content_key text not null,revision integer not null check(revision>0),payload jsonb not null,
 state text not null check(state in ('DRAFT','REVIEW','PUBLISHED','UNPUBLISHED')),created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 primary key(kind,content_key,revision),foreign key(kind,content_key) references public.website_content_documents(kind,content_key),
 constraint website_content_payload_valid check(
  jsonb_typeof(payload)='object' and
  jsonb_typeof(payload->'title') is not distinct from 'string' and jsonb_typeof(payload->'body') is not distinct from 'string' and
  length(btrim(payload->>'title')) between 3 and 160 and length(btrim(payload->>'body')) between 3 and 4000 and
  (payload->>'title')!~'[<>]' and (payload->>'body')!~'[<>]' and
  (payload - case kind when 'faq' then array['title','body','category'] when 'project' then array['title','body','image','realPortfolio','customerApproved','isPlaceholder','approvalReference'] else array['title','body'] end)='{}'::jsonb and
  case kind when 'faq' then
   jsonb_typeof(payload->'category') is not distinct from 'string' and
   (payload->>'category') in ('shop-products','custom-orders','bulk-orders','materials-options','pricing-payment','delivery-pickup','process-changes','business-support')
  when 'project' then
   jsonb_typeof(payload->'image') is not distinct from 'string' and length(payload->>'image') between 1 and 240 and
   (payload->>'image') ~ '^/images/[a-zA-Z0-9/_-]+[.](png|jpg|jpeg|webp)$' and
   jsonb_typeof(payload->'realPortfolio') is not distinct from 'boolean' and
   jsonb_typeof(payload->'customerApproved') is not distinct from 'boolean' and
   jsonb_typeof(payload->'isPlaceholder') is not distinct from 'boolean' and
   jsonb_typeof(payload->'approvalReference') is not distinct from 'string' and
   length(btrim(payload->>'approvalReference')) between 1 and 160
  else true end
 )
);
alter table public.website_content_documents add constraint website_published_revision_fk
 foreign key(kind,content_key,published_revision) references public.website_content_revisions(kind,content_key,revision);
create table public.website_customer_profiles (
 customer_id uuid primary key references auth.users(id),display_name text not null check(length(btrim(display_name)) between 1 and 100 and display_name !~ '[<>]'),
 version integer not null check(version>0),updated_at timestamptz not null default now()
);
create table public.website_request_followups (
 public_reference uuid primary key default gen_random_uuid(),kind text not null check(kind in ('custom','bulk')),request_reference text not null,
 customer_id uuid not null references auth.users(id),custom_request_id uuid references public.custom_requests(id),bulk_request_id uuid references public.bulk_requests(id),
 question text not null check(length(question) between 3 and 2000 and question !~ '[<>]'),reply text check(length(reply) between 1 and 4000 and reply !~ '[<>]'),
 closed_at timestamptz,closure_reason text,
 state text not null default 'OPEN' check(state in ('OPEN','REPLIED','CLOSED')),created_at timestamptz not null default now(),replied_at timestamptz,
 check((state='CLOSED' and closed_at is not null and closure_reason is not null and reply is null and replied_at is null) or (state='OPEN' and reply is null and replied_at is null and closed_at is null and closure_reason is null) or (state='REPLIED' and reply is not null and replied_at is not null and closed_at is null and closure_reason is null)),
 check((kind='custom' and custom_request_id is not null and bulk_request_id is null) or (kind='bulk' and bulk_request_id is not null and custom_request_id is null))
);
create unique index website_followups_one_open on public.website_request_followups(kind,request_reference) where state='OPEN';
create index website_followups_owner on public.website_request_followups(customer_id,created_at desc);
create table public.website_feature_audit (
 id bigint generated always as identity primary key,actor_user_id uuid references auth.users(id),action text not null,subject text not null,created_at timestamptz not null default now(),
 request_id uuid,content_revision integer check(content_revision>0),followup_reference uuid references public.website_request_followups(public_reference),
 check(actor_user_id is not null or action='followup-closed-on-status-change')
);
create table public.website_feature_commands (
 request_id uuid primary key,actor_user_id uuid not null references auth.users(id),action text not null,input_hash text not null,result jsonb not null,created_at timestamptz not null default now()
);
alter table public.website_feature_audit add constraint website_audit_command_fk foreign key(request_id) references public.website_feature_commands(request_id) deferrable initially deferred;

do $$ declare t text; begin
 foreach t in array array['website_content_documents','website_content_revisions','website_customer_profiles','website_request_followups','website_feature_audit','website_feature_commands'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('alter table public.%I force row level security',t);
 execute format('revoke all on table public.%I from public,anon,authenticated,service_role',t);
 execute format('grant select,insert,update on table public.%I to service_role',t);
 end loop;
end $$;
-- Audit and replay records are append-only for the service principal.
revoke update on table public.website_feature_audit,public.website_feature_commands from service_role;
revoke all on sequence public.website_feature_audit_id_seq from public,anon,authenticated,service_role;
grant usage,select on sequence public.website_feature_audit_id_seq to service_role;
-- One SELECT snapshot binds the public revision to its current publication pointer.
create function public.website_published_content_server(p_kind text)
returns table(kind text,content_key text,revision integer,payload jsonb,updated_at timestamptz)
language sql stable security invoker set search_path='' as $$
 select r.kind,r.content_key,r.revision,r.payload,r.updated_at
 from public.website_content_documents d join public.website_content_revisions r
 on (r.kind=d.kind and r.content_key=d.content_key and r.revision=d.published_revision)
 where d.kind=p_kind and r.state='PUBLISHED' order by d.content_key limit 100
$$;
revoke all on function public.website_published_content_server(text) from public,anon,authenticated;
grant execute on function public.website_published_content_server(text) to service_role;
-- Existing status RPCs already lock request before follow-up. The trigger uses the same order.
-- Null actor is an explicitly system-generated closure, never attributed to the customer.
create function public.website_close_followups_on_status_server() returns trigger
language plpgsql security invoker set search_path='' as $$
declare v_closed uuid; v_kind text; v_waiting text;
begin
 v_kind:=case when TG_TABLE_NAME='custom_requests' then 'custom' else 'bulk' end;
 v_waiting:=case when v_kind='custom' then 'NEEDS_INFORMATION' else 'MORE_INFORMATION_REQUIRED' end;
 if old.status=v_waiting and new.status is distinct from v_waiting then
  for v_closed in update public.website_request_followups
   set state='CLOSED',closed_at=clock_timestamp(),closure_reason='REQUEST_STATE_CHANGED'
   where kind=v_kind and state='OPEN' and
    ((v_kind='custom' and custom_request_id=new.id) or (v_kind='bulk' and bulk_request_id=new.id))
   returning public_reference loop
    insert into public.website_feature_audit(actor_user_id,action,subject,followup_reference)
     values(null,'followup-closed-on-status-change',v_kind||':'||new.public_request_id,v_closed);
  end loop;
 end if;
 return new;
end $$;
revoke all on function public.website_close_followups_on_status_server() from public,anon,authenticated;
grant execute on function public.website_close_followups_on_status_server() to service_role;
create trigger website_custom_followup_status_closed after update of status on public.custom_requests
 for each row when(old.status is distinct from new.status) execute function public.website_close_followups_on_status_server();
create trigger website_bulk_followup_status_closed after update of status on public.bulk_requests
 for each row when(old.status is distinct from new.status) execute function public.website_close_followups_on_status_server();
-- Service role only. Recheck actor, exact payload, expected revision and state under locks.
create function public.website_features_mutate_server(p_actor uuid,p_action text,p_input jsonb) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare
 v_role text; v_request_id uuid; v_existing record; v_doc record; v_profile record; v_follow record; v_target record;
 v_kind text; v_key text; v_expected integer; v_audit_revision integer; v_payload jsonb; v_result jsonb; v_state text; v_ref text; v_next text; v_question text; v_reply text; v_id uuid;
begin
 -- p_actor is bound to getUser by the Edge Function; only service_role can execute.
 -- Main service_role has no auth.users SELECT; preserve that boundary.
 if p_actor is null then raise exception 'ACCESS_DENIED'; end if;
 select role into v_role from public.admin_users where user_id=p_actor and active=true;
 if p_action like 'cms-%' or p_action='followup-create' then
  if v_role is distinct from 'ADMIN' then raise exception 'ACCESS_DENIED'; end if;
 end if;
 if p_action is null or p_action not in ('cms-save','cms-review','cms-publish','cms-unpublish','profile-save','followup-create','followup-reply') then raise exception 'INVALID_INPUT'; end if;
 if jsonb_typeof(p_input) is distinct from 'object' then raise exception 'INVALID_INPUT';end if;
 v_request_id:=(p_input->>'requestId')::uuid;
 if v_request_id is null then raise exception 'INVALID_INPUT'; end if;
 perform pg_advisory_xact_lock(hashtextextended(v_request_id::text,0));
 select * into v_existing from public.website_feature_commands where request_id=v_request_id;
 if found then
  if v_existing.actor_user_id=p_actor and v_existing.action=p_action and v_existing.input_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_input::text,'UTF8')),'hex') then return v_existing.result;end if;
  raise exception 'IDEMPOTENCY_CONFLICT';
 end if;
 if p_action like 'cms-%' then
  v_kind:=p_input->>'kind';v_key:=p_input->>'key';v_expected:=(p_input->>'expectedRevision')::integer;
  if v_kind is null or v_key is null or v_kind not in ('faq','about','project') or v_key !~ '^[a-z][a-z0-9-]{0,79}$' or v_expected is null or v_expected<0 then raise exception 'INVALID_INPUT';end if;
  if p_action<>'cms-save' and v_expected=0 then raise exception 'INVALID_INPUT';end if;
  perform pg_advisory_xact_lock(hashtextextended(v_kind||':'||v_key,1));
  if p_action='cms-save' then
   insert into public.website_content_documents(kind,content_key) values(v_kind,v_key) on conflict do nothing;
  end if;
  select * into v_doc from public.website_content_documents where kind=v_kind and content_key=v_key for update;
  if not found then raise exception 'NOT_FOUND';end if;
  if v_doc.revision<>v_expected then raise exception 'STATE_CONFLICT';end if;
  if p_action='cms-save' then
   v_payload:=p_input->'payload';
   if jsonb_typeof(v_payload) is distinct from 'object' or jsonb_typeof(v_payload->'title') is distinct from 'string' or jsonb_typeof(v_payload->'body') is distinct from 'string' or length(v_payload->>'title') not between 3 and 160 or length(v_payload->>'body') not between 3 and 4000 or (v_payload->>'title')~'[<>]' or (v_payload->>'body')~'[<>]' then raise exception 'INVALID_INPUT';end if;
   v_expected:=v_expected+1;
   insert into public.website_content_revisions(kind,content_key,revision,payload,state) values(v_kind,v_key,v_expected,v_payload,'DRAFT');
   update public.website_content_documents set revision=v_expected,state='DRAFT' where kind=v_kind and content_key=v_key;
  elsif p_action='cms-review' then
   if v_doc.state<>'DRAFT' then raise exception 'STATE_CONFLICT';end if;
   update public.website_content_documents set state='REVIEW' where kind=v_kind and content_key=v_key;
   update public.website_content_revisions set state='REVIEW',updated_at=now() where kind=v_kind and content_key=v_key and revision=v_expected;
  elsif p_action='cms-publish' then
   if v_doc.state<>'REVIEW' then raise exception 'STATE_CONFLICT';end if;
   select payload into v_payload from public.website_content_revisions where kind=v_kind and content_key=v_key and revision=v_expected;
   if v_kind='project' and (v_payload->>'realPortfolio' is distinct from 'true' or v_payload->>'customerApproved' is distinct from 'true' or v_payload->>'isPlaceholder' is distinct from 'false' or coalesce(length(v_payload->>'approvalReference'),0)=0) then raise exception 'PUBLICATION_DENIED';end if;
   update public.website_content_revisions set state='UNPUBLISHED',updated_at=now() where kind=v_kind and content_key=v_key and state='PUBLISHED' and revision<>v_expected;
   update public.website_content_documents set state='PUBLISHED',published_revision=v_expected where kind=v_kind and content_key=v_key;
   update public.website_content_revisions set state='PUBLISHED',updated_at=now() where kind=v_kind and content_key=v_key and revision=v_expected;
  else
   if v_doc.published_revision is null then raise exception 'STATE_CONFLICT';end if;
   update public.website_content_revisions set state='UNPUBLISHED',updated_at=now() where kind=v_kind and content_key=v_key and revision=v_doc.published_revision;
   update public.website_content_documents set published_revision=null,state=case when revision=v_doc.published_revision then 'UNPUBLISHED' else state end where kind=v_kind and content_key=v_key;
  end if;
  v_audit_revision:=case when p_action='cms-unpublish' then v_doc.published_revision else v_expected end;
  v_result:=jsonb_build_object('key',v_key,'kind',v_kind,'revision',v_expected);
 elsif p_action='profile-save' then
  v_expected:=(p_input->>'expectedVersion')::integer;
  if v_expected is null or v_expected<0 or length(btrim(p_input->>'displayName')) not between 1 and 100 or p_input->>'displayName' is null or (p_input->>'displayName')~'[<>]' then raise exception 'INVALID_INPUT';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_actor::text,2));
  select * into v_profile from public.website_customer_profiles where customer_id=p_actor for update;
  if coalesce(v_profile.version,0)<>v_expected then raise exception 'STATE_CONFLICT';end if;
  insert into public.website_customer_profiles(customer_id,display_name,version) values(p_actor,btrim(p_input->>'displayName'),v_expected+1)
   on conflict(customer_id) do update set display_name=excluded.display_name,version=excluded.version,updated_at=now();
  v_result:=jsonb_build_object('version',v_expected+1);
 else
  if p_action='followup-create' then
   v_kind:=p_input->>'kind';v_ref:=p_input->>'reference';v_question:=p_input->>'message';
   if v_kind is null or v_kind not in ('custom','bulk') or v_ref is null or v_ref !~ '^(CR|BR)-[0-9]{4}-[A-Z0-9]+$' or v_question is null or length(v_question) not between 3 and 2000 or v_question~'[<>]' then raise exception 'INVALID_INPUT';end if;
   if v_kind='custom' then
    select id,status,customer_id into v_target from public.custom_requests where public_request_id=v_ref and submitted_at is not null for update;v_next:='NEEDS_INFORMATION';
   else
    select id,status,customer_id into v_target from public.bulk_requests where public_request_id=v_ref and submitted_at is not null for update;v_next:='MORE_INFORMATION_REQUIRED';
   end if;
   if v_target.id is null then raise exception 'NOT_FOUND';end if;
   if v_target.status is distinct from p_input->>'expectedStatus' or v_target.status not in ('UNDER_REVIEW',v_next) then raise exception 'STATE_CONFLICT';end if;
   if exists(select 1 from public.website_request_followups where kind=v_kind and request_reference=v_ref and state='OPEN') then
    if v_target.status<>'UNDER_REVIEW' then raise exception 'STATE_CONFLICT';end if;
    update public.website_request_followups set state='CLOSED',closed_at=clock_timestamp(),closure_reason='SUPERSEDED' where kind=v_kind and request_reference=v_ref and state='OPEN' returning public_reference into v_id;
    insert into public.website_feature_audit(actor_user_id,action,subject,request_id,followup_reference) values(p_actor,'followup-superseded',v_kind||':'||v_ref,v_request_id,v_id);
   end if;
   insert into public.website_request_followups(kind,request_reference,customer_id,custom_request_id,bulk_request_id,question)
    values(v_kind,v_ref,v_target.customer_id,case when v_kind='custom' then v_target.id end,case when v_kind='bulk' then v_target.id end,v_question) returning public_reference into v_id;
   v_state:=v_target.status;
  else
   -- Read identity first, lock request before follow-up to keep lock order consistent.
   v_id:=(p_input->>'followupReference')::uuid;
   select * into v_follow from public.website_request_followups where public_reference=v_id and customer_id=p_actor;
   if not found then raise exception 'NOT_FOUND';end if;
   v_kind:=v_follow.kind;v_ref:=v_follow.request_reference;
   if v_kind='custom' then select id,status,customer_id into v_target from public.custom_requests where id=v_follow.custom_request_id and customer_id=p_actor for update;v_next:='NEEDS_INFORMATION';
   else select id,status,customer_id into v_target from public.bulk_requests where id=v_follow.bulk_request_id and customer_id=p_actor for update;v_next:='MORE_INFORMATION_REQUIRED';end if;
   select * into v_follow from public.website_request_followups where public_reference=v_id and customer_id=p_actor for update;
   if v_follow.state<>'OPEN' or v_target.status is distinct from v_next then raise exception 'STATE_CONFLICT';end if;
   v_reply:=p_input->>'message';if v_reply is null or length(v_reply) not between 1 and 4000 or v_reply~'[<>]' then raise exception 'INVALID_INPUT';end if;
   update public.website_request_followups set reply=v_reply,state='REPLIED',replied_at=now() where public_reference=v_id;
   v_state:=v_target.status;v_next:='UNDER_REVIEW';
  end if;
  if v_kind='custom' then
   update public.custom_requests set status=v_next where id=v_target.id;
   if v_state is distinct from v_next then
    insert into public.custom_request_events(request_id,event_type,from_status,to_status,public_message)
     values(v_target.id,'STATUS_CHANGED',v_state,v_next,'Request status updated.');
   end if;
   insert into public.custom_request_events(request_id,event_type,from_status,to_status,public_message) values(v_target.id,case when p_action='followup-create' then 'INFORMATION_REQUESTED' else 'CUSTOMER_REPLIED' end,v_state,v_next,'Request information updated.');
  else
   update public.bulk_requests set status=v_next where id=v_target.id;
   if v_state is distinct from v_next then
    insert into public.bulk_request_events(bulk_request_id,event_type,from_status,to_status,public_message)
     values(v_target.id,'STATUS_CHANGED',v_state,v_next,'Request status updated.');
   end if;
   insert into public.bulk_request_events(bulk_request_id,event_type,from_status,to_status,public_message) values(v_target.id,case when p_action='followup-create' then 'INFORMATION_REQUESTED' else 'CUSTOMER_REPLIED' end,v_state,v_next,'Request information updated.');
  end if;
  v_result:=jsonb_build_object('reference',v_id,'status',v_next);
 end if;
 insert into public.website_feature_audit(actor_user_id,action,subject,request_id,content_revision,followup_reference)
 values(p_actor,p_action,case when p_action like 'cms-%' then v_kind||':'||v_key when p_action='profile-save' then 'own-profile' else v_kind||':'||v_ref end,v_request_id,v_audit_revision,case when p_action like 'followup-%' then v_id end);
 insert into public.website_feature_commands(request_id,actor_user_id,action,input_hash,result) values(v_request_id,p_actor,p_action,pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_input::text,'UTF8')),'hex'),v_result);
 return v_result;
end $$;
revoke all on function public.website_features_mutate_server(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.website_features_mutate_server(uuid,text,jsonb) to service_role;
