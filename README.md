# O Feirante — V3.6.3

Versão com histórico de compras por cliente na aba Entregas.

## Novidades

- Histórico de compras/entregas por cliente.
- Resumo por cliente: total comprado, compras confirmadas, entregas pendentes e produto mais comprado.
- Botão para filtrar entregas de um cliente específico.
- Botão para repetir uma entrega já confirmada.
- Mantém Entregas, Clientes, Entrada de mercadoria no Estoque, edição do que levou e painel de gestão.

## Deploy

Suba os arquivos da pasta do projeto na raiz do GitHub. Não suba a pasta inteira e não suba o ZIP.

## Supabase

Não precisa rodar nova migration se a migration V3.6 de entregas já foi executada.


## V3.6.6 - Nova tabela de preços

Planos atualizados para novos clientes:

- Mensal: R$ 19,90/mês
- Trimestral: R$ 54,90 ou 3x de R$ 18,30
- Semestral: R$ 99,90 ou 6x de R$ 16,65
- Anual: R$ 179,90 ou 12x de R$ 14,99

Observação: o parcelamento aparece na comunicação do plano e depende das opções liberadas no checkout InfinitePay. O valor enviado ao checkout continua sendo o valor total do plano escolhido.


## V3.6.6 — Dados cadastrais

- Nova tela **Dados cadastrais** acessível pelo ícone de usuário no topo.
- O feirante pode atualizar nome completo, CPF, nascimento, celular, cidade, estado, nome da banca e CNPJ opcional.
- O e-mail de acesso aparece para consulta, mas não é alterado diretamente pelo app.
- Clientes de entrega agora também podem ser editados: nome, telefone e endereço.
- Mantidas as correções de deploy, teclado, preços, entregas, histórico do cliente e layout fluido.


## V3.6.6

- Botão Dados cadastrais visível no topo.
- Atalho Dados cadastrais nas ações rápidas do início.
- Mantém edição de dados cadastrais da banca e clientes.


## V3.6.7 — Correção ao encerrar feira

- Corrige o fluxo de encerramento de feira.
- Melhora a mensagem de erro quando algum item não salva.
- Mantém o botão em estado "Salvando..." durante o fechamento.
- Ao confirmar, fecha a feira e envia o usuário para o histórico.
- O ajuste de estoque ao alterar o campo Levou ficou mais tolerante para não impedir o encerramento por diferença de estoque.

Não precisa rodar nova migration no Supabase.

## V3.6.9

- Corrige feira encerrada que ainda aparecia como “Feira em andamento”.
- A busca de feira ativa agora ignora registros já encerrados.
- Produtos da tela Encerrar feira organizados por categoria e ordem alfabética.
- Produtos no Histórico também organizados por categoria e ordem alfabética.
- Inclui migration para corrigir clientes atuais com feiras encerradas que ficaram marcadas como ativas.

Execute no Supabase:

```txt
supabase/migration-v3-6-8-corrigir-feiras-ativas.sql
```


## V3.6.9

- Correção definitiva para feira que permanecia em andamento após encerrar.
- Encerramento de feira agora usa função transacional no Supabase quando a migration for rodada.
- O app também limpa automaticamente feiras antigas que ficaram presas como ativas.
- Produtos continuam ordenados por categoria e ordem alfabética no encerramento e histórico.

Rodar no Supabase: `supabase/migration-v3-6-9-fechamento-definitivo.sql`.
