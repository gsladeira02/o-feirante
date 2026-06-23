-- O Feirante V3.7
-- Migração para trocar InfinitePay por Stripe Billing / Checkout em modo assinatura.
-- Rode no Supabase SQL Editor depois de subir a versão V3.7.

alter table public.user_access add column if not exists stripe_customer_id text;
alter table public.user_access add column if not exists stripe_subscription_id text;
alter table public.user_access add column if not exists stripe_price_id text;
alter table public.user_access add column if not exists cancel_at_period_end boolean not null default false;

alter table public.customer_signups add column if not exists stripe_checkout_session_id text;
alter table public.customer_signups add column if not exists stripe_checkout_url text;
alter table public.customer_signups add column if not exists stripe_customer_id text;
alter table public.customer_signups add column if not exists stripe_subscription_id text;
alter table public.customer_signups add column if not exists stripe_price_id text;
alter table public.customer_signups add column if not exists stripe_status text;
alter table public.customer_signups add column if not exists cancel_at_period_end boolean not null default false;

alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;

create index if not exists customer_signups_stripe_subscription_idx on public.customer_signups (stripe_subscription_id);
create index if not exists customer_signups_stripe_session_idx on public.customer_signups (stripe_checkout_session_id);
create index if not exists user_access_stripe_subscription_idx on public.user_access (stripe_subscription_id);

-- Recebe os eventos do webhook Stripe via /api/stripe-webhook.
-- Se o usuário já existir no Auth com o mesmo e-mail, atualiza o acesso automaticamente.
-- Se ainda não existir, atualiza o cadastro pendente para aparecer no painel de gestão.
create or replace function public.stripe_apply_subscription_update(
  p_order_nsu text default null,
  p_email text default null,
  p_stripe_customer_id text default null,
  p_stripe_subscription_id text default null,
  p_stripe_checkout_session_id text default null,
  p_stripe_price_id text default null,
  p_plan_id text default null,
  p_plan_name text default null,
  p_billing_interval_months integer default null,
  p_subscription_status text default 'pending',
  p_current_period_start timestamptz default null,
  p_current_period_end timestamptz default null,
  p_last_payment_at timestamptz default null,
  p_cancel_at_period_end boolean default false
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(nullif(trim(coalesce(p_email, '')), ''));
  v_user_id uuid;
  v_status text := coalesce(nullif(p_subscription_status, ''), 'pending');
  v_payment_status text;
  v_updated integer := 0;
begin
  if v_status not in ('manual','pending','active','past_due','canceled','expired','demo') then
    v_status := 'pending';
  end if;

  v_payment_status := case
    when v_status = 'active' then 'paid'
    when v_status in ('past_due','pending') then v_status
    when v_status in ('canceled','expired') then v_status
    else 'pending'
  end;

  if v_email is not null then
    select id into v_user_id
    from auth.users
    where lower(email) = v_email
    limit 1;
  end if;

  if p_order_nsu is not null then
    update public.customer_signups
    set
      payment_status = v_payment_status,
      stripe_status = v_status,
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
      stripe_checkout_session_id = coalesce(p_stripe_checkout_session_id, stripe_checkout_session_id),
      stripe_price_id = coalesce(p_stripe_price_id, stripe_price_id),
      plan_id = coalesce(p_plan_id, plan_id),
      plan_name = coalesce(p_plan_name, plan_name),
      billing_interval_months = coalesce(p_billing_interval_months, billing_interval_months),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
      updated_at = now()
    where order_nsu = p_order_nsu;
    get diagnostics v_updated = row_count;
  end if;

  if v_updated = 0 and p_stripe_subscription_id is not null then
    update public.customer_signups
    set
      payment_status = v_payment_status,
      stripe_status = v_status,
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
      stripe_checkout_session_id = coalesce(p_stripe_checkout_session_id, stripe_checkout_session_id),
      stripe_price_id = coalesce(p_stripe_price_id, stripe_price_id),
      plan_id = coalesce(p_plan_id, plan_id),
      plan_name = coalesce(p_plan_name, plan_name),
      billing_interval_months = coalesce(p_billing_interval_months, billing_interval_months),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
      updated_at = now()
    where stripe_subscription_id = p_stripe_subscription_id;
    get diagnostics v_updated = row_count;
  end if;

  if v_updated = 0 and v_email is not null then
    update public.customer_signups
    set
      payment_status = v_payment_status,
      stripe_status = v_status,
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id),
      stripe_checkout_session_id = coalesce(p_stripe_checkout_session_id, stripe_checkout_session_id),
      stripe_price_id = coalesce(p_stripe_price_id, stripe_price_id),
      plan_id = coalesce(p_plan_id, plan_id),
      plan_name = coalesce(p_plan_name, plan_name),
      billing_interval_months = coalesce(p_billing_interval_months, billing_interval_months),
      cancel_at_period_end = coalesce(p_cancel_at_period_end, cancel_at_period_end),
      updated_at = now()
    where id = (
      select id
      from public.customer_signups
      where lower(email) = v_email
      order by created_at desc
      limit 1
    );
  end if;

  if v_user_id is not null then
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
      last_payment_at,
      stripe_customer_id,
      stripe_subscription_id,
      stripe_price_id,
      cancel_at_period_end,
      label,
      updated_at
    )
    values (
      v_user_id,
      v_status in ('active','past_due','pending','manual'),
      false,
      v_status,
      p_plan_id,
      p_plan_name,
      p_billing_interval_months,
      p_current_period_start,
      p_current_period_end,
      case when p_current_period_end is not null then p_current_period_end + interval '3 days' else null end,
      p_last_payment_at,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_stripe_price_id,
      coalesce(p_cancel_at_period_end, false),
      'Assinatura Stripe',
      now()
    )
    on conflict (user_id) do update set
      is_active = excluded.is_active,
      read_only = false,
      subscription_status = excluded.subscription_status,
      plan_id = coalesce(excluded.plan_id, public.user_access.plan_id),
      plan_name = coalesce(excluded.plan_name, public.user_access.plan_name),
      billing_interval_months = coalesce(excluded.billing_interval_months, public.user_access.billing_interval_months),
      current_period_start = coalesce(excluded.current_period_start, public.user_access.current_period_start),
      current_period_end = coalesce(excluded.current_period_end, public.user_access.current_period_end),
      grace_until = coalesce(excluded.grace_until, public.user_access.grace_until),
      last_payment_at = coalesce(excluded.last_payment_at, public.user_access.last_payment_at),
      stripe_customer_id = coalesce(excluded.stripe_customer_id, public.user_access.stripe_customer_id),
      stripe_subscription_id = coalesce(excluded.stripe_subscription_id, public.user_access.stripe_subscription_id),
      stripe_price_id = coalesce(excluded.stripe_price_id, public.user_access.stripe_price_id),
      cancel_at_period_end = excluded.cancel_at_period_end,
      label = 'Assinatura Stripe',
      updated_at = now();

    update public.profiles
    set
      plan_id = coalesce(p_plan_id, plan_id),
      subscription_status = v_status,
      stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
      stripe_subscription_id = coalesce(p_stripe_subscription_id, stripe_subscription_id)
    where id = v_user_id;
  end if;
end;
$$;

grant execute on function public.stripe_apply_subscription_update(text, text, text, text, text, text, text, text, integer, text, timestamptz, timestamptz, timestamptz, boolean) to service_role;

-- Atualiza a listagem de cadastros para o painel de gestão continuar vendo pagamentos feitos por Stripe.
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
    coalesce(cs.payment_status, cs.stripe_status, 'pending') as payment_status,
    coalesce(cs.stripe_checkout_url, cs.infinitepay_url) as infinitepay_url,
    cs.created_at
  from public.customer_signups cs
  where public.is_admin()
  order by cs.created_at desc
  limit 50;
$$;

grant execute on function public.admin_list_signups() to authenticated;
