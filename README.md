# O Feirante - V1

Aplicativo mobile-first para feirantes controlarem estoque, compras, início de feira, encerramento de feira e resultado automático.

## Como rodar

```bash
npm install
npm run dev
```

## Configurar Supabase

1. Crie um projeto no Supabase.
2. Abra o SQL Editor.
3. Rode o arquivo `supabase/schema.sql`.
4. Copie `.env.example` para `.env`.
5. Preencha:

```env
VITE_SUPABASE_URL=sua_url
VITE_SUPABASE_ANON_KEY=sua_chave_anon_public
```

## Publicar na Vercel

1. Suba este projeto para o GitHub.
2. Importe o repositório na Vercel.
3. Adicione as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Clique em Deploy.

## Funcionalidades da V1

- Login e cadastro por e-mail/senha.
- Cadastro de produtos.
- Entrada de compras no estoque.
- Começar feira informando produtos levados.
- Encerrar feira informando retorno e perdas.
- Cálculo automático de vendido, faturamento, custo, lucro e perdas.
- Histórico de feiras.
- Layout mobile-first.
- PWA básico.
