-- O Feirante V3.5
-- Painel Admin privado, registro de acessos e controle de clientes.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists cnpj text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists access_count integer not null default 0;

create table if not exists public.user_login_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  email text,
  event_type text not null default 'app_access',
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.user_login_events enable row level security;

-- Função interna: verifica se o usuário logado é admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select p.is_admin
    from public.profiles p
    where p.id = auth.uid()
  ), false);
$$;

grant execute on function public.is_admin() to authenticated;

-- Registra acesso/uso do app. Funciona mesmo para conta demo/read_only.
create or replace function public.record_app_access(client_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
begin
  select email into current_email from auth.users where id = auth.uid();

  insert into public.user_login_events (user_id, email, event_type, user_agent)
  values (auth.uid(), current_email, 'app_access', client_user_agent);

  update public.profiles
  set
    email = coalesce(public.profiles.email, current_email),
    last_seen_at = now(),
    access_count = coalesce(access_count, 0) + 1
  where id = auth.uid();
end;
$$;

grant execute on function public.record_app_access(text) to authenticated;

-- Lista clientes para o painel admin.
create or replace function public.admin_list_clients()
returns table (
  user_id uuid,
  email text,
  name text,
  full_name text,
  stall_name text,
  city text,
  state text,
  phone text,
  is_admin boolean,
  first_login boolean,
  profile_created_at timestamptz,
  last_seen_at timestamptz,
  access_count integer,
  read_only boolean,
  is_active boolean,
  label text,
  plan_id text,
  plan_name text,
  billing_interval_months integer,
  subscription_status text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  grace_until timestamptz,
  last_payment_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    coalesce(p.email, au.email) as email,
    p.name,
    p.full_name,
    p.stall_name,
    p.city,
    p.state,
    p.phone,
    coalesce(p.is_admin, false) as is_admin,
    p.first_login,
    p.created_at as profile_created_at,
    p.last_seen_at,
    coalesce(p.access_count, 0) as access_count,
    coalesce(ua.read_only, false) as read_only,
    coalesce(ua.is_active, true) as is_active,
    ua.label,
    ua.plan_id,
    ua.plan_name,
    ua.billing_interval_months,
    coalesce(ua.subscription_status, 'manual') as subscription_status,
    ua.current_period_start,
    ua.current_period_end,
    ua.grace_until,
    ua.last_payment_at,
    ua.updated_at
  from public.profiles p
  left join auth.users au on au.id = p.id
  left join public.user_access ua on ua.user_id = p.id
  where public.is_admin()
  order by coalesce(p.last_seen_at, p.created_at) desc nulls last;
$$;

grant execute on function public.admin_list_clients() to authenticated;

-- Atualiza acesso/plano de cliente pelo painel admin.
create or replace function public.admin_update_client_access(
  target_user_id uuid,
  new_is_active boolean,
  new_read_only boolean,
  new_subscription_status text,
  new_plan_id text default null,
  new_plan_name text default null,
  new_billing_interval_months integer default null,
  new_current_period_end timestamptz default null,
  new_label text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Acesso negado.';
  end if;

  insert into public.user_access (
    user_id,
    is_active,
    read_only,
    subscription_status,
    plan_id,
    plan_name,
    billing_interval_months,
    current_period_start,
    current_period_end,
    grace_until,
    label,
    updated_at
  )
  values (
    target_user_id,
    coalesce(new_is_active, true),
    coalesce(new_read_only, false),
    coalesce(new_subscription_status, 'manual'),
    new_plan_id,
    new_plan_name,
    new_billing_interval_months,
    case when new_current_period_end is not null then now() else null end,
    new_current_period_end,
    case when new_current_period_end is not null then new_current_period_end + interval '3 days' else null end,
    new_label,
    now()
  )
  on conflict (user_id) do update set
    is_active = excluded.is_active,
    read_only = excluded.read_only,
    subscription_status = excluded.subscription_status,
    plan_id = excluded.plan_id,
    plan_name = excluded.plan_name,
    billing_interval_months = excluded.billing_interval_months,
    current_period_start = coalesce(public.user_access.current_period_start, excluded.current_period_start),
    current_period_end = excluded.current_period_end,
    grace_until = excluded.grace_until,
    label = excluded.label,
    updated_at = now();
end;
$$;

grant execute on function public.admin_update_client_access(uuid, boolean, boolean, text, text, text, integer, timestamptz, text) to authenticated;

-- Policies para leitura do próprio acesso e para admin via RPC.
do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('user_login_events')
  loop
    execute format('drop policy if exists %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

create policy "login_events_select_admin"
on public.user_login_events
for select
using (public.is_admin());

-- Tenta marcar Gabriel como admin automaticamente, se o e-mail existir no Auth.
update public.profiles
set is_admin = true,
    email = coalesce(email, 'gabriel.ladeira2003@gmail.com')
where id = (
  select id from auth.users where email = 'gabriel.ladeira2003@gmail.com' limit 1
);

-- Se seu usuário admin tiver outro e-mail, rode no SQL Editor:
-- update public.profiles set is_admin = true where id = 'SEU_UID_AQUI';

-- Lista cadastros feitos na tela de planos antes da criação do usuário.
create or replace function public.admin_list_signups()
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  city text,
  state text,
  stall_name text,
  cnpj text,
  plan_id text,
  plan_name text,
  amount_cents integer,
  payment_status text,
  infinitepay_url text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    cs.id,
    cs.full_name,
    cs.email,
    cs.phone,
    cs.city,
    cs.state,
    cs.stall_name,
    cs.cnpj,
    cs.plan_id,
    cs.plan_name,
    cs.amount_cents,
    cs.payment_status,
    cs.infinitepay_url,
    cs.created_at
  from public.customer_signups cs
  where public.is_admin()
  order by cs.created_at desc
  limit 80;
$$;

grant execute on function public.admin_list_signups() to authenticated;
