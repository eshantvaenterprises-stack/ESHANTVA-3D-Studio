create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  public_reference text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  request_kind text not null check (request_kind in ('CONTACT','APPOINTMENT')),
  reason text not null check (reason in ('general_business','product_question','custom_order_question','bulk_order_question','appointment_request','existing_order_request','collaboration_business','other')),
  name text not null check (char_length(name) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  order_reference text check (order_reference is null or char_length(order_reference) <= 80),
  message text check (message is null or char_length(message) <= 3000),
  appointment_purpose text check (appointment_purpose is null or char_length(appointment_purpose) <= 240),
  preferred_date date,
  preferred_period text check (preferred_period is null or preferred_period in ('morning','afternoon','evening','specific_time')),
  preferred_time time,
  source text not null default 'website-contact' check (source = 'website-contact'),
  page text not null default '/contact' check (page = '/contact'),
  status text not null check (status in ('RECEIVED','UNDER_REVIEW','REQUESTED','CONFIRMED','RESCHEDULE_REQUESTED','DECLINED','CANCELLED','COMPLETED')),
  submitted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (request_kind = 'CONTACT' and preferred_date is null and preferred_period is null and preferred_time is null)
    or
    (request_kind = 'APPOINTMENT' and reason = 'appointment_request' and appointment_purpose is not null and preferred_date is not null and preferred_period is not null)
  ),
  check (preferred_period is distinct from 'specific_time' or preferred_time is not null),
  check (preferred_period = 'specific_time' or preferred_time is null)
);

create table if not exists public.contact_request_events (
  id bigint generated always as identity primary key,
  contact_request_id uuid references public.contact_requests(id) on delete cascade,
  event_type text not null,
  actor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists contact_requests_customer_created_idx on public.contact_requests(customer_id, created_at desc);
create index if not exists contact_requests_status_created_idx on public.contact_requests(status, created_at desc);
create index if not exists contact_request_events_rate_idx on public.contact_request_events(actor_hash, created_at desc) where event_type = 'SUBMISSION_ATTEMPT';
create index if not exists contact_request_events_request_idx on public.contact_request_events(contact_request_id) where contact_request_id is not null;

create or replace function public.set_contact_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_contact_updated_at() from public, anon, authenticated;
drop trigger if exists contact_requests_updated_at on public.contact_requests;
create trigger contact_requests_updated_at before update on public.contact_requests for each row execute function public.set_contact_updated_at();

alter table public.contact_requests enable row level security;
alter table public.contact_requests force row level security;
alter table public.contact_request_events enable row level security;
alter table public.contact_request_events force row level security;

-- No direct browser read/write policies are intentionally created.
-- Public form writes and future admin reads must be mediated by trusted server/Edge code.
revoke all on table public.contact_requests from anon, authenticated;
revoke all on table public.contact_request_events from anon, authenticated;
