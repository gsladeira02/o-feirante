# O Feirante V3.7.4 — Correção feira em andamento

Correção focada no fluxo de iniciar/continuar feira:

- Remove a regra que escondia feiras ativas por comparação com histórico.
- A regra agora é simples: `status = active` e `closed_at` vazio aparece como feira em andamento.
- Se uma tentativa anterior já criou a feira e baixou estoque, iniciar novamente não baixa estoque de novo; o app volta para a feira aberta.
- Mantém as funções da V3.7.x: Stripe, alterar senha, sugestões, entregas, clientes, histórico e inteligência.

Não precisa rodar nova migration.
