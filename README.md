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
