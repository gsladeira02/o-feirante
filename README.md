# O Feirante V2

Aplicativo mobile-first para feirantes.

## V2 inclui

- Logo atualizada: barraca de feira com gráfico de crescimento.

- Acesso fechado: sem cadastro público.
- Usuários criados manualmente no Supabase.
- Troca obrigatória de senha no primeiro acesso.
- Cadastro de categorias.
- Produto com categoria selecionável.
- Cadastro de feiras/locais.
- Início de feira tocando em uma feira cadastrada.
- Encerramento calculando vendido, retornado, perdido, faturamento e lucro.
- Histórico agrupado por local da feira.

## Instalação

```bash
npm install
npm run dev
```

## Supabase

Se for projeto novo, rode:

```txt
supabase/schema.sql
```

Se você já usava a versão anterior, rode:

```txt
supabase/migration-v2.sql
```

## Vercel

Variáveis obrigatórias:

```txt
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

## Criar assinante

No Supabase:

```txt
Authentication > Users > Add User
```

Crie e-mail e senha provisória. No primeiro login, o usuário será obrigado a alterar a senha.


## V2.1

Inclui:
- Validações contra valores negativos.
- Bloqueio para iniciar feira com quantidade maior que o estoque.
- Bloqueio para encerrar feira quando voltou + perdeu for maior que levou.
- Edição de produtos.
- Edição de categorias.
- Edição de feiras/locais.
- Resumo antes de confirmar o encerramento da feira.


## V3

Inclui:
- Dashboard avançado do mês.
- Página de inteligência.
- Produtos mais vendidos.
- Produtos mais lucrativos.
- Produtos com mais perdas.
- Comparativo entre feiras por lucro médio.
- Evolução mensal com gráfico simples.
- Meta mensal de faturamento.
- Sugestão automática do que levar para cada feira.
- Entrada de mercadoria em vez de "comprar mercadoria".


## Manual do cliente

Incluído no projeto: `Manual_Cliente_O_Feirante_V3.pdf`.


## V3.1 - Conta teste bloqueada

Esta versão reconhece usuários marcados em `public.user_access` com `read_only = true`.

Quando uma conta teste tenta cadastrar, editar, excluir, registrar entrada de mercadoria, iniciar feira ou encerrar feira, o app exibe uma mensagem informando que é uma conta teste e bloqueia a ação.

A conta teste usada na demonstração é:

- E-mail: `teste@ofeirante.com`
- UID: `4cfdc4be-5aab-480a-8d84-0c222bac0dd1`

Se necessário, rode `supabase/migration-v3-1-demo.sql` no SQL Editor do Supabase.
