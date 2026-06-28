# O Feirante V3.6.16 — Estabilidade online + aceitar sugestão

Esta versão finaliza a prioridade 1 de estabilidade do app online e adiciona o fluxo de aceitar sugestão da inteligência.

## Ajustes principais

- Fechamento de feira mais seguro.
- Feira encerrada não deve continuar aparecendo como feira em andamento.
- Proteção contra encerrar a mesma feira duas vezes.
- Limpeza reforçada de feiras ativas duplicadas.
- Mensagens mais amigáveis nas ações principais.
- Botões com estado de carregamento para evitar duplo clique.
- Sugestão do que levar agora tem botão **Aceitar sugestão e iniciar feira**.
- Ao aceitar a sugestão, a tela de iniciar feira já vem preenchida.
- O feirante ainda pode alterar qualquer quantidade antes de iniciar.
- Se não houver estoque suficiente para algum item sugerido, o sistema preenche com o estoque disponível e avisa.

## Supabase

Após subir no GitHub, rode no SQL Editor:

```txt
supabase/migration-v3-6-16-estabilidade-feira.sql
```

## Deploy

Suba os arquivos de dentro desta pasta na raiz do GitHub. Não suba o ZIP fechado nem a pasta inteira.


## V3.6.18

- Corrige o botão de iniciar feira cobrindo o último produto.
- Adiciona espaço inferior na lista de produtos para permitir preencher o último item sem o botão ficar por cima.


## V3.6.18

- Adicionada alteração de senha em Dados cadastrais.
- Mantida a base estável da V3.6.17, sem alterar a lógica de início e encerramento de feira.
- Não exige nova migration no Supabase.


## V3.6.19 - Stripe Assinaturas

Base estável da V3.6.18 com troca do checkout InfinitePay para Stripe Checkout em modo assinatura.

Variáveis necessárias na Vercel:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- VITE_STRIPE_PUBLISHABLE_KEY
- SUPABASE_SERVICE_ROLE_KEY
- STRIPE_PRICE_MENSAL
- STRIPE_PRICE_TRIMESTRAL
- STRIPE_PRICE_SEMESTRAL
- STRIPE_PRICE_ANUAL

Webhook Stripe:
https://o-feirante.vercel.app/api/stripe-webhook

Eventos:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed

Rode no Supabase:
supabase/migration-v3-6-19-stripe-assinaturas.sql
