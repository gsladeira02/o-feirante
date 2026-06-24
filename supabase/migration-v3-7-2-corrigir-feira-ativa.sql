-- O Feirante V3.7.2
-- Correção segura para feiras ativas antigas que já têm fechamento real.
-- Não arquiva feiras novas iniciadas depois de uma feira encerrada no mesmo dia/local.

update public.fairs f
set status = 'archived', closed_at = coalesce(f.closed_at, now())
where f.status = 'active'
  and f.closed_at is null
  and exists (
    select 1
    from public.fairs c
    where c.user_id = f.user_id
      and c.id <> f.id
      and c.status = 'closed'
      and c.closed_at is not null
      and (c.fair_place_id = f.fair_place_id or lower(c.name) = lower(f.name))
      and c.closed_at >= f.created_at
      and c.closed_at <= f.created_at + interval '48 hours'
  );
