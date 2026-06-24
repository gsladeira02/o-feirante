# O Feirante V3.7.2 — Stripe Assinaturas

Versão com integração Stripe para assinaturas recorrentes no lugar da InfinitePay.

## Planos configurados

- Mensal: `price_1TkmDrFYq1EGoHAlPpZd6nMl`
- Trimestral: `price_1TkmDrFYq1EGoHAlMs0dIvYs`
- Semestral: `price_1TkmDrFYq1EGoHAlkRqXKdDb`
- Anual: `price_1TkmDsFYq1EGoHAl9SiEEKaJ`

## Variáveis na Vercel

Configure em **Settings → Environment Variables**:

```txt
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-publica
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-do-supabase
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_MENSAL=price_1TkmDrFYq1EGoHAlPpZd6nMl
STRIPE_PRICE_TRIMESTRAL=price_1TkmDrFYq1EGoHAlMs0dIvYs
STRIPE_PRICE_SEMESTRAL=price_1TkmDrFYq1EGoHAlkRqXKdDb
STRIPE_PRICE_ANUAL=price_1TkmDsFYq1EGoHAl9SiEEKaJ
```

**Importante:** `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` são chaves secretas. Nunca coloque essas chaves em arquivos públicos do projeto.

## Migration obrigatória

Rode no Supabase SQL Editor:

```txt
supabase/migration-v3-7-stripe-assinaturas.sql
```

## Webhook da Stripe

No Dashboard Stripe, crie um endpoint de webhook apontando para:

```txt
https://o-feirante.vercel.app/api/stripe-webhook
```

Eventos recomendados:

```txt
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_succeeded
invoice.payment_failed
```

Depois copie o `whsec_...` e coloque em `STRIPE_WEBHOOK_SECRET` na Vercel.

## Funcionamento

- Todos os planos são recorrentes via Stripe Checkout em `mode=subscription`.
- Trimestral, semestral e anual mostram o valor equivalente por mês no site, mas são assinaturas recorrentes do período escolhido.
- O webhook atualiza o cadastro e, se o usuário já existir no Supabase Auth com o mesmo e-mail, atualiza `user_access` automaticamente.
- Se o usuário ainda não existir, o cadastro fica no painel de gestão para liberação/criação da conta.

## Deploy

Suba somente os arquivos de dentro da pasta `o-feirante-v3-7-stripe-assinaturas` para o GitHub. Não suba o ZIP nem a pasta inteira.


## V3.7.2

- Adicionada opção de alterar senha dentro de Dados cadastrais.
- A alteração exige a senha atual, nova senha e confirmação.
- Não exige migration no Supabase.
