# O Feirante V3.2

Sistema de gestão para feirantes: estoque, entrada de mercadoria, feiras, histórico e inteligência da banca.

## Novidades da V3.2

- Links de **Termos de Uso** e **Política de Privacidade** na tela de login.
- Textos legais dentro do próprio app, em janela de leitura.
- Aviso de concordância no login.
- Tela amigável para **conta inativa**.
- Remoção do campo interno de fornecedor na entrada de mercadoria.
- Migração SQL completa para reforçar bloqueio de conta demo e contas inativas.
- Mantém bloqueio visual da conta teste com mensagem de demonstração.

## Conta demo

A conta demo conhecida é:

- E-mail: `teste@ofeirante.com`
- UID: `4cfdc4be-5aab-480a-8d84-0c222bac0dd1`

Ela deve estar na tabela `user_access` com:

- `read_only = true`
- `is_active = true`

## Subir no GitHub/Vercel

Extraia o ZIP e envie para o repositório os arquivos de dentro da pasta `o-feirante-v3-2`, não a pasta inteira.

Estrutura correta na raiz do GitHub:

```txt
package.json
index.html
vite.config.js
README.md
public/
src/
supabase/
```

## Variáveis de ambiente na Vercel

```txt
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_publishable_ou_anon
```

Depois de alterar variáveis, faça redeploy.

## Supabase

Para reforçar as regras de acesso, rode no SQL Editor:

```txt
supabase/migration-v3-2-politicas-acesso.sql
```

Esse arquivo remove policies antigas, recria policies com controle de escrita e mantém a conta teste bloqueada para alterações.
