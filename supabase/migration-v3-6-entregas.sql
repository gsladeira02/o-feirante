-- V3.6 - Clientes e entregas
-- Rode após as migrations anteriores.

-- Garante funções usadas pelas policies, caso alguma migration anterior não tenha sido rodada.
create or replace function public.can_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select ua.is_active from public.user_access ua where ua.user_id = auth.uid()), true);
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select ua.is_active and not ua.read_only from public.user_access ua where ua.user_id = auth.uid()), true);
$$;

grant execute on function public.can_read() to authenticated;
grant execute on function public.can_write() to authenticated;

create table if not exists public.delivery_customers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text not null default '',
  phone text not null default '',
  created_at timestamptz default now()
);

create table if not exists public.deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  customer_id uuid not null references public.delivery_customers(id) on delete cascade,
  delivery_date date not null default current_date,
  status text not null default 'pending',
  created_at timestamptz default now(),
  delivered_at timestamptz
);

create table if not exists public.delivery_items (
  id uuid primary key default gen_random_uuid(),
  delivery_id uuid not null references public.deliveries(id) on delete cascade,
  product_id uuid not null references public.products(id),
  product_name text not null,
  unit text not null,
  quantity numeric not null default 0,
  cost_at_time numeric not null default 0,
  sale_price_at_time numeric not null default 0,
  revenue numeric not null default 0,
  cost numeric not null default 0,
  profit numeric not null default 0
);

alter table public.delivery_customers enable row level security;
alter table public.deliveries enable row level security;
alter table public.delivery_items enable row level security;

drop policy if exists "delivery_customers_select_own" on public.delivery_customers;
drop policy if exists "delivery_customers_insert_own_write" on public.delivery_customers;
drop policy if exists "delivery_customers_update_own_write" on public.delivery_customers;
drop policy if exists "delivery_customers_delete_own_write" on public.delivery_customers;

create policy "delivery_customers_select_own"
on public.delivery_customers
for select
using (auth.uid() = user_id and public.can_read());

create policy "delivery_customers_insert_own_write"
on public.delivery_customers
for insert
with check (auth.uid() = user_id and public.can_write());

create policy "delivery_customers_update_own_write"
on public.delivery_customers
for update
using (auth.uid() = user_id and public.can_write())
with check (auth.uid() = user_id and public.can_write());

create policy "delivery_customers_delete_own_write"
on public.delivery_customers
for delete
using (auth.uid() = user_id and public.can_write());


drop policy if exists "deliveries_select_own" on public.deliveries;
drop policy if exists "deliveries_insert_own_write" on public.deliveries;
drop policy if exists "deliveries_update_own_write" on public.deliveries;
drop policy if exists "deliveries_delete_own_write" on public.deliveries;

create policy "deliveries_select_own"
on public.deliveries
for select
using (auth.uid() = user_id and public.can_read());

create policy "deliveries_insert_own_write"
on public.deliveries
for insert
with check (auth.uid() = user_id and public.can_write());

create policy "deliveries_update_own_write"
on public.deliveries
for update
using (auth.uid() = user_id and public.can_write())
with check (auth.uid() = user_id and public.can_write());

create policy "deliveries_delete_own_write"
on public.deliveries
for delete
using (auth.uid() = user_id and public.can_write());


drop policy if exists "delivery_items_select_own" on public.delivery_items;
drop policy if exists "delivery_items_insert_own_write" on public.delivery_items;
drop policy if exists "delivery_items_update_own_write" on public.delivery_items;
drop policy if exists "delivery_items_delete_own_write" on public.delivery_items;

create policy "delivery_items_select_own"
on public.delivery_items
for select
using (
  public.can_read()
  and exists (
    select 1
    from public.deliveries
    where deliveries.id = delivery_items.delivery_id
    and deliveries.user_id = auth.uid()
  )
);

create policy "delivery_items_insert_own_write"
on public.delivery_items
for insert
with check (
  public.can_write()
  and exists (
    select 1
    from public.deliveries
    where deliveries.id = delivery_items.delivery_id
    and deliveries.user_id = auth.uid()
  )
);

create policy "delivery_items_update_own_write"
on public.delivery_items
for update
using (
  public.can_write()
  and exists (
    select 1
    from public.deliveries
    where deliveries.id = delivery_items.delivery_id
    and deliveries.user_id = auth.uid()
  )
)
with check (
  public.can_write()
  and exists (
    select 1
    from public.deliveries
    where deliveries.id = delivery_items.delivery_id
    and deliveries.user_id = auth.uid()
  )
);

create policy "delivery_items_delete_own_write"
on public.delivery_items
for delete
using (
  public.can_write()
  and exists (
    select 1
    from public.deliveries
    where deliveries.id = delivery_items.delivery_id
    and deliveries.user_id = auth.uid()
  )
);

create index if not exists idx_delivery_customers_user_id on public.delivery_customers(user_id);
create index if not exists idx_deliveries_user_id on public.deliveries(user_id);
create index if not exists idx_deliveries_customer_id on public.deliveries(customer_id);
create index if not exists idx_delivery_items_delivery_id on public.delivery_items(delivery_id);
