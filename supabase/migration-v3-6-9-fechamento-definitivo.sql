-- V3.6.9
-- Correção definitiva para feiras que continuam aparecendo como "em andamento".
-- 1) Corrige dados antigos já presos como active.
-- 2) Cria função transacional para encerrar feira com segurança.

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
    coalesce(sum(loss_value), 0) as loss_total,
    coalesce(sum(quantity_returned), 0) as returned_total,
    coalesce(sum(quantity_lost), 0) as lost_total,
    coalesce(sum(quantity_sold), 0) as sold_total
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
    or totals.returned_total > 0
    or totals.lost_total > 0
    or totals.sold_total > 0
  );

create or replace function public.close_fair_atomic(
  p_fair_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fair record;
  v_item jsonb;
  v_item_row record;
  v_product_row record;
  v_taken numeric;
  v_returned numeric;
  v_lost numeric;
  v_sold numeric;
  v_cost_at_time numeric;
  v_sale_price_at_time numeric;
  v_revenue numeric;
  v_cost numeric;
  v_profit numeric;
  v_loss_value numeric;
  v_diff_taken numeric;
  v_revenue_total numeric := 0;
  v_cost_total numeric := 0;
  v_profit_total numeric := 0;
  v_loss_total numeric := 0;
begin
  select * into v_fair
  from public.fairs
  where id = p_fair_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Feira não encontrada ou sem permissão.';
  end if;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_item_row
    from public.fair_items
    where id = (v_item->>'id')::uuid
      and fair_id = p_fair_id
    for update;

    if not found then
      raise exception 'Item da feira não encontrado.';
    end if;

    v_taken := coalesce(nullif(v_item->>'quantity_taken', '')::numeric, 0);
    v_returned := coalesce(nullif(v_item->>'quantity_returned', '')::numeric, 0);
    v_lost := coalesce(nullif(v_item->>'quantity_lost', '')::numeric, 0);
    v_cost_at_time := coalesce(nullif(v_item->>'cost_at_time', '')::numeric, coalesce(v_item_row.cost_at_time, 0));
    v_sale_price_at_time := coalesce(nullif(v_item->>'sale_price_at_time', '')::numeric, coalesce(v_item_row.sale_price_at_time, 0));

    if v_taken < 0 or v_returned < 0 or v_lost < 0 then
      raise exception 'Revise as quantidades. Não use valores negativos.';
    end if;

    if v_returned + v_lost > v_taken then
      raise exception '%: voltou + perdeu não pode ser maior que a quantidade levada.', coalesce(v_item_row.product_name, 'Produto');
    end if;

    v_sold := greatest(v_taken - v_returned - v_lost, 0);
    v_revenue := v_sold * v_sale_price_at_time;
    v_cost := v_sold * v_cost_at_time;
    v_profit := v_revenue - v_cost;
    v_loss_value := v_lost * v_cost_at_time;
    v_diff_taken := v_taken - coalesce(v_item_row.quantity_taken, 0);

    if v_item_row.product_id is not null then
      select * into v_product_row
      from public.products
      where id = v_item_row.product_id
        and user_id = auth.uid()
      for update;

      if found then
        update public.products
        set stock = greatest(coalesce(v_product_row.stock, 0) - v_diff_taken + v_returned, 0)
        where id = v_product_row.id
          and user_id = auth.uid();
      end if;
    end if;

    update public.fair_items
    set
      quantity_taken = v_taken,
      quantity_returned = v_returned,
      quantity_lost = v_lost,
      quantity_sold = v_sold,
      revenue = v_revenue,
      cost = v_cost,
      profit = v_profit,
      loss_value = v_loss_value
    where id = v_item_row.id;

    v_revenue_total := v_revenue_total + v_revenue;
    v_cost_total := v_cost_total + v_cost;
    v_profit_total := v_profit_total + v_profit;
    v_loss_total := v_loss_total + v_loss_value;
  end loop;

  update public.fairs
  set
    status = 'closed',
    revenue_total = v_revenue_total,
    cost_total = v_cost_total,
    profit_total = v_profit_total,
    loss_total = v_loss_total,
    closed_at = now()
  where id = p_fair_id
    and user_id = auth.uid();

  return jsonb_build_object(
    'id', p_fair_id,
    'status', 'closed',
    'closed_at', now(),
    'revenue_total', v_revenue_total,
    'profit_total', v_profit_total
  );
end;
$$;

grant execute on function public.close_fair_atomic(uuid, jsonb) to authenticated;
