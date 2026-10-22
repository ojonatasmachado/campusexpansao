---
id: I3
titulo: Revisar UI de Financeiro, Visitantes, Crianças, Cursos e Formação
tipo: codigo
status: livre
quem:
desde:
branch:
depende: [I4, D1]
tamanho: G
---

## Por quê
Financeiro, Visitantes, Crianças, Cursos e Formação ainda têm cara de cockpit, ação principal pouco clara e estados vazio, erro e carregando incompletos. A medição mostrou Relatórios com 18 elementos coloridos e 8 "?", Cursos com 6 "?" e Configurações com 41 ações na dobra.
Fonte: HANDOFF itens 1 e 4; STATUS.md; LEVEZA (medição: Relatórios 18 elementos coloridos e 8 "?", Cursos 6 "?", Configurações 41 ações na dobra).

## Arquivos (trilho)
- `app/service/modules/financeiro/Financeiro.tsx`
- `app/service/painel/telas/Visitantes.tsx`
- `app/service/painel/telas/Config.tsx`
- `app/service/CursoEditor.tsx`

## Pronto quando
- Hierarquia com menos cockpit e ação principal clara.
- Estados vazio, erro e carregando em cada tela.
- Celular pequeno e texto ampliado, claro e escuro, sem quebra.
- Parciais F10 (painel misturado), F11 (rotina e configuração), F12 (Caminhada) e F17 (superfícies e identidade) fechados.

## Notas
ABERTO. Depende de I4 para não duplicar componentes, e de D1 para a regra de densidade.
Telas de Crianças e Cursos sem caminho citado no levantamento; confirmar na reserva.
