create index if not exists admin_artifact_uploads_order_status_idx on public.admin_artifact_uploads(order_id,status,created_at desc);
create index if not exists admin_artifact_uploads_admin_created_idx on public.admin_artifact_uploads(admin_user_id,created_at desc);
create index if not exists admin_artifact_action_events_admin_created_idx on public.admin_artifact_action_events(admin_user_id,created_at desc);
create index if not exists admin_artifact_action_events_order_created_idx on public.admin_artifact_action_events(order_id,created_at desc);
create index if not exists admin_artifact_action_events_upload_intent_idx on public.admin_artifact_action_events(upload_intent_id) where upload_intent_id is not null;
create index if not exists admin_artifact_action_events_artifact_idx on public.admin_artifact_action_events(artifact_id) where artifact_id is not null;
create index if not exists admin_artifact_action_events_approval_idx on public.admin_artifact_action_events(approval_request_id) where approval_request_id is not null;
