-- O Feirante V3.2
-- Controle de acesso para contas ativas/inativas e contas demo somente leitura.

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  read_only boolean not null default false,
  is_active boolean not null default true,
  label text,
  created_at timestamptz default now()
);

alter table public.user_access enable row level security;

-- Remove policies antigas que podem permitir escrita indevida.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
    and tablename in ('profiles','categories','fair_places','products','purchases','fairs','fair_items','user_access')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

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

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.fair_places enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.fairs enable row level security;
alter table public.fair_items enable row level security;

create policy "user_access_select_own" on public.user_access for select using (auth.uid() = user_id);

create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id and public.can_read());
create policy "profiles_insert_own_write" on public.profiles for insert with check (auth.uid() = id and public.can_write());
create policy "profiles_update_own_write" on public.profiles for update using (auth.uid() = id and public.can_write()) with check (auth.uid() = id and public.can_write());

create policy "categories_select_own" on public.categories for select using (auth.uid() = user_id and public.can_read());
create policy "categories_insert_own_write" on public.categories for insert with check (auth.uid() = user_id and public.can_write());
create policy "categories_update_own_write" on public.categories for update using (auth.uid() = user_id and public.can_write()) with check (auth.uid() = user_id and public.can_write());
create policy "categories_delete_own_write" on public.categories for delete using (auth.uid() = user_id and public.can_write());

create policy "fair_places_select_own" on public.fair_places for select using (auth.uid() = user_id and public.can_read());
create policy "fair_places_insert_own_write" on public.fair_places for insert with check (auth.uid() = user_id and public.can_write());
create policy "fair_places_update_own_write" on public.fair_places for update using (auth.uid() = user_id and public.can_write()) with check (auth.uid() = user_id and public.can_write());
create policy "fair_places_delete_own_write" on public.fair_places for delete using (auth.uid() = user_id and public.can_write());

create policy "products_select_own" on public.products for select using (auth.uid() = user_id and public.can_read());
create policy "products_insert_own_write" on public.products for insert with check (auth.uid() = user_id and public.can_write());
create policy "products_update_own_write" on public.products for update using (auth.uid() = user_id and public.can_write()) with check (auth.uid() = user_id and public.can_write());
create policy "products_delete_own_write" on public.products for delete using (auth.uid() = user_id and public.can_write());

create policy "purchases_select_own" on public.purchases for select using (auth.uid() = user_id and public.can_read());
create policy "purchases_insert_own_write" on public.purchases for insert with check (auth.uid() = user_id and public.can_write());
create policy "purchases_update_own_write" on public.purchases for update using (auth.uid() = user_id and public.can_write()) with check (auth.uid() = user_id and public.can_write());
create policy "purchases_delete_own_write" on public.purchases for delete using (auth.uid() = user_id and public.can_write());

create policy "fairs_select_own" on public.fairs for select using (auth.uid() = user_id and public.can_read());
create policy "fairs_insert_own_write" on public.fairs for insert with check (auth.uid() = user_id and public.can_write());
create policy "fairs_update_own_write" on public.fairs for update using (auth.uid() = user_id and public.can_write()) with check (auth.uid() = user_id and public.can_write());
create policy "fairs_delete_own_write" on public.fairs for delete using (auth.uid() = user_id and public.can_write());

create policy "fair_items_select_own" on public.fair_items for select using (
  public.can_read()
  and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
create policy "fair_items_insert_own_write" on public.fair_items for insert with check (
  public.can_write()
  and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
create policy "fair_items_update_own_write" on public.fair_items for update using (
  public.can_write()
  and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
) with check (
  public.can_write()
  and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
create policy "fair_items_delete_own_write" on public.fair_items for delete using (
  public.can_write()
  and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);

-- Mantém a conta teste conhecida como demonstração bloqueada.
insert into public.user_access (user_id, read_only, is_active, label)
values ('4cfdc4be-5aab-480a-8d84-0c222bac0dd1', true, true, 'Conta de demonstração bloqueada')
on conflict (user_id) do update set
  read_only = true,
  is_active = true,
  label = 'Conta de demonstração bloqueada';
