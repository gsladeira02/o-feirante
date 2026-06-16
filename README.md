# O Feirante V3.5.4

Correção emergencial do cadastro de produtos.

## Correção

- Corrigido erro: `Cannot read properties of null (reading 'reset')` ao salvar produto.
- O formulário agora guarda a referência antes da operação assíncrona, evitando que o React zere `event.currentTarget` após o cadastro.
- Mantém as correções anteriores de teclado no celular e painel admin.

## Deploy

Suba os arquivos da pasta na raiz do GitHub, não a pasta inteira.
