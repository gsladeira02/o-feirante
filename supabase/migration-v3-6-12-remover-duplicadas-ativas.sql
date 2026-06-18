-- V3.6.12 - Remove/corrige feiras ativas duplicadas que já aparecem no histórico.
-- Objetivo: se já existe uma feira encerrada do mesmo usuário/local/dia,
-- qualquer registro ainda marcado como active do mesmo local/dia deixa de aparecer como em andamento.

-- 1) Fecha qualquer feira active que já possui sinais claros de encerramento.
with totals as (
  select
    fi.fair_id,
    sum(coalesce(fi.revenue, 0)) as revenue_total,
    sum(coalesce(fi.cost, 0)) as cost_total,
    sum(coalesce(fi.profit, 0)) as profit_total,
    sum(coalesce(fi.loss_value, 0)) as loss_total
  from public.fair_items fi
  group by fi.fair_id
)
update public.fairs f
set
  status = 'closed',
  closed_at = coalesce(f.closed_at, now()),
  revenue_total = coalesce(nullif(f.revenue_total, 0), totals.revenue_total, 0),
  cost_total = coalesce(nullif(f.cost_total, 0), totals.cost_total, 0),
  profit_total = coalesce(nullif(f.profit_total, 0), totals.profit_total, 0),
  loss_total = coalesce(nullif(f.loss_total, 0), totals.loss_total, 0)
from totals
where f.id = totals.fair_id
  and f.status = 'active'
  and (
    f.closed_at is not null
    or coalesce(f.revenue_total, 0) <> 0
    or coalesce(f.cost_total, 0) <> 0
    or coalesce(f.profit_total, 0) <> 0
    or coalesce(f.loss_total, 0) <> 0
    or exists (
      select 1
      from public.fair_items fi
      where fi.fair_id = f.id
        and (
          coalesce(fi.quantity_returned, 0) <> 0
          or coalesce(fi.quantity_lost, 0) <> 0
          or coalesce(fi.quantity_sold, 0) <> 0
          or coalesce(fi.revenue, 0) <> 0
          or coalesce(fi.cost, 0) <> 0
          or coalesce(fi.profit, 0) <> 0
          or coalesce(fi.loss_value, 0) <> 0
        )
    )
  );

-- 2) Remove registros active duplicados: mesma conta, mesmo local/nome e mesmo dia
-- quando já existe outra feira encerrada no histórico.
create temporary table if not exists tmp_duplicate_active_fairs as
select a.id
from public.fairs a
where a.status = 'active'
  and a.closed_at is null
  and exists (
    select 1
    from public.fairs c
    where c.user_id = a.user_id
      and c.id <> a.id
      and c.status = 'closed'
      and (
        (c.fair_place_id is not null and a.fair_place_id is not null and c.fair_place_id = a.fair_place_id)
        or lower(trim(coalesce(c.name, ''))) = lower(trim(coalesce(a.name, '')))
      )
      and (
        date(c.created_at) = date(a.created_at)
        or date(c.closed_at) = date(a.created_at)
      )
  );

delete from public.fair_items fi
where fi.fair_id in (select id from tmp_duplicate_active_fairs);

delete from public.fairs f
where f.id in (select id from tmp_duplicate_active_fairs);

drop table if exists tmp_duplicate_active_fairs;

-- 3) Garante closed_at em toda feira encerrada.
update public.fairs
set closed_at = coalesce(closed_at, now())
where status = 'closed'
  and closed_at is null;
