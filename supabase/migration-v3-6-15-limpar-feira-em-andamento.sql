-- V3.6.15 - Correção definitiva para feira encerrada que continua aparecendo como em andamento.
-- Esta migration faz duas coisas:
-- 1) Feira active que já tem dados de encerramento vira closed.
-- 2) Feira active duplicada do mesmo usuário/local/nome, criada antes de uma feira já encerrada,
--    vira archived para sumir das telas sem duplicar o histórico.

-- 1) Feiras marcadas como active, mas com dados de fechamento, viram closed.
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

-- 2) Feiras active duplicadas sem dados de fechamento viram archived.
-- Regra segura: mesmo usuário e mesmo local/nome, com uma feira closed encerrada depois
-- que o registro active foi criado. Isso não pega uma feira nova iniciada depois do histórico antigo.
update public.fairs a
set
  status = 'archived',
  closed_at = coalesce(a.closed_at, now())
where a.status = 'active'
  and a.closed_at is null
  and exists (
    select 1
    from public.fairs c
    where c.user_id = a.user_id
      and c.id <> a.id
      and c.status = 'closed'
      and c.closed_at is not null
      and (
        (c.fair_place_id is not null and a.fair_place_id is not null and c.fair_place_id = a.fair_place_id)
        or lower(trim(coalesce(c.name, ''))) = lower(trim(coalesce(a.name, '')))
      )
      and (
        c.closed_at >= a.created_at
        or date(c.created_at) = date(a.created_at)
        or date(c.closed_at) = date(a.created_at)
      )
  );

-- 3) Garante closed_at em toda feira encerrada.
update public.fairs
set closed_at = coalesce(closed_at, now())
where status = 'closed'
  and closed_at is null;
