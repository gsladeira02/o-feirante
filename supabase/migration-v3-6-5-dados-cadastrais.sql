-- O Feirante V3.6.5
-- Permite manter dados cadastrais completos no perfil do usuário.

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists cpf text;
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists state text;
alter table public.profiles add column if not exists cnpj text;
alter table public.profiles add column if not exists is_admin boolean not null default false;
alter table public.profiles add column if not exists last_seen_at timestamptz;
alter table public.profiles add column if not exists access_count integer not null default 0;

-- Garante que usuários comuns possam atualizar apenas o próprio perfil,
-- respeitando a regra de conta ativa/demo definida pela função can_write().
drop policy if exists "profiles_update_own_write" on public.profiles;
create policy "profiles_update_own_write"
on public.profiles
for update
using (auth.uid() = id and public.can_write())
with check (auth.uid() = id and public.can_write());

-- E-mail administrador atual informado para o painel de Gestão.
insert into public.profiles (id, name, stall_name, city, first_login, is_admin, email)
select id, 'Administrador', 'O Feirante', '', false, true, 'gsousaladeira@icloud.com'
from auth.users
where email = 'gsousaladeira@icloud.com'
on conflict (id) do update set
  is_admin = true,
  email = 'gsousaladeira@icloud.com',
  first_login = false;

update public.profiles
set is_admin = false
where id in (
  select id from auth.users where email = 'gabriel.ladeira2003@gmail.com'
);
