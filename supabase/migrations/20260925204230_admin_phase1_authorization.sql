create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete restrict,
  role text not null check (role in ('ADMIN','STAFF')),
  active boolean not null default true,
  display_name text check (display_name is null or char_length(display_name) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_access_events (
  id bigint generated always as identity primary key,
  admin_user_id uuid not null references public.admin_users(user_id) on delete restrict,
  role_snapshot text not null check (role_snapshot in ('ADMIN','STAFF')),
  event_type text not null check (event_type in ('AUTHORIZED_LOGIN','SIGN_OUT')),
  created_at timestamptz not null default now()
);

create index if not exists admin_users_active_role_idx on public.admin_users(active, role);
create index if not exists admin_access_events_admin_created_idx on public.admin_access_events(admin_user_id, created_at desc);

create or replace function public.set_admin_user_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function public.set_admin_user_updated_at() from public, anon, authenticated;
drop trigger if exists admin_users_updated_at on public.admin_users;
create trigger admin_users_updated_at before update on public.admin_users for each row execute function public.set_admin_user_updated_at();

alter table public.admin_users enable row level security;
alter table public.admin_users force row level security;
alter table public.admin_access_events enable row level security;
alter table public.admin_access_events force row level security;
revoke all on table public.admin_users, public.admin_access_events from anon, authenticated;
