-- O Feirante V3.4
-- Controle de plano, vencimento e bloqueio automático após 3 dias de atraso.

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  read_only boolean not null default false,
  is_active boolean not null default true,
  label text,
  created_at timestamptz default now()
);

alter table public.user_access add column if not exists plan_id text;
alter table public.user_access add column if not exists plan_name text;
alter table public.user_access add column if not exists billing_interval_months integer;
alter table public.user_access add column if not exists subscription_status text not null default 'manual';
alter table public.user_access add column if not exists current_period_start timestamptz;
alter table public.user_access add column if not exists current_period_end timestamptz;
alter table public.user_access add column if not exists grace_until timestamptz;
alter table public.user_access add column if not exists last_payment_at timestamptz;
alter table public.user_access add column if not exists infinitepay_subscription_id text;
alter table public.user_access add column if not exists updated_at timestamptz not null default now();

alter table public.user_access enable row level security;

do $$
begin
  alter table public.user_access
    add constraint user_access_plan_id_check
    check (plan_id is null or plan_id in ('mensal','trimestral','semestral','anual'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.user_access
    add constraint user_access_subscription_status_check
    check (subscription_status in ('manual','pending','active','past_due','canceled','expired','demo'));
exception when duplicate_object then null;
end $$;

create table if not exists public.customer_signups (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  cpf text not null,
  birth_date date not null,
  phone text not null,
  city text not null,
  state text not null,
  stall_name text not null,
  cnpj text,
  plan_id text not null,
  plan_name text not null,
  amount_cents integer not null,
  billing_interval_months integer not null default 1,
  order_nsu text not null unique,
  infinitepay_url text,
  infinitepay_subscription_id text,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_signups_plan_id_check check (plan_id in ('mensal','trimestral','semestral','anual'))
);

alter table public.customer_signups add column if not exists billing_interval_months integer not null default 1;
alter table public.customer_signups add column if not exists infinitepay_subscription_id text;
alter table public.customer_signups enable row level security;

drop policy if exists "customer_signups_insert_public" on public.customer_signups;
create policy "customer_signups_insert_public"
on public.customer_signups
for insert
to anon, authenticated
with check (true);

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists cnpj text;
alter table public.profiles add column if not exists plan_id text;
alter table public.profiles add column if not exists subscription_status text not null default 'manual';

-- Retorna verdadeiro somente se a conta pode acessar o sistema.
-- Regra: se current_period_end passou, ainda libera até grace_until.
-- Se grace_until estiver vazio, usa current_period_end + 3 dias.
create or replace function public.subscription_allows_access(target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      ua.is_active
      and (
        ua.read_only = true
        or ua.subscription_status in ('manual','active','demo')
        or (
          ua.subscription_status = 'past_due'
          and now() <= coalesce(ua.grace_until, ua.current_period_end + interval '3 days')
        )
        or (
          ua.current_period_end is not null
          and now() <= coalesce(ua.grace_until, ua.current_period_end + interval '3 days')
        )
      )
    from public.user_access ua
    where ua.user_id = target_user
  ), true);
$$;

create or replace function public.can_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.subscription_allows_access(auth.uid());
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select
      public.subscription_allows_access(auth.uid())
      and ua.read_only = false
    from public.user_access ua
    where ua.user_id = auth.uid()
  ), true);
$$;

grant execute on function public.subscription_allows_access(uuid) to authenticated;
grant execute on function public.can_read() to authenticated;
grant execute on function public.can_write() to authenticated;

-- Remove policies antigas e recria com can_read/can_write
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.fair_places enable row level security;
alter table public.products enable row level security;
alter table public.purchases enable row level security;
alter table public.fairs enable row level security;
alter table public.fair_items enable row level security;

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
  public.can_read() and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
create policy "fair_items_insert_own_write" on public.fair_items for insert with check (
  public.can_write() and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
create policy "fair_items_update_own_write" on public.fair_items for update using (
  public.can_write() and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
) with check (
  public.can_write() and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);
create policy "fair_items_delete_own_write" on public.fair_items for delete using (
  public.can_write() and exists (select 1 from public.fairs where fairs.id = fair_items.fair_id and fairs.user_id = auth.uid())
);

-- Mantém a conta demo bloqueada, mas ativa para visualização.
insert into public.user_access (
  user_id, read_only, is_active, label, subscription_status, plan_id, plan_name
)
values (
  '4cfdc4be-5aab-480a-8d84-0c222bac0dd1', true, true,
  'Conta de demonstração bloqueada', 'demo', null, 'Demonstração'
)
on conflict (user_id) do update set
  read_only = true,
  is_active = true,
  label = 'Conta de demonstração bloqueada',
  subscription_status = 'demo',
  updated_at = now();

-- Exemplo para ativar um cliente real após pagamento:
-- update public.user_access
-- set is_active = true,
--     read_only = false,
--     plan_id = 'mensal',
--     plan_name = 'Mensal',
--     billing_interval_months = 1,
--     subscription_status = 'active',
--     current_period_start = now(),
--     current_period_end = now() + interval '1 month',
--     grace_until = now() + interval '1 month' + interval '3 days',
--     last_payment_at = now(),
--     updated_at = now()
-- where user_id = 'UID_DO_CLIENTE';
