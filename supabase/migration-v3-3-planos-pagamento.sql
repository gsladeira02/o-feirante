-- O Feirante V3.3
-- Cadastro comercial e integração com checkout InfinitePay.

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
  order_nsu text not null unique,
  infinitepay_url text,
  payment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customer_signups_plan_id_check check (plan_id in ('mensal','trimestral','semestral','anual'))
);

alter table public.customer_signups enable row level security;

drop policy if exists "customer_signups_insert_public" on public.customer_signups;
create policy "customer_signups_insert_public"
on public.customer_signups
for insert
to anon, authenticated
with check (true);

-- Não criamos policy de SELECT para anon/authenticated: os cadastros ficam visíveis apenas pelo painel/admin do Supabase.

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists cnpj text;
alter table public.profiles add column if not exists plan_id text;
alter table public.profiles add column if not exists subscription_status text not null default 'manual';
