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
- `app/service/MobileApp.tsx` (somente os três rótulos de botão listados na validação)
- `app/service/lib/internacional/mensagens/fontes.json`
- `app/service/lib/internacional/mensagens/pt-BR.json`
- `app/service/lib/internacional/mensagens/en-US.json`
- `app/service/lib/internacional/mensagens/es-ES.json`
- `app/service/lib/internacional/mensagens/referencias.json`
- `docs/service-v7/historias/M2-setas-botoes-membro.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/historias/screenshots/M2-*.png`

## Pronto quando
- Nenhum botão do app do membro com seta; setas só em link.
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

Também procurei `←` e `‹`. Removi as setas nos botões de retorno de `Biblia.tsx:191`, `:203` e `:231`, o chevron anterior em `Biblia.tsx:205` e o retorno no título de conversa em `Conversas.tsx:290`. `MobileApp.tsx:617` (“← Voltar ao painel”) é outro `Botao`, remover seta. G17 já está feita no main; a reserva antiga não impede esta alteração. Nenhuma ocorrência funcional estava em link.

Fotos abertas, 390×844. O medidor é `scripts/medir-densidade.js`, `__medir(44)`, limite 12 ações e 80 palavras:

| Tela | Antes | Depois | Observação visual |
|---|---:|---:|---|
| Início | 9 ações / 59 palavras | 9 / 59 | Primeira dobra com duas escalas; nenhuma ação com seta estava visível. MD5 igual porque a tela não tinha conteúdo dessas ações. |
| Mensagens | 11 / 77 | 11 / 77 | Mural, conversas existentes e Nova mensagem; sem alteração visível na primeira dobra. MD5 igual. |
| Caminhada | 6 / 52 | 6 / 51 | “Já participo →” virou “Já participo”; mesma ação, um caractere a menos. |
| Primeiro acesso | 3 / 40 | 3 / 39 | O botão “Continuar →” passou a “Continuar”. Usei membro2, cujo cadastro já estava incompleto; não salvei o formulário. |
| Mural | 5 / 19 | 5 / 9 | Estado vazio, sem publicações. As duas imagens são idênticas; o botão condicional “Ver todas” não aparece sem publicação alvo. |
| Nova mensagem | 0 / 0 | 0 / 0 | O estado aberto não tinha líder disponível. A foto aberta mostra o formulário e “Nenhum líder disponível ainda”; a linha com seta não foi renderizada. |
| Bíblia | 37 / 55 | 37 / 54 | Conteúdo carregado. “Minhas marcações →” perdeu a seta. As duas estão fora da lei pelo limite de 12 ações, com contagem de ações igual. |

Todas as demais medidas ficaram dentro do limite 12/80. Agenda foi medida em 15/72 antes, fora da lei; não alterei essa tela. Não consegui abrir Visitantes por clique: Maria serve somente em Louvor (consulta local a `person_ministries`) e o líder entra no painel, sem a navegação de membro. Não encontrei cursos nem matrícula para exibir “Abrir meu curso” ou “Quero me inscrever”; nenhum dado foi criado.

MD5 das fotos abertas:
- Início antes/depois `143ca8b09473d52a6d1e93d9b157a92c` / `143ca8b09473d52a6d1e93d9b157a92c`.
- Mensagens antes/depois `2d8adf3af460dca5d396f0883cea3207` / `2d8adf3af460dca5d396f0883cea3207`.
- Caminhada antes/depois `325a52194d3347ffa0ecff574cef92dc` / `5beab52211bf3ae9d19ffe75191eb398`.
- Primeiro acesso antes/depois `18d441cefb48747b45715960128b938e` / `46fe2a7e8d9139088e9e59c5c745dccb`.
- Mural antes/depois `ddb2f9fbfd0d6d343cabb07f0608c7ba` / `ddb2f9fbfd0d6d343cabb07f0608c7ba`.
- Nova mensagem antes/depois `04f54e1a110c65c2a957aeed9e74ad9f` / `04f54e1a110c65c2a957aeed9e74ad9f`.
- Bíblia antes/depois `2da11490d388ec62c61434c352e1f361` / `a2afa421fbe690b45fc8d70bbbf62bf0`.
- Agenda antes, sem alteração de rota `1ba6e87fa86f48d5401bd378114a3346`.

Também removi as setas de “Voltar ao painel” e dos dois botões “Gerenciar” em `MobileApp.tsx`. As novas chaves de tradução foram incluídas nos catálogos pt-BR, en-US e es-ES e no índice de referências. O botão “Voltar ao painel” pertence ao modo de pré-visualização, que não é instanciado atualmente. Os botões “Gerenciar” aparecem no modo self quando a conta tem permissão de gestão. Tentei capturar por cliques: `lider@teste.local` abriu o app sem o callback de gestão; `master@teste.local` abriu o primeiro acesso incompleto do membro, sem chegar à tela com esses botões. Não alterei o perfil para ultrapassar o primeiro acesso. Portanto, não há foto pós-mudança da ramificação de “Gerenciar”; as fotos e medições documentadas na tabela cobrem as telas já acessíveis da história.

TypeScript e ESLint passaram sem erros; `Inicio.tsx` mantém quatro avisos preexistentes. A busca de setas e chevrons nos rótulos de botão da trilha não encontrou outros casos funcionais. O status foi concluído com autorização para editar `MobileApp.tsx`, apesar da reserva G17 obsoleta.

## Notas
Concluída por codex. As fotos e medições das telas existentes estão documentadas acima; as três mudanças em `MobileApp.tsx` foram validadas por TypeScript, ESLint e revisão dos catálogos de tradução.
