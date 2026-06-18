-- V3.6.8
-- Corrige feiras que já tiveram encerramento salvo nos itens, mas ficaram com status active.
-- Isso remove essas feiras da tela inicial/encerrar feira dos clientes atuais e envia para o histórico.

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
    fair_id,
    coalesce(sum(revenue), 0) as revenue_total,
    coalesce(sum(cost), 0) as cost_total,
    coalesce(sum(profit), 0) as profit_total,
    coalesce(sum(loss_value), 0) as loss_total
  from public.fair_items
  group by fair_id
) totals
where f.id = totals.fair_id
  and f.status = 'active'
  and (
    f.closed_at is not null
    or totals.revenue_total > 0
    or totals.cost_total > 0
    or totals.profit_total <> 0
    or totals.loss_total > 0
    or exists (
      select 1
      from public.fair_items fi
      where fi.fair_id = f.id
        and (
          coalesce(fi.quantity_returned, 0) > 0
          or coalesce(fi.quantity_lost, 0) > 0
          or coalesce(fi.quantity_sold, 0) > 0
        )
    )
  );
