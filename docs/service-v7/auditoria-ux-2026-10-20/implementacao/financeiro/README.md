# Hierarquia das operações financeiras

Revisada em 21/10/2026 no painel autenticado, com dados sintéticos e viewport de 1440 por 900 e 390 por 844.

## Problema observado

Movimento apresentava quatro operações no mesmo nível: entrada, despesa, contagem de oferta e transferência. Para uma pessoa no primeiro uso, tarefas frequentes e ocasionais competiam no cabeçalho.

## Ajuste

- Lançar entrada permanece como a única ação principal.
- Despesa, oferta e transferência ficam em Outras operações.
- O menu usa controles nativos, navegação por teclado e alvos de pelo menos 44 px.
- No celular, as duas decisões cabem na mesma linha e o rótulo não quebra.
- As permissões e os formulários existentes foram preservados.

## Validação

O painel autenticado foi percorrido visualmente em desktop e celular. Não houve erro de console ou rolagem horizontal nova. TypeScript, build de produção, lint do componente, contraste dos temas e verificação estática da Lei 12 passaram.

A captura `capturas/desktop-operacoes.png` usa uma organização sintética e mostra a hierarquia final do cabeçalho.
