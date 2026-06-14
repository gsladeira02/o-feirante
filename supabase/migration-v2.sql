create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

create table if not exists fair_places (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text,
  weekday text,
  created_at timestamptz default now(),
  unique(user_id, name)
);

alter table profiles add column if not exists first_login boolean not null default true;
alter table products add column if not exists category_id uuid references categories(id) on delete set null;
alter table fairs add column if not exists fair_place_id uuid references fair_places(id) on delete set null;

alter table categories enable row level security;
alter table fair_places enable row level security;

drop policy if exists "categories_all_own" on categories;
create policy "categories_all_own" on categories
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fair_places_all_own" on fair_places;
create policy "fair_places_all_own" on fair_places
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
