-- ESHANTVA Pages 4, 5 and 12: make public Data API privileges explicit.
-- Edge Functions own mutations. Authenticated users may only read the
-- customer-facing rows that already have owner-scoped RLS SELECT policies.

revoke all on table
  public.custom_requests,
  public.custom_request_specifications,
  public.custom_request_files,
  public.custom_request_events,
  public.custom_request_messages,
  public.bulk_requests,
  public.bulk_request_items,
  public.bulk_request_files,
  public.bulk_request_events,
  public.bulk_quotations
from anon;

revoke insert, update, delete, truncate, references, trigger on table
  public.custom_requests,
  public.custom_request_specifications,
  public.custom_request_files,
  public.custom_request_events,
  public.custom_request_messages,
  public.bulk_requests,
  public.bulk_request_items,
  public.bulk_request_files,
  public.bulk_request_events,
  public.bulk_quotations
from authenticated;

revoke select on table
  public.custom_request_events,
  public.bulk_request_events,
  public.bulk_quotations
from authenticated;

grant select on table
  public.custom_requests,
  public.custom_request_specifications,
  public.custom_request_files,
  public.custom_request_messages,
  public.bulk_requests,
  public.bulk_request_items,
  public.bulk_request_files
to authenticated;

revoke all on function public.set_custom_request_updated_at() from public, anon, authenticated;
revoke all on function public.set_bulk_updated_at() from public, anon, authenticated;
revoke all on function public.set_contact_updated_at() from public, anon, authenticated;

create index if not exists custom_request_specifications_customer_idx
  on public.custom_request_specifications(customer_id);
create index if not exists custom_request_messages_customer_idx
  on public.custom_request_messages(customer_id);
create index if not exists bulk_request_items_customer_idx
  on public.bulk_request_items(customer_id);
create index if not exists bulk_request_files_customer_idx
  on public.bulk_request_files(customer_id);
