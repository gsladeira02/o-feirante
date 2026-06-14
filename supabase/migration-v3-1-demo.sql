-- O Feirante V3.1 - controle de conta demo / somente leitura
-- Rode este arquivo se ainda não criou a tabela user_access e as policies de bloqueio.

create table if not exists public.user_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  read_only boolean not null default false,
  is_active boolean not null default true,
  label text,
  created_at timestamptz default now()
);

alter table public.user_access enable row level security;

drop policy if exists "user_access_select_own" on public.user_access;
create policy "user_access_select_own"
on public.user_access
for select
using (auth.uid() = user_id);

create or replace function public.can_read()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ua.is_active from public.user_access ua where ua.user_id = auth.uid()),
    true
  );
$$;

create or replace function public.can_write()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select ua.is_active and not ua.read_only from public.user_access ua where ua.user_id = auth.uid()),
    true
  );
$$;

grant execute on function public.can_read() to authenticated;
grant execute on function public.can_write() to authenticated;

-- Para bloquear a conta teste atual:
insert into public.user_access (user_id, read_only, is_active, label)
values (
  '4cfdc4be-5aab-480a-8d84-0c222bac0dd1',
  true,
  true,
  'Conta de demonstração bloqueada'
)
on conflict (user_id) do update set
  read_only = true,
  is_active = true,
  label = 'Conta de demonstração bloqueada';
