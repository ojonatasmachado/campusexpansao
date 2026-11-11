---
id: M2
titulo: Remover setas dos botões do app do membro
tipo: codigo
status: feita
quem: codex
desde: 2026-11-11
branch: historia/M2-setas-botoes-membro
depende: []
tamanho: P
---

## Por quê
A regra da onda 0 diz que seta só vai em link, não em botão. O app do membro ainda tem setas em botões, como "Abrir meu curso →".
Fonte: PLANO_TELA_FORMULARIO.md ("Ficou de fora: o app do membro ainda tem setas nos botões").

## Arquivos (trilho)
- `app/service/membro/Cursos.tsx`
- `app/service/membro/Onboarding.tsx`
- `app/service/membro/Mural.tsx`
- `app/service/membro/Caminhada.tsx` (somente a linha do botão, conforme o pedido)
- `app/service/membro/Conversas.tsx`
- `app/service/membro/Visitantes.tsx`
- `app/service/membro/Inicio.tsx`
- `app/service/membro/Biblia.tsx`
- `app/service/MobileApp.tsx` (os rótulos de botão Gerenciar e Voltar ao painel)
- `app/service/lib/internacional/mensagens/fontes.json`
- `app/service/lib/internacional/mensagens/pt-BR.json`
- `app/service/lib/internacional/mensagens/en-US.json`
- `app/service/lib/internacional/mensagens/es-ES.json`
- `app/service/lib/internacional/mensagens/referencias.json`
- `docs/service-v7/historias/M2-setas-botoes-membro.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/M2-*.png`

## Pronto quando
- Setas direcionais de navegação preservadas; somente setas decorativas no fim dos rótulos de botão removidas.
- As três variantes de rótulo funcionam nos catálogos de todos os idiomas.
- Outros botões com seta encontrados na varredura removidos.

## Validação
Varredura da base `origin/main` com `git grep -n -e '→' -e '->' -e '›' origin/main -- app/service/membro app/service/MobileApp.tsx`. Ocorrências:

| Arquivo:linha | Uso encontrado | Tipo |
|---|---|---|
| `MobileApp.tsx:127` | comentário “Perfil › Tamanho do texto” | Comentário, não renderizado |
| `MobileApp.tsx:631` e `:680` | “Gerenciar →” | Dois `Botao`, removida a seta |
| `Biblia.tsx:170` | seta no fim de “Minhas marcações” | `Acao`, removida |
| `Biblia.tsx:207` | chevron para capítulo seguinte | `Acao`, substituída por “Próx.” com rótulo acessível |
| `Caminhada.tsx:187` | ação da etapa | `Botao`, removida somente nesta linha |
| `Conversas.tsx:171` | comentário com “Nova mensagem → Falar com um líder” | Comentário, não renderizado |
| `Conversas.tsx:366` | seta na linha de líder | `Acao`, removida |
| `Cursos.tsx:238` | “Quero me inscrever →” | `Botao`, removida |
| `Cursos.tsx:275` | “Abrir meu curso →” | `Botao`, removida |
| `Inicio.tsx:342`, `:352`, `:452` | ações de etapa, cadastro e agenda | `Botao`, removidas |
| `Inicio.tsx:504` | “Assistir/Ler →” dentro do cartão acionável | `Acao` com aparência de link, removida |
| `Mural.tsx:50` | “Ver todas as publicações →” | `Botao`, removida |
| `Onboarding.tsx:104` e `:119` | “Continuar →” e “Entrar no app →” | Rótulos de `Botao`, removidos |
| `Onde.tsx:21` | comentário “Agenda › Onde” | Comentário, não renderizado |
| `Visitantes.tsx:130` | “Avancar para … →” | `Botao`, removida |

Correção da revisão: setas direcionais voltaram, pois a regra M2 remove apenas a seta decorativa no fim do botão. A biblioteca indica `Botao` para botões e `Acao` para ações de navegação; não foi criada peça nova. Foram restaurados: `app/service/membro/Biblia.tsx:190` e `:230` (“← Livros”), `:202` (“← Capítulos”), `:204` (“‹”, com `aria-label="Capítulo anterior"`) e `:206` (“›”, com `aria-label="Próximo capítulo"`); `app/service/membro/Conversas.tsx:290` (“← {nomeDa(chat)}”, no lugar de “Voltar: nome”); `app/service/MobileApp.tsx:617` (“← Voltar ao painel”). O “← Perfil” existente em Minha história é o padrão visual seguido. Os rótulos “Ant.” e “Próx.” foram removidos. As únicas setas retiradas pela M2 são as decorativas finais descritas na varredura acima.

Fotos abertas, 390×844. O medidor é `scripts/medir-densidade.js`, `__medir(44)`, limite 12 ações e 80 palavras:

| Tela | Antes | Depois | Observação visual |
|---|---:|---:|---|
| Início | 9 ações / 59 palavras | 9 / 59 | Primeira dobra com duas escalas; nenhuma ação com seta estava visível. MD5 igual porque a tela não tinha conteúdo dessas ações. |
| Mensagens | 11 / 77 | 11 / 77 | Mural, conversas existentes e Nova mensagem; sem alteração visível na primeira dobra. MD5 igual. |
| Caminhada | 6 / 52 | 6 / 51 | “Já participo →” virou “Já participo”; mesma ação, um caractere a menos. |
| Primeiro acesso | 3 / 40 | 3 / 39 | O botão “Continuar →” passou a “Continuar”. Usei membro2, cujo cadastro já estava incompleto; não salvei o formulário. |
| Mural | 5 / 19 | 5 / 9 | Estado vazio, sem publicações. A foto não prova o botão condicional “Ver todas”; não foi possível criar uma publicação alvo nesta retificação. |
| Nova mensagem | 0 / 0 | 0 / 0 | O estado aberto não tinha líder disponível. A foto aberta mostra o formulário e “Nenhum líder disponível ainda”; a linha com seta não foi renderizada. |
| Bíblia, marcações | 6 / 19 | 6 / 20 | “← Livros” restaurado; 390×844. MD5 antes `ea0922ce01881ae19e4c57470181fd37`, depois `39e5a0fdfe1623efc780248cb60eace4`. |
| Bíblia, capítulos | 51 / 54 | 51 / 55 | “← Livros” restaurado; captura antes tinha o retorno ausente. Fora da lei pelo limite 12 ações, sem aumento de ações. MD5 antes `8052e07f1039ee0209481f77098e2070`, depois `ae6c2a15e3a3823a31f932518db3f810`. |
| Bíblia, leitor | 14 / 155 | 14 / 156 | “← Capítulos” e ‹ › restaurados, com aria-labels mantidos; fora da lei pelos limites 12/80, sem aumento de ações. MD5 antes `e2a9e852f9e073562059a6e1830608d5`, depois `b9984b35f4cbcf8ca1256bf2f368f3dd`. |

Todas as demais medidas ficaram dentro do limite 12/80. Agenda foi medida em 15/72 antes, fora da lei; não alterei essa tela. Não consegui abrir Visitantes por clique: Maria serve somente em Louvor (consulta local a `person_ministries`) e o líder entra no painel, sem a navegação de membro. Não encontrei cursos nem matrícula para exibir “Abrir meu curso” ou “Quero me inscrever”; nenhum dado foi criado.

MD5 das fotos pertinentes abertas:
- Caminhada antes/depois `325a52194d3347ffa0ecff574cef92dc` / `5beab52211bf3ae9d19ffe75191eb398`.
- Primeiro acesso antes/depois `18d441cefb48747b45715960128b938e` / `46fe2a7e8d9139088e9e59c5c745dccb`.
- Bíblia, marcações/capítulos/leitor: MD5s registrados na tabela acima; cada par antes/depois é distinto.

As chaves de tradução de “← Voltar ao painel” estão nos catálogos pt-BR, en-US e es-ES e no índice de referências. O preview não é instanciado atualmente. Testei gestão com `lider@teste.local` e também com `outra@teste.local`, o outro master listado no seed; não alterei perfil para contornar primeiro acesso. Resultado: “Gerenciar” não verificado na tela, porque as duas sessões não chegaram à condição de `onSwitchToPanel` ativo. O trecho só renderiza no modo self quando esse callback existe (`ServiceExactApp.tsx:877`).

As imagens antigas idênticas foram removidas (Início, Mensagens, Mural vazio e Nova mensagem sem líder). A tela Mural com publicação alvo e as telas de curso em andamento/matrícula não foram verificadas nesta retificação: não foi criado dado temporário para elas, então não há foto válida desses controles.

TypeScript e ESLint passaram sem erros; `Inicio.tsx` mantém quatro avisos preexistentes. A busca de setas e chevrons nos rótulos de botão da trilha não encontrou outros casos funcionais. O status foi concluído com autorização para editar `MobileApp.tsx`, apesar da reserva G17 obsoleta.

## Notas
Concluída por codex. Setas de direção foram restauradas; as setas decorativas finais seguem removidas. Fotos bíblicas e medições atualizadas acima.
