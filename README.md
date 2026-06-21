# O Feirante V3.6.14 — correção geral de layout

Versão com pente fino visual para evitar estouro horizontal em telas pequenas, especialmente no Histórico por feira.

Ajustes principais:
- Correção de cards e textos saindo da tela.
- Histórico por feira mais responsivo.
- Cards de faturamento/lucro/perdas ajustados para celular.
- Melhorias em listas, botões, formulários e navegação inferior.
- Mantidas as correções da V3.6.13.

Deploy:
1. Extraia o ZIP.
2. Envie os arquivos de dentro da pasta para o GitHub.
3. Não envie o ZIP fechado nem a pasta inteira.

## V3.6.15 - Correção feira em andamento após encerrar

- Corrige feira que já foi para o histórico, mas ainda aparece como em andamento.
- O app arquiva automaticamente registros duplicados que ficaram como `active`.
- Rode no Supabase: `supabase/migration-v3-6-15-limpar-feira-em-andamento.sql`.
