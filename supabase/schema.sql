-- O Feirante V1 - Supabase Schema

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  stall_name text,
  city text,
  created_at timestamptz default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  category text,
  unit text not null default 'kg',
  stock numeric not null default 0,
  average_cost numeric not null default 0,
  sale_price numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  quantity numeric not null default 0,
  total_value numeric not null default 0,
  supplier text,
  created_at timestamptz default now()
);

create table if not exists fairs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  status text not null default 'active',
  revenue_total numeric not null default 0,
  cost_total numeric not null default 0,
  profit_total numeric not null default 0,
  loss_total numeric not null default 0,
  created_at timestamptz default now(),
  closed_at timestamptz
);

create table if not exists fair_items (
  id uuid primary key default gen_random_uuid(),
  fair_id uuid not null references fairs(id) on delete cascade,
  product_id uuid not null references products(id),
  product_name text not null,
  unit text not null,
  cost_at_time numeric not null default 0,
  sale_price_at_time numeric not null default 0,
  quantity_taken numeric not null default 0,
  quantity_returned numeric not null default 0,
  quantity_lost numeric not null default 0,
  quantity_sold numeric not null default 0,
  revenue numeric not null default 0,
  cost numeric not null default 0,
  profit numeric not null default 0,
  loss_value numeric not null default 0
);

alter table profiles enable row level security;
alter table products enable row level security;
alter table purchases enable row level security;
alter table fairs enable row level security;
alter table fair_items enable row level security;

create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

create policy "products_all_own" on products for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "purchases_all_own" on purchases for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "fairs_all_own" on fairs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "fair_items_select_own" on fair_items
for select using (
  exists (select 1 from fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);

create policy "fair_items_insert_own" on fair_items
for insert with check (
  exists (select 1 from fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);

create policy "fair_items_update_own" on fair_items
for update using (
  exists (select 1 from fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);

create policy "fair_items_delete_own" on fair_items
for delete using (
  exists (select 1 from fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
