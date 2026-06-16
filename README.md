# O Feirante V3.3

Sistema de gestão para feirantes com estoque, entrada de mercadoria, feiras, histórico, inteligência da banca, conta demo bloqueada, termos/política e tela comercial com planos + checkout InfinitePay.

## Novidades da V3.3

- Planos na tela inicial:
  - Mensal: R$ 9,90
  - Trimestral: R$ 24,90
  - Semestral: R$ 44,90
  - Anual: R$ 79,90
- Fluxo de cadastro antes do pagamento.
- Campos de cadastro:
  - nome completo
  - e-mail
  - CPF
  - data de nascimento
  - celular
  - cidade
  - estado
  - nome da banca
  - CNPJ opcional
- Integração com Checkout InfinitePay por link de pagamento.
- Registros de interessados/assinaturas na tabela `customer_signups`.
- Política de Privacidade atualizada para os novos dados.
- Termos de Uso atualizados para pagamento e cadastro.

## Variáveis de ambiente

Configure na Vercel:

```txt
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
VITE_INFINITEPAY_HANDLE=sua_infinite_tag_sem_o_sifrao
```

A `VITE_INFINITEPAY_HANDLE` é sua InfiniteTag no app InfinitePay, sem o símbolo `$`.

## Supabase

Rode as migrations nesta ordem, conforme seu estado atual:

1. `supabase/schema.sql` somente se o projeto estiver vazio.
2. `supabase/migration-v2.sql` se ainda não tiver categorias/feiras por local.
3. `supabase/migration-v3-2-politicas-acesso.sql` para políticas de acesso e demo.
4. `supabase/migration-v3-3-planos-pagamento.sql` para cadastros comerciais e planos.

## Observação importante sobre liberação de acesso

A V3.3 gera o link de pagamento e registra o cadastro do cliente como `pending`.
Após confirmar o pagamento na InfinitePay, crie/libere a conta do cliente no Supabase manualmente, ou implemente posteriormente um webhook/automação para ativação automática.
