-- V3.6.11 - Limpa feiras que já foram encerradas, mas ainda aparecem como em andamento.
-- Esta migration é segura/conservadora: só fecha registros ativos que já têm sinais claros de encerramento.

update public.fairs f
set
  status = 'closed',
  closed_at = coalesce(f.closed_at, now()),
  revenue_total = coalesce(nullif(f.revenue_total, 0), totals.revenue_total, 0),
  cost_total = coalesce(nullif(f.cost_total, 0), totals.cost_total, 0),
  profit_total = coalesce(nullif(f.profit_total, 0), totals.profit_total, 0),
  loss_total = coalesce(nullif(f.loss_total, 0), totals.loss_total, 0)
from (
  select
    fi.fair_id,
    sum(coalesce(fi.revenue, 0)) as revenue_total,
    sum(coalesce(fi.cost, 0)) as cost_total,
    sum(coalesce(fi.profit, 0)) as profit_total,
    sum(coalesce(fi.loss_value, 0)) as loss_total
  from public.fair_items fi
  group by fi.fair_id
) totals
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

-- Garante que toda feira fechada tenha closed_at preenchido.
update public.fairs
set closed_at = now()
where status = 'closed'
  and closed_at is null;
