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


## V3.6.17

- Corrige o botão de iniciar feira cobrindo o último produto.
- Adiciona espaço inferior na lista de produtos para permitir preencher o último item sem o botão ficar por cima.
