# O Feirante V3.4

Versão com planos, cadastro comercial, integração com InfinitePay, controle de assinatura e bloqueio automático após 3 dias do vencimento.

## Novidades da V3.4

- Planos com recorrência identificada:
  - Mensal: 1 mês
  - Trimestral: 3 meses
  - Semestral: 6 meses
  - Anual: 12 meses
- Cadastro comercial com nome completo, CPF, nascimento, celular, cidade, estado, nome da banca e CNPJ opcional.
- Armazena `billing_interval_months` para identificar a duração do plano.
- Campos de assinatura em `user_access`:
  - `plan_id`
  - `plan_name`
  - `billing_interval_months`
  - `subscription_status`
  - `current_period_start`
  - `current_period_end`
  - `grace_until`
  - `last_payment_at`
  - `infinitepay_subscription_id`
- Bloqueio automático no banco quando a assinatura passa do vencimento + 3 dias.
- Faixa no app informando plano ativo ou período de carência.
- Tela de conta bloqueada para assinatura vencida.

## Supabase

Após subir os arquivos, rode no SQL Editor:

```txt
supabase/migration-v3-4-assinaturas-vencimento.sql
```

## Vercel

Configure:

```txt
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publica
INFINITEPAY_HANDLE=sua_infinite_tag_sem_o_sifrao
```

## Observação sobre InfinitePay

Esta versão já prepara o sistema para controle recorrente por plano e bloqueio por vencimento. A confirmação de pagamento/renovação deve atualizar a tabela `user_access`, manualmente pelo painel ou por webhook/API quando a recorrência da InfinitePay estiver configurada.

Regra de acesso:

```txt
current_period_end = data de vencimento
 grace_until = current_period_end + 3 dias
Depois de grace_until, o sistema bloqueia o acesso.
```

## Exemplo de ativação manual de cliente

```sql
insert into public.user_access (
  user_id,
  read_only,
  is_active,
  plan_id,
  plan_name,
  billing_interval_months,
  subscription_status,
  current_period_start,
  current_period_end,
  grace_until,
  last_payment_at
)
values (
  'UID_DO_CLIENTE',
  false,
  true,
  'mensal',
  'Mensal',
  1,
  'active',
  now(),
  now() + interval '1 month',
  now() + interval '1 month' + interval '3 days',
  now()
)
on conflict (user_id) do update set
  read_only = false,
  is_active = true,
  plan_id = excluded.plan_id,
  plan_name = excluded.plan_name,
  billing_interval_months = excluded.billing_interval_months,
  subscription_status = excluded.subscription_status,
  current_period_start = excluded.current_period_start,
  current_period_end = excluded.current_period_end,
  grace_until = excluded.grace_until,
  last_payment_at = excluded.last_payment_at,
  updated_at = now();
```
