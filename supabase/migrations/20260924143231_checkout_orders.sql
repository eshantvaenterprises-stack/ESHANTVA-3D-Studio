create table if not exists public.commerce_products (
  product_id text primary key,
  slug text not null unique,
  sku text not null,
  title text not null,
  currency text not null default 'INR' check (currency = 'INR'),
  base_unit_price_paise bigint not null check (base_unit_price_paise >= 0),
  active boolean not null default false,
  purchasable boolean not null default false,
  is_sample boolean not null default false,
  public_availability text not null check (public_availability in ('in_stock','limited','made_to_order','on_request','out_of_stock')),
  order_mode text not null check (order_mode in ('direct_purchase','configurable_purchase','request_only')),
  minimum_quantity integer not null default 1 check (minimum_quantity >= 1),
  maximum_quantity integer check (maximum_quantity is null or maximum_quantity >= minimum_quantity),
  configuration_schema jsonb not null default '[]'::jsonb check (jsonb_typeof(configuration_schema) = 'array'),
  tax_rate_bps integer check (tax_rate_bps is null or tax_rate_bps between 0 and 10000),
  price_includes_tax boolean,
  catalog_version integer not null default 1 check (catalog_version >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  public_order_id text not null unique check (public_order_id ~ '^ESHA-[0-9]{4}-[A-Z0-9]{8}$'),
  customer_id uuid not null references auth.users(id) on delete restrict,
  idempotency_key uuid not null,
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  status text not null default 'pending_payment' check (status in ('pending_payment','payment_processing','paid','under_review','confirmed','in_production','ready_for_pickup','shipped','delivered','cancelled','refunded')),
  payment_status text not null default 'not_started' check (payment_status in ('not_started','pending','processing','paid','failed','cancelled','refunded')),
  currency text not null default 'INR' check (currency = 'INR'),
  item_subtotal_paise bigint not null check (item_subtotal_paise >= 0),
  shipping_paise bigint not null check (shipping_paise >= 0),
  tax_amount_paise bigint not null check (tax_amount_paise >= 0),
  tax_added_paise bigint not null check (tax_added_paise >= 0),
  total_paise bigint not null check (total_paise >= 0),
  delivery_method text not null check (delivery_method in ('pickup','local_delivery','shipping')),
  delivery_label text not null,
  tax_label text not null,
  contact_name text not null,
  contact_email text not null,
  contact_mobile text not null,
  company_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz,
  unique (customer_id, idempotency_key),
  check (total_paise = item_subtotal_paise + shipping_paise + tax_added_paise)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  product_id text not null, product_slug text not null, sku_snapshot text not null, title_snapshot text not null,
  configuration_signature text not null, options_snapshot jsonb not null default '[]'::jsonb check (jsonb_typeof(options_snapshot) = 'array'),
  quantity integer not null check (quantity >= 1), unit_price_paise bigint not null check (unit_price_paise >= 0), line_subtotal_paise bigint not null check (line_subtotal_paise >= 0),
  tax_rate_bps integer check (tax_rate_bps is null or tax_rate_bps between 0 and 10000), price_includes_tax boolean, catalog_version integer not null check (catalog_version >= 1),
  created_at timestamptz not null default now(), check (line_subtotal_paise = unit_price_paise * quantity)
);
create table if not exists public.order_addresses (
  order_id uuid primary key references public.orders(id) on delete cascade, recipient_name text not null, mobile text not null,
  address_line_1 text not null, address_line_2 text, locality text not null, city text not null, district text not null, state text not null,
  pin_code text not null check (pin_code ~ '^[1-9][0-9]{5}$'), country text not null default 'India' check (country = 'India'), created_at timestamptz not null default now()
);
create table if not exists public.order_events (
  id bigint generated always as identity primary key, order_id uuid not null references public.orders(id) on delete cascade, event_type text not null,
  from_status text, to_status text, internal_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(internal_metadata) = 'object'), created_at timestamptz not null default now()
);
create table if not exists public.order_payments (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete restrict, provider text not null, provider_session_id text not null,
  redirect_url text, amount_paise bigint not null check (amount_paise >= 0), currency text not null default 'INR' check (currency = 'INR'),
  status text not null check (status in ('initiated','processing','paid','failed','cancelled','refunded')), idempotency_key text not null unique, provider_payment_id text,
  confirmed_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (provider, provider_session_id)
);
create table if not exists public.checkout_attempts (
  id bigint generated always as identity primary key, customer_id uuid not null references auth.users(id) on delete cascade,
  actor_hash text not null check (char_length(actor_hash) = 64), action text not null check (action in ('review-checkout','prepare-checkout','get-order-status')), created_at timestamptz not null default now()
);

create index if not exists commerce_products_checkout_idx on public.commerce_products(active, purchasable, is_sample, slug);
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists order_events_order_created_idx on public.order_events(order_id, created_at desc);
create index if not exists order_payments_order_created_idx on public.order_payments(order_id, created_at desc);
create index if not exists checkout_attempts_rate_idx on public.checkout_attempts(customer_id, actor_hash, action, created_at desc);

create or replace function public.set_order_updated_at() returns trigger language plpgsql security invoker set search_path = '' as $$ begin new.updated_at = now(); return new; end; $$;
revoke all on function public.set_order_updated_at() from public, anon, authenticated;
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute function public.set_order_updated_at();
drop trigger if exists order_payments_updated_at on public.order_payments;
create trigger order_payments_updated_at before update on public.order_payments for each row execute function public.set_order_updated_at();

alter table public.commerce_products enable row level security; alter table public.commerce_products force row level security;
alter table public.orders enable row level security; alter table public.orders force row level security;
alter table public.order_items enable row level security; alter table public.order_items force row level security;
alter table public.order_addresses enable row level security; alter table public.order_addresses force row level security;
alter table public.order_events enable row level security; alter table public.order_events force row level security;
alter table public.order_payments enable row level security; alter table public.order_payments force row level security;
alter table public.checkout_attempts enable row level security; alter table public.checkout_attempts force row level security;
revoke all on table public.commerce_products, public.orders, public.order_items, public.order_addresses, public.order_events, public.order_payments, public.checkout_attempts from anon, authenticated;

create or replace function public.create_checkout_order_server(p_customer_id uuid,p_idempotency_key uuid,p_request_hash text,p_public_order_id text,p_checkout jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_existing public.orders%rowtype; v_order_id uuid; v_contact jsonb := p_checkout->'contact'; v_address jsonb := p_checkout->'address'; v_totals jsonb := p_checkout->'totals'; v_shipping jsonb := p_checkout->'shipping'; v_tax jsonb := p_checkout->'tax'; v_item jsonb;
begin
  if p_request_hash !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_REQUEST_HASH'; end if;
  select * into v_existing from public.orders where customer_id=p_customer_id and idempotency_key=p_idempotency_key limit 1;
  if found then if v_existing.request_hash<>p_request_hash then raise exception 'IDEMPOTENCY_KEY_REUSED'; end if; return jsonb_build_object('order_id',v_existing.id,'public_order_id',v_existing.public_order_id,'created',false); end if;
  insert into public.orders(public_order_id,customer_id,idempotency_key,request_hash,status,payment_status,currency,item_subtotal_paise,shipping_paise,tax_amount_paise,tax_added_paise,total_paise,delivery_method,delivery_label,tax_label,contact_name,contact_email,contact_mobile,company_name)
  values(p_public_order_id,p_customer_id,p_idempotency_key,p_request_hash,'pending_payment','not_started','INR',(v_totals->>'itemSubtotalPaise')::bigint,(v_totals->>'shippingPaise')::bigint,(v_totals->>'taxAmountPaise')::bigint,(v_totals->>'taxAddedPaise')::bigint,(v_totals->>'totalPaise')::bigint,p_checkout->>'deliveryMethod',v_shipping->>'label',v_tax->>'label',v_contact->>'fullName',lower(v_contact->>'email'),v_contact->>'mobile',nullif(v_contact->>'companyName','')) returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_checkout->'items') loop
    insert into public.order_items(order_id,product_id,product_slug,sku_snapshot,title_snapshot,configuration_signature,options_snapshot,quantity,unit_price_paise,line_subtotal_paise,tax_rate_bps,price_includes_tax,catalog_version)
    values(v_order_id,v_item->>'productId',v_item->>'slug',v_item->>'sku',v_item->>'title',v_item->>'configurationSignature',coalesce(v_item->'selectedOptions','[]'::jsonb),(v_item->>'quantity')::integer,(v_item->>'unitPricePaise')::bigint,(v_item->>'lineSubtotalPaise')::bigint,nullif(v_item->>'taxRateBps','')::integer,nullif(v_item->>'priceIncludesTax','')::boolean,(v_item->>'catalogVersion')::integer);
  end loop;
  if (p_checkout->>'deliveryMethod')<>'pickup' and v_address is not null and jsonb_typeof(v_address)='object' then
    insert into public.order_addresses(order_id,recipient_name,mobile,address_line_1,address_line_2,locality,city,district,state,pin_code,country)
    values(v_order_id,v_address->>'recipientName',v_address->>'mobile',v_address->>'addressLine1',nullif(v_address->>'addressLine2',''),v_address->>'locality',v_address->>'city',v_address->>'district',v_address->>'state',v_address->>'pinCode',v_address->>'country');
  end if;
  insert into public.order_events(order_id,event_type,to_status,internal_metadata) values(v_order_id,'order_created','pending_payment',jsonb_build_object('delivery_method',p_checkout->>'deliveryMethod'));
  return jsonb_build_object('order_id',v_order_id,'public_order_id',p_public_order_id,'created',true);
end; $$;
revoke all on function public.create_checkout_order_server(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.create_checkout_order_server(uuid,uuid,text,text,jsonb) to service_role;
