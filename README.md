# O Feirante V3.6.12

Correção reforçada para feiras já encerradas que continuavam aparecendo como em andamento.

- Esconde feiras ativas duplicadas quando já existe feira encerrada do mesmo local no mesmo dia.
- Corrige clientes atuais com feira duplicada presa como ativa.
- Mantém produtos ordenados por categoria e por nome no encerramento e no histórico.

Rode no Supabase: `supabase/migration-v3-6-12-remover-duplicadas-ativas.sql`.
