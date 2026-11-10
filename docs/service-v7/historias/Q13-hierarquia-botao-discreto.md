---
id: Q13
titulo: Corrigir hierarquia visual do botão discreto
tipo: codigo
status: feita
quem: codex
desde: 2026-11-10
branch: historia/Q13-hierarquia-botao-discreto
depende: []
tamanho: P
---

## Por quê
No painel, Recusar em NovosCadastros chama mais atenção que Aprovar. A variante discreto usa a cor da igreja, enquanto secundario é neutro. Origem: seção 3 do PENDENTES. A etapa 1 entregou diagnóstico e duas propostas. A etapa 2 constrói a opção A, com links de texto fora por decisão do usuário.

## Arquivos (trilho)
- `docs/service-v7/historias/Q13-hierarquia-botao-discreto.md`
- `docs/service-v7/PENDENTES.md`
- `docs/service-v7/BIBLIOTECA.md`
- `app/service/ui/biblioteca.css`
- `app/service/ui/Botao.tsx`
- `app/service/demo/biblioteca/Galeria.tsx`
- `docs/service-v7/historias/screenshots/Q13-*.png`

## Pronto quando
- Discreto sem superfície e texto neutro; hover neutro, foco visível e contraste mínimo 4,5:1 nos temas.
- Alteração visual restrita a btn-ghost e estados em biblioteca.css; regras antigas não voltam a vencer.
- Estados auditados sem depender só de cor, contrato e galeria atualizados.
- Seis fotos de depois abertas, medidas, sem aumentar ações e com md5; dados locais restaurados.
- Links de texto e pedido duplicado registrados no PENDENTES.
- tsc, ESLint, lei 12 estática, componentes, contraste e CI Service verdes; PR sem merge e porta livre.

## Decisão
Em 10/11/2026, o usuário escolheu a opção A: corrigir a peça. Principal cheio na cor da igreja, secundário com superfície neutra, discreto sem superfície e texto neutro; hover neutro leve e foco visível. Mudar somente as regras btn-ghost e seus estados em biblioteca.css. Links de texto (variante texto, panel-link e m6-link) ficam fora desta construção e vão para o PENDENTES. A galeria documenta os quatro níveis e seus estados reais; nenhum estado pode depender só de cor. O pedido duplicado no Início também fica no PENDENTES. Esta decisão prevalece sobre o alcance sugerido na proposta da etapa 1.

## Diagnóstico: intenção e regra que vence

Base: origin/main 65cd8060b, merge da Q12. Leituras: AGENTS §13.8 e §13.17, BIBLIOTECA, Botao.tsx, biblioteca.css, CSS legado, consumidores e galeria real em /service/demo/biblioteca.

- BIBLIOTECA.md, inventário Botão, lista principal, secundario, discreto, perigo e texto e aponta Botao/botaoClasse como peça única. Não define a ordem de saliência, nem documenta que discreto deva ser neutro ou inferior ao secundário. Essa especificação precisa ser acrescentada na etapa 2.
- Botao.tsx: variante omitida é secundario. Painel: principal → btn-pri, secundario → btn-sec, discreto → btn-ghost, texto → panel-link. No toque, discreto é m6-btn sem modificador; texto é m6-link. Portanto trocar para texto hoje não remove o acento.
- Galeria aberta no navegador: Cancelar secundário ao lado de Salvar membro principal (Galeria.tsx:108-109). Aviso com Desfazer usa discreto ao lado dos secundários Abrir janela/gaveta/folha (156). A galeria reproduz o botão colorido; não explica a hierarquia dos quatro níveis e não oferece exemplo direto da variante texto. Não há um contrato explícito na galeria dizendo que o discreto pode competir em cor com a ação preferida.
- biblioteca.css:58-77: principal usa accent-fill/accent-ink; secundário, branco a 8%; discreto, olive a 12% (20% no hover), texto em olive. O comentário da peça diz pílula com véu da cor da igreja. Isso é uma escolha da peça atual, não um vazamento acidental do CSS do site.
- app/service/layout.tsx importa service-app.css antes de ui/biblioteca.css. No CSSOM do painel e da galeria, a regra antiga de service-app.css:939 (fundo transparente, texto muted, borda de 0,5 px) aparece antes da regra da biblioteca. Mesma especificidade; vence a biblioteca posterior. No hover, a regra antiga pede danger, mas a posterior mantém olive e fundo a 20%.
- public/components.css:34 também define um ghost neutro, mas não participa da cascata destas telas: o RootLayout remete essa biblioteca ao grupo (site); nenhuma folha components.css aparece no painel. As duas regras de ghost efetivamente encontradas no CSSOM são a antiga do Service e a nova da biblioteca, no chunk compilado _02hrbcy._.css.

### Prova do CSS computado (sem hover)

| Lugar/controle | Classes | Texto computado | Fundo computado | Borda / raio |
|---|---|---|---|---|
| Início: Aprovar | btn btn-sec btn-sm | rgb(250, 250, 247) | color(srgb 0.980392 0.980392 0.968627 / 0.08) | 1 px / 14 px |
| Início: Recusar | btn btn-ghost btn-sm | rgb(122, 158, 63) | color(srgb 0.478431 0.619608 0.247059 / 0.12) | 0 px / 100 px |
| Entrada: Copiar link | btn btn-sec btn-sm | rgb(250, 250, 247) | branco a 8%, como acima | 1 px / 14 px |
| Entrada: Copiar código / Gerar outro | btn btn-ghost btn-sm | rgb(122, 158, 63) | cor da igreja a 12%, como acima | 0 px / 100 px |
| Galeria: Salvar membro | btn btn-pri | rgb(14, 17, 13) | rgb(122, 158, 63) | 1 px |
| Galeria: Aviso com Desfazer, hover | btn btn-ghost | rgb(122, 158, 63) | color(srgb 0.478431 0.619608 0.247059 / 0.2) | 0 px |

A saliência observada é cromática, não uma medição de atenção humana: Recusar recebe o acento reservado à ação preferida, e Aprovar é neutro. A regra permanente limita a cor da igreja a uma ação por tela, mais aba ativa e a exceção do interruptor ligado. Em Escalas, o principal ainda domina pelo preenchimento, mas há vários discretos com o mesmo acento.

## Inventário dos usos

Comando-base: rg -n 'variante="discreto"' app/service; conferência de ocorrências por AST JSX. Resultado: 61 elementos em 31 arquivos, sendo 1 elemento da galeria e 60 do produto em 30 arquivos. O rg tem 60 linhas porque Assistente contém dois elementos na mesma linha 286. Contam-se locais de código, não instâncias de listas ou quantidade de cliques possíveis.

Dos 60, 26 locais em 18 arquivos podem compartilhar uma linha de ações com secundário ou principal, incluindo variantes omitidas (secundario), links botaoClasse e ações via render prop. A contagem considera um estado em que ambos podem coexistir; não soma controles de ramos mutuamente exclusivos. Um desses 26 é o contrato compartilhado BarraSalvar: aoDescartar só é fornecido pela galeria hoje. Assim, há 25 locais com caminho atual no produto em 17 arquivos, mais esse contrato de biblioteca.

Não conta como mesma linha: botões em coluna (EventoShare), ação no corpo e outra no rodapé (acesso-msg, Quadros, Emergencia), ramo Gerar outro antes da confirmação versus Manter o atual depois, ou apenas outro discreto como vizinho. Tabela conta porque lote de Pessoas insere dois secundários na mesma faixa. Estados condicionais e botões desativados são identificados, sem fingir que os 26 aparecem simultaneamente.

| Arquivo:linha (relativo a app/service) | Uso | Vizinho secundário/principal na linha |
|---|---|---|
| `AulaCheckin.tsx:452` | Marcar presente (aula) | Não |
| `CheckIn.tsx:372` | Marcar presente (culto) | Não |
| `EventoShare.tsx:277` | Fechar compartilhamento | Não |
| `HelpSystem.tsx:182` | Pular tour | Voltar (sec.) / Próximo (pri.) |
| `ImageUpload.tsx:65` | Remover imagem | Trocar/Enviar imagem (sec.) |
| `MobileApp.tsx:630` | Fechar/voltar (Meus times) | Não |
| `MobileApp.tsx:631` | Gerenciar (Meus times) | Não |
| `MobileApp.tsx:679` | Fechar/voltar (app) | Não |
| `MobileApp.tsx:680` | Gerenciar (app) | Não |
| `PublicPageEditor.tsx:349` | Copiar link da página | Salvar endereço (sec.) |
| `PublicPageEditor.tsx:365` | Copiar link do login | Não |
| `PublicPageEditor.tsx:471` | Subir link | Editar (sec.) |
| `PublicPageEditor.tsx:472` | Descer link | Editar (sec.) |
| `PublicPageEditor.tsx:595` | Excluir link | Cancelar (sec.) / Salvar (pri.) |
| `PublicPageEditor.tsx:693` | Excluir notícia | Cancelar (sec.) / Salvar (pri.) |
| `ServiceExactApp.tsx:1223` | Não, obrigado | Continuar (pri.) |
| `modules/aniversarios/Aniversariantes.tsx:48` | Cancelar parabéns | Abrir no WhatsApp (pri., link ou botão) |
| `modules/configuracao/Assistente.tsx:286` | Cancelar ajuste | Salvar/Continuar (pri., conforme fase) |
| `modules/configuracao/Assistente.tsx:286` | Pular esta fase / Fazer depois | Salvar/Continuar (pri., conforme fase) |
| `modules/cuidado/Cuidado.tsx:77` | Cancelar contato | Tipo de contato (sec.) |
| `modules/cuidado/Cuidado.tsx:82` | Justificar por 30 dias | Registrar contato (sec.) |
| `modules/entrada/EntradaConfig.tsx:114` | Copiar código | Copiar link (sec.) |
| `modules/entrada/EntradaConfig.tsx:136` | Manter o atual | Gerar outro (sec.) |
| `modules/entrada/EntradaConfig.tsx:140` | Gerar outro (antes da confirmação) | Não |
| `modules/entrada/NovosCadastros.tsx:159` | Voltar da recusa | Recusar pedido (sec.) |
| `modules/entrada/NovosCadastros.tsx:164` | Cancelar aprovação | Não |
| `modules/entrada/NovosCadastros.tsx:169` | Recusar pedido | Aprovar (sec.) |
| `modules/escalas/Escalas.tsx:459` | Preencher automaticamente | Publicar e avisar (pri.) |
| `modules/escalas/Escalas.tsx:558` | Escalar vaga | Não |
| `modules/escalas/Escalas.tsx:785` | Cancelar escala extra | Não |
| `modules/escalas/GerarPeriodo.tsx:453` | Mudar times, período ou vagas | Não |
| `modules/escalas/GerarPeriodo.tsx:510` | Cancelar escolha de pessoa | Deixar a vaga aberta (sec., se já ocupado) |
| `modules/financeiro/Financeiro.tsx:310` | Editar conta | Não |
| `modules/financeiro/Financeiro.tsx:358` | Cancelar renomeação | Salvar (sec.) |
| `modules/financeiro/Financeiro.tsx:365` | Renomear item | Não |
| `modules/financeiro/Financeiro.tsx:366` | Arquivar/Reativar item | Não |
| `modules/financeiro/Formularios.tsx:59` | Trocar pessoa | Não |
| `modules/financeiro/Formularios.tsx:100` | Ver comprovante | Não |
| `modules/financeiro/Formularios.tsx:102` | Tirar comprovante | Não |
| `modules/financeiro/Formularios.tsx:126` | Pedir confirmação de exclusão | Não |
| `modules/mapa/Emergencia.tsx:292` | Encerrar emergência | Baixar lista (sec.) |
| `modules/mapa/Emergencia.tsx:337` | Ver endereço | Não |
| `modules/mapa/LiberarMapa.tsx:125` | Voltar ao mapa (acessos) | Não |
| `modules/mapa/LiberarMapa.tsx:197` | Voltar ao automático | Cancelar (sec.) / Salvar acesso (pri.) |
| `modules/mapa/Mesa.tsx:96` | Voltar ao mapa (mesa) | Não |
| `modules/mapa/Mesa.tsx:173` | Limpar seleção da mesa | Mensagem / Ver ficha (sec.) |
| `modules/mural/Mural.tsx:478` | Excluir rascunho do mural | Editar/Continuar (sec.) |
| `modules/oracao/Oracao.tsx:272` | Orei / Você orou | Não |
| `modules/pessoas/ImportarMembros.tsx:363` | Voltar etapa da importação | Não |
| `modules/pessoas/acesso-msg.tsx:45` | Restaurar mensagem padrão | Não |
| `painel/telas/Agenda.tsx:242` | Ver salas | Não |
| `painel/telas/Kids.tsx:374` | Remover responsável | Não |
| `painel/telas/Quadros.tsx:70` | Cancelar escolha de quadro | Não |
| `painel/telas/Quadros.tsx:299` | Excluir card | Não |
| `painel/telas/Quadros.tsx:441` | Voltar a Quadros | Não |
| `painel/telas/Reunioes.tsx:410` | Ver no quadro | Não |
| `painel/telas/Reunioes.tsx:415` | Para o quadro | Não |
| `painel/telas/Reunioes.tsx:430` | Todas ao quadro | Não |
| `ui/BarraSalvar.tsx:36` | Descartar alterações | Salvar (pri.); aoDescartar só fornecido pela galeria hoje |
| `ui/Tabela.tsx:116` | Limpar seleção da tabela | Copiar telefones / Baixar planilha (sec.), via lote de Pessoas |

### Alcance além dos 60 JSX

Há seis chamadas literais de botaoClasse({ variante: "discreto" }): EntradaConfig:113 e 125 (Mandar no WhatsApp, Ver a tela da pessoa), visitantes/AutocadastroPainel:92 (WhatsApp), painel/telas/Caminhada:145 e painel/telas/ficha/AddToMinistryModal:72 (Adicionar), conexao/page:113 (link para login). Também recebem btn-ghost.

Dos 60 JSX, 59 usam a família lista, e somente Oracao:272 usa toque. Orei tem estado próprio em .or-orei/.on; mudar apenas btn-ghost não o altera. Logo uma mudança global de btn-ghost alcança 65 locais do produto em 33 arquivos, mais a amostra da galeria. São locais de fonte, não 33 rotas. Existem ainda 34 declarações JSX da variante texto e uma chamada literal de botaoClasse com texto; é um alcance adicional se a opção A também fizer cumprir cor só no principal. Famílias entrada e toque e classes de estado precisam ser separadas nessa revisão, sem aplicar estilo do painel ao login ou neutralizar estados semânticos.

### Cinco telas priorizadas

Critério: consequência da ação e multiplicação do acento, não frequência de uso inventada.

| Tela | Evidência e impacto |
|---|---|
| Início do painel / Novos cadastros | Recusar compete com Aprovar na mesma linha; dois locais mistos no arquivo (Recusar/Aprovar e Voltar/Recusar pedido), três discretos ao todo. Risco de leitura da decisão principal. |
| Configurações / Página pública | Seis discretos, cinco em linhas mistas: copiar endereço, ordenar links e Excluir junto de Salvar nos dois editores. ImageUpload ainda acrescenta Remover junto de Trocar. |
| Configurações / Entrada na igreja | Três discretos JSX, dois em linhas mistas, mais dois links ghost; cópia secundária e geração de link ganham acento sobre Copiar link neutro. |
| Financeiro / cadastros e formulários | Oito discretos nos dois arquivos. Cancelar renomeação compete com Salvar na mesma linha; Renomear/Arquivar e ações de comprovante multiplicam o acento. |
| Escalas | Cinco discretos nos dois arquivos; cabeçalho com Preencher automaticamente e Publicar e avisar, vagas repetidas com Escalar e Cancelar ao lado de Deixar a vaga aberta. O principal domina, mas a cor se espalha. |

## Proposta da etapa 1 (histórico, subordinado à Decisão)

A contagem de telas abaixo é um mapa de regressão agrupado por tela/fluxo, não a afirmação de que arquivo equivale a rota. Janelas e repetições de uma lista não viram telas novas.

### A) Corrigir a peça (recomendada)

- Discreto neutro, sem véu da igreja, com preenchimento ausente ou menor que o secundário; texto legível por tokens neutros, sem reduzir contraste. Secundário preserva superfície neutra; principal preserva accent-fill/accent-ink. Texto fica sem superfície e neutro quando for ação auxiliar. Perigo e estados de domínio continuam semânticos, sem virar ação principal por engano.
- Não basta trocar btn-ghost: panel-link/m6-link hoje também usam olive, então cor só no principal precisa constar no contrato da variante texto e ser conferida nos consumidores. Isso evita propor texto como fuga que mantém o problema. Estado Orei e entrada/login exigem revisão própria das famílias, sem uma regra ampla que apague estados ou pinte o login com o tema da igreja.
- Construção futura: visual em ui/biblioteca.css; contrato no BIBLIOTECA, comentário da peça e galeria com os quatro níveis lado a lado, foco, hover e desativado. Nenhuma função de Aprovar/Recusar muda. Não editar public/components.css, que pertence ao site, nem restaurar o hover vermelho da regra legada por remoção cega do override.
- Alcance mínimo mensurável: 65 locais ghost de produto em 33 arquivos, mais a galeria; texto adiciona 35 declarações literais a revisar. Mapa de 25 telas/fluxos para regressão do ghost: Início; Configurações/Página pública, Entrada, Assistente e Personalização; Escalas; Financeiro; Mapa/Emergência; Mesa; Quem vê o mapa; Pessoas (lote, importação e ficha); Mural; Agenda/salas; Crianças; Quadros; Reuniões; Aniversariantes; check-in de culto; check-in de aula; Compartilhar evento; casca do app; tours; Visitantes/link; Caminhada do painel; Conexão. Mais a galeria. O alcance de texto pode ampliar esse mapa, especialmente Bíblia e relatórios; não é apresentado como 25 rotas exaustivas do sistema.
- Risco: médio/alto de regressão visual pela abrangência compartilhada, baixo de mudança de comportamento porque handlers e dados permanecem. Atenção a botões de vaga repetidos, marcação de estado, CSS específico, claro/escuro, quatro acentos, contraste, foco, hover e alvo. Ganho: o nome discreto passa a corresponder à hierarquia em todos os novos usos.

### B) Corrigir os usos, mantendo a peça

- Trocar auxiliares dos 26 locais mistos por secundario, revisar os seis links auxiliares e escolher conscientemente uma única ação principal em cada estado. Em NovosCadastros, Recusar neutro deixa de superar Aprovar; se Aprovar for promovido a principal, só uma linha pode receber o acento por vez. Não promover todos os Aprovar de uma lista. Não trocar cegamente para texto, que hoje é colorido, nem para perigo, que pode dar ainda mais destaque à recusa.
- Alcance inicial fechado: 26 locais JSX em 18 arquivos (25/17 com caminho atual no produto, mais BarraSalvar na galeria). Mapa de 14 telas/fluxos: Início, Página pública, Entrada, Assistente, Personalização, Escalas, Financeiro, Mapa/Emergência, Mesa, Quem vê o mapa, Pessoas, Mural, Aniversariantes e tours; mais galeria. Os seis links ficam na revisão complementar; Visitantes, Caminhada e Conexão ampliam o mapa se corrigidos também.
- Risco: menor por alteração local, mas médio/alto de omissão e reincidência. Um secundário no lugar do discreto elimina a inversão cromática, porém pode empatar o peso com a ação preferida em vez de ficar abaixo dela. Não resolve os demais discretos isolados ou repetidos, nem a regra de cor nos textos. Exige manter exceções por uso e uma revisão recorrente; portanto não é solução completa para a lei 8.

## Fotos de antes

Todas novas, 1366×860, master@teste.local, login pelo formulário em localhost:3113, networkidle e texto visível, tour fechado, selo Next escondido e conferido. Escalas usa tools/captura-service/foto.mjs diretamente. O foto.mjs não aceita Início do painel nem Entrada: nessas duas, uma cópia temporária fora do repositório preservou login, hidratação, captura e medidor do próprio foto.mjs, acrescentando somente destinos por clique e coleta do CSS computado. Nenhum arquivo da ferramenta foi alterado ou commitado. As três imagens foram abertas e descritas; __medir(24) na mesma tela da foto, sem rolar ou cortar conteúdo por CSS.

| Foto aberta | Conteúdo conferido | Ações / limite | Palavras / limite | MD5 |
|---|---|---|---|---|
| [Novos cadastros](screenshots/Q13-novos-cadastros.png) | Pedido de teste Q13, Aprovar neutro e Recusar na cor da igreja | 33 / 25 | 131 / 100 | ef4b709da047eea1f6d3b539ec071760 |
| [Entrada](screenshots/Q13-entrada.png) | Copiar link neutro; Mandar no WhatsApp, Copiar código, Ver a tela da pessoa e Gerar outro com acento | 41 / 25 | 230 / 100 | c34ae783855b9488469843ee9511a6ef |
| [Escalas](screenshots/Q13-escalas.png) | Louvor, Preencher automaticamente, Publicar e avisar e três Escalar com acento | 35 / 25 | 64 / 100 | 629224e6b066b812ee90a1ff3f0b27ae |

Todas fora da lei de densidade por ações; Início e Entrada também por palavras. Três molduras em todas. Zero alvos abaixo de 24 px e zero rolagem lateral. Entrada tem uma sobreposição preexistente entre a opção Entra direto como membro e a ajuda flutuante; Início e Escalas não têm sobreposição. Nada foi corrigido ou escondido nesta etapa. Apenas tema local escuro medido; contraste multitema, aparelho real e leitor de tela ficam para a construção. Não há foto de depois porque o produto não foi alterado.

## Entrega da etapa 1

Dados locais: pedido criado por /private/tmp/Q13-fixture.sql (BEGIN, INSERT 0 1, COMMIT) e removido (DELETE 1). Snapshots de entry_requests idênticos por cmp; SHA256 dos dois: 37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570. Nenhuma aprovação, recusa, troca de regra, reset ou mudança de senha.

Servidor encerrado: lsof sem listener e bind localhost:3113 OK, porta livre. git diff --exit-code origin/main -- app evolucoes public tools scripts supabase: saída 0. Código de produto, CSS, ferramentas e banco estrutural não alterados. Não se executaram tsc, ESLint, build ou CI por ser entrega de diagnóstico/documentação, sem alteração de código. Nenhum PR aberto. O vínculo Q13 no PENDENTES foi commitado na reserva; o commit final contém somente esta história e as três fotos.

## Notas da etapa 1
Etapa 1 de 2 concluída em 10/11/2026 por codex: diagnóstico, inventário, duas opções e três fotos abertas. História continua reservada e no PENDENTES; construção aguarda decisão do usuário. Nenhuma opção foi aplicada.

## Recomendação da etapa 1
Escolher A: discreto neutro na peça, abaixo do secundário, com o acento reservado à ação principal.
Formalizar também a variante texto e validar as telas críticas nos dois modos antes da construção final.
Usar B apenas como correção localizada de transição, pois mantém o contrato visual contraditório.

## Construção da etapa 2

Apenas .btn-ghost e seus estados mudaram em biblioteca.css: fundo transparente, texto var(--white), hover neutro a 4%, foco com outline neutro de 2 px e offset de 2 px. Desativado mantém disabled e usa opacidade 0,75 para preservar leitura, em vez dos 0,4 herdados de btn. Dimensões, raio, handlers e dados não mudam. Não se adicionou outline:none. public/components.css e a regra antiga em service-app.css ficaram intactos; panel-link e m6-link também.

Contrato registrado no BIBLIOTECA e comentário de Botao. Galeria usa Abas, PainelAba, Cartao e Botao existentes: Botões mostra as quatro variantes, linha desativada e instrução para hover/foco nativos; Outras peças preserva a galeria anterior. A aba é navegação real por teclado/clique, não recorte ou ocultação por CSS para forçar o medidor. A primeira dobra mantém 10 ações e passa de 91 para 61 palavras. Na galeria há duas amostras de principal (ativa/desativada), justificadas pela demonstração dos estados, não duas ações preferidas de um fluxo do produto. Texto continua com a cor antiga e isso está dito na amostra, conforme o recorte decidido.

### Estados auditados

| Caso | Evidência | Resultado |
|---|---|---|
| Orei, modules/oracao/Oracao.tsx:272 | Alterna Orei/Você orou, ícone e aria-pressed={orei}; tamanho toque gera m6-btn, não btn-ghost | Estado já explícito e fora do seletor alterado; nenhum ajuste necessário. |
| Entrada/login, ui/Botao.tsx, login/LoginForm.tsx:138-143, onboarding/PedidoEmEspera.tsx:23-28 | Família entrada gera login-btn/login-link; login mostra Aguarde/Enviando e pedido mostra Saindo; usa desativado | Não corresponde a btn-ghost; texto e atributo nativo continuam informando estado. Nenhum ajuste necessário. |
| Desativado/carregando, ui/Acao.tsx | disabled={desativado || carregando}, aria-busy; setas nos limites, envio e busca usam esses atributos | Estado não depende do matiz; mantém desativação e mudança de opacidade. Na galeria existe a linha Desativados. |
| Escalas, modules/escalas/Escalas.tsx | Vaga diz Escalar; pessoa ocupante tem nome e Selo Aguardando/estado, separados do ghost | Neutralizar Escalar não apaga o estado da vaga. |
| Demais 60 locais e seis botaoClasse do inventário | Não há outro discreto com seleção persistente expressa somente por classe de cor; textos de ação e desativado permanecem | Nenhum estado que exigisse novo Selo ou aria-pressed foi encontrado. Não se inventou estado novo. |

### CSS computado depois

No painel, Recusar continua btn btn-ghost btn-sm, mas agora é rgb(250,250,247), fundo rgba(0,0,0,0), borda 0 px. Aprovar permanece secundário, texto branco sobre superfície neutra de 8%. O CSSOM mostra a regra antiga muted/borda 0,5 px seguida pela regra nova white/borda 0; a nova vence. No hover da galeria, texto permanece neutro e o fundo é branco a 4%, sem o antigo vermelho. O foco é solid, 2 px, cor do texto neutro. Hover sobre o ghost desativado também foi conferido: fundo transparente, borda 0, texto neutro, opacity 0.75 e disabled=true. Nenhum estilo do site foi carregado para substituir a peça.

### Contraste e qualidade

scripts/check-theme-contrast.ts: saída 0 para as oito famílias de neutros. Captura com tools/captura-service/lib/auditoria.mjs (axe) e cores computadas no navegador: 32 combinações (oito famílias no modo próprio, quatro cores de igreja: oliva, barro, azul e roxo), quatro superfícies (ink, graphite, graphite-2, card) e quatro estados (normal, hover, foco e desativado), 512 medições. A matriz aplica superfícies do próprio tema à amostra apenas no navegador do teste, sem gravar CSS ou personalização. As fotos são das telas normais. Branco/neutro é resolvido pelo tema em cada modo; a composição inclui opacidade e superfície real no cálculo de contraste.

| Família | Modo | Menor contraste do discreto / mínimo |
|---|---|---|
| tinta | escuro | 9,19 / 4,5 |
| carvao | escuro | 9,12 / 4,5 |
| noite | escuro | 9,03 / 4,5 |
| cafe | escuro | 9,17 / 4,5 |
| papel | claro | 6,14 / 4,5 |
| branco | claro | 7,19 / 4,5 |
| gelo | claro | 6,86 / 4,5 |
| areia | claro | 6,62 / 4,5 |

Saída final da matriz: configuracoes=32, medidas=512, pior=6.136420647814242. Axe: zero violações e zero verificações incompletas de contraste nas 32 combinações e nas seis fotos finais. Nas seis fotos, nenhum texto abaixo de 12 px, alvo abaixo de 24 px ou rolagem lateral. Foco por Tab visível e desativados nativos conferidos. Aparelho real e leitor de tela não testados.

### Fotos de depois e comparação

Login real master@teste.local; localhost:3113, npm run dev:local, 1366×860. Mesmo método de foto.mjs, com destinos extras e auditoria em cópia temporária fora do repositório; nenhum arquivo da ferramenta foi alterado. Tour fechado, Next escondido e conferido, networkidle/fontes/animações concluídas. __medir(24) na mesma primeira dobra da imagem. Entrada foi recapturada com retorno ao topo depois da auditoria, que deslocava a página; a foto final e a medida final são do mesmo quadro. Nenhuma ação aumentou.

| Foto aberta | Comparação com antes | Ações antes → depois / limite | Palavras depois / limite | MD5 |
|---|---|---|---|---|
| [Galeria antes, etapa 2](screenshots/Q13-galeria-antes-etapa2.png) | Referência anterior: Campos na primeira dobra | 10 → 10 / 25 | 91 / 100 | d6f3ae724f9b744fb48d92499774b9b0 |
| [Novos cadastros depois](screenshots/Q13-depois-novos-cadastros.png) | Pedido de teste Q13; Recusar sem pílula colorida, Aprovar mantém superfície | 33 → 33 / 25 | 131 / 100 | 8d7a8d2e7d93bbc7f665f50f738e1ac4 |
| [Entrada depois](screenshots/Q13-depois-entrada.png) | Copiar código, WhatsApp, Ver a tela e Gerar outro agora neutros | 41 → 41 / 25 | 230 / 100 | caa7a3b20a706ee28bd312c96e45d2fe |
| [Escalas depois](screenshots/Q13-depois-escalas.png) | Preencher e Escalar neutros; Publicar e avisar conserva a cor | 35 → 35 / 25 | 64 / 100 | 0a11f2f98c6b772602e4319ad06858ea |
| [Galeria depois](screenshots/Q13-depois-galeria.png) | Quatro variantes lado a lado; foco e hover reais no discreto; linha desativada | 10 → 10 / 25 | 61 / 100 | 14e84c09eb10bc058e63b43e2f176fcb |
| [Modo claro](screenshots/Q13-depois-claro.png) | Mesma hierarquia em papel; discreto escuro, contorno de foco neutro | 10 → 10 / 25 | 61 / 100 | cb086fd297a905faeac2fa2a759a8c2f |
| [Outra cor](screenshots/Q13-depois-cor.png) | Demo com cor barro C5805A; principal muda, discreto fica neutro | 10 → 10 / 25 | 61 / 100 | 47e3236b189b73f9a587bb3acf3d1f07 |

Início, Entrada e Escalas continuam fora da lei de densidade por ações; Início e Entrada também por palavras. Três molduras herdadas nessas telas. Entrada mantém a sobreposição já registrada da ajuda com Entra direto como membro; não foi corrigida fora do escopo. Galeria tem duas molduras, sem sobreposição e dentro dos limites numéricos. O medidor conta as amostras principal ativa/desativada como dois botões cheios no escuro; é uma demonstração de estados. Cor de texto permanece pendente por decisão do usuário. Não se apresentou a mudança como correção completa de densidade ou de todos os usos de cor.

### Banco e pendências

Pedido criado por script fora do repositório: BEGIN, INSERT 0 1, COMMIT. Removido: DELETE 1. cmp dos snapshots de service.entry_requests: sem diferenças; SHA256 antes/depois 37517e5f3dc66819f61f5a7bb8ace1921282415f10551d2defa5c3eb0985b570. Outra cor foi usada só por parâmetro da demo; nenhuma personalização foi gravada. Sem migração, reset ou mudança de senha. As duas pendências solicitadas foram acrescentadas na seção 3: links de texto e pedido de conta duplicado (lei 14).

## Verificações finais e notas

TypeScript (npx tsc --noEmit -p .), ESLint de Botao.tsx/Galeria.tsx, lei 12 estática, componentes, internacionalização, check-theme-contrast.ts e npm run build: saída 0. No CSS, somente btn-ghost e seus estados mudaram. Os quatro exemplos da galeria geram avisos visíveis; desativados permanecem bloqueados; Outras peças abre Campos e janela, que fecha com Esc; console sem erro inesperado. Hover no desativado conferido neutro. Não houve alteração dos legados, de Orei ou do tema. Servidor encerrado, lsof sem listener e bind localhost:3113 OK, porta livre.

## Notas
Feita em 10/11/2026 por codex: opção A construída no recorte decidido, estados auditados, contrato e galeria atualizados, seis fotos de depois e referência da galeria abertas, 512 medições de contraste aprovadas, ações sem aumento, banco restaurado e servidor encerrado. Q13 retirada do PENDENTES; links de texto e pedido duplicado permanecem lá. Densidade e sobreposição herdadas registradas. Aparelho real e leitor de tela ficaram fora. PR para main, sem merge.
