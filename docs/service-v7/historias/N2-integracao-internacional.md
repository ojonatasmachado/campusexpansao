---
id: N2
titulo: Concluir integração de idiomas e moeda nas telas
tipo: codigo
status: reservada
quem: claude
desde: 2026-11-12
branch: historia/N2-integracao-internacional
depende: [N1]
tamanho: G
---

## Por quê
Continuidade explícita da entrega parcial N1, autorizada pelo usuário em 25/10/2026: publicar o possível, preservando a divisão de trabalho. A base de bastidor não equivale à interface inteira traduzida. Histórias E/I/M/G continuam com Claude; não assumidas por Codex.

## Arquivos (trilho)
- `docs/service-v7/historias/N2-integracao-internacional.md`
- `scripts/internacional/preparar-jsx.ts` (lê também este trilho)
- `app/service/lib/internacional/mensagens/` (catálogos)
- `app/service/ui/` (fatia 1)
- `app/service/membro/Agenda.tsx` (fatia 1)
- `app/service/membro/Biblia.tsx` (fatia 1)
- `app/service/membro/comum.tsx` (fatia 1)
- `app/service/membro/Cursos.tsx` (fatia 1)
- `app/service/membro/Disponibilidade.tsx` (fatia 1)
- `app/service/membro/Kids.tsx` (fatia 1)
- `app/service/membro/Mural.tsx` (fatia 1)
- `app/service/membro/Onboarding.tsx` (fatia 1)
- `app/service/membro/Onde.tsx` (fatia 1)
- `app/service/membro/Visitantes.tsx` (fatia 1)
- `app/service/painel/telas/Agenda.tsx` (fatia 2)
- `app/service/painel/telas/Evento.tsx` (fatia 2)
- `app/service/painel/telas/EventoSerie.tsx` (fatia 2)
- `app/service/painel/telas/Visitantes.tsx` (fatia 2)
- `app/service/painel/telas/Reunioes.tsx` (fatia 2)
- `app/service/painel/telas/Identidade.tsx` (fatia 2)
- `app/service/painel/telas/Kids.tsx` (fatia 2)
- `app/service/painel/telas/Formacao.tsx` (fatia 2)
- `app/service/painel/telas/FichaPessoa.tsx` (fatia 3)
- `app/service/painel/telas/Times.tsx` (fatia 3)
- `app/service/painel/telas/Pesquisas.tsx` (fatia 3)
- `app/service/painel/telas/ficha/VisitanteDrawer.tsx` (fatia 3)
- `app/service/painel/telas/Caminhada.tsx` (fatia 3)
- `app/service/painel/telas/Relatorios.tsx` (fatia 3)
- `app/service/painel/telas/Inicio.tsx` (fatia 3)
- `app/service/painel/telas/Conversas.tsx` (fatia 3)
- `app/service/painel/telas/configuracao/CongregacaoEditModal.tsx` (fatia 3)
- `app/service/painel/form/FField.tsx` (fatia 3)
- `app/service/painel/telas/configuracao/AcessosCard.tsx` (fatia 3)
- `app/service/painel/telas/Panorama.tsx` (fatia 3)
- `app/service/painel/telas/ficha/MemberEditModal.tsx` (fatia 3)
- `app/service/painel/telas/configuracao/TagElencoModal.tsx` (fatia 3)
- `app/service/painel/telas/ficha/JornadaEditModal.tsx` (fatia 3)
- `app/service/painel/telas/ficha/AddToMinistryModal.tsx` (fatia 3)
- `app/service/painel/form/FormScreen.tsx` (fatia 3)
- `app/service/painel/telas/ServiceModal.tsx` (fatia 3)
- `app/service/painel/telas/ficha/PersonTimeline.tsx` (fatia 3)
- `app/service/modules/mural/Mural.tsx` (fatia 4a)
- `app/service/modules/mural/Boletim.tsx` (fatia 4a)
- `app/service/modules/escalas/Escalas.tsx` (fatia 4a)
- `app/service/modules/escalas/GerarPeriodo.tsx` (fatia 4a)
- `app/service/modules/escalas/EscalaExtra.tsx` (fatia 4a)
- `app/service/modules/escalas/PublicarEscala.tsx` (fatia 4a)
- `app/service/modules/mapa/Mesa.tsx` (fatia 4a)
- `app/service/modules/mapa/MapaIgreja.tsx` (fatia 4a)
- `app/service/modules/mapa/Emergencia.tsx` (fatia 4a)
- `app/service/modules/mapa/LiberarMapa.tsx` (fatia 4a)
- `app/service/modules/mapa/Rota.tsx` (fatia 4a)
- `app/service/modules/mapa/LinhaDoTempo.tsx` (fatia 4a)
- `app/service/modules/mapa/CriarArea.tsx` (fatia 4a)
- `app/service/modules/mapa/Pontos.tsx` (fatia 4a)
- `app/service/modules/mapa/AreaDesenhada.tsx` (fatia 4a)
- `app/service/modules/mapa/MapaBase.tsx` (fatia 4a)
- `app/service/modules/pessoas/Pessoas.tsx` (fatia 4b)
- `app/service/modules/pessoas/ImportarMembros.tsx` (fatia 4b)
- `app/service/modules/pessoas/Duplicados.tsx` (fatia 4b)
- `app/service/modules/pessoas/acesso-msg.tsx` (fatia 4b)
- `app/service/modules/pessoas/PedidosCaminhada.tsx` (fatia 4b)
- `app/service/modules/configuracao/Assistente.tsx` (fatia 4b)
- `app/service/modules/configuracao/FusoField.tsx` (fatia 4b)
- `app/service/modules/secretaria/RegistroForm.tsx` (fatia 4b)
- `app/service/modules/secretaria/Carteirinha.tsx` (fatia 4b)
- `app/service/modules/secretaria/Secretaria.tsx` (fatia 4b)
- `app/service/modules/contribuir/ContribuirConfig.tsx` (fatia 4b)
- `app/service/modules/contribuir/Contribuir.tsx` (fatia 4b)
- `app/service/modules/entrada/NovosCadastros.tsx` (fatia 4b)
- `app/service/modules/entrada/EntradaConfig.tsx` (fatia 4b)
- `app/service/modules/aniversarios/Aniversariantes.tsx` (fatia 4b)
- `app/service/modules/aniversarios/CartaoDoTime.tsx` (fatia 4b)
- `app/service/modules/cuidado/Cuidado.tsx` (fatia 4b)
- `app/service/modules/visitantes/AutocadastroPainel.tsx` (fatia 4b)
- `app/service/modules/visitantes/AutocadastroForm.tsx` (fatia 4b)
- `app/service/modules/visitantes/Convidar.tsx` (fatia 4b)
- `app/service/modules/visitantes/AutocadastroDados.tsx` (fatia 4b)
- `app/service/modules/grupos/GrupoEditModal.tsx` (fatia 4b)
- `app/service/modules/inicio/Saude.tsx` (fatia 4b)
- `app/service/modules/relatorios/MetricasInternas.tsx` (fatia 4b)
- `app/service/membro/Conversas.tsx` (fatia 5)
- `app/service/modules/oracao/Oracao.tsx` (fatia 5)
- `app/service/painel/telas/Quadros.tsx` (fatia 5)
- `app/service/ServiceExactApp.tsx` (fatia 5)
- `app/service/PublicPageEditor.tsx` (fatia 5)
- `app/service/CursoEditor.tsx` (fatia 5)
- `app/service/CheckIn.tsx` (fatia 5)
- `app/service/AulaCheckin.tsx` (fatia 5)
- `app/service/ThemePicker.tsx` (fatia 5)
- `app/service/KidsCheckin.tsx` (fatia 5)
- `app/service/CursoDrawer.tsx` (fatia 5)
- `app/service/IdentidadeFields.tsx` (fatia 5)
- `app/service/EventoShare.tsx` (fatia 5)
- `app/service/HelpSystem.tsx` (fatia 5)
- `app/service/ImageCropper.tsx` (fatia 5)
- `app/service/RequisitosEditor.tsx` (fatia 5)
- `app/service/AccentField.tsx` (fatia 5)
- `app/service/ImageUpload.tsx` (fatia 5)
- `app/service/TopUserMenu.tsx` (fatia 5)
- `app/service/PhotoPicker.tsx` (fatia 5)
- `app/service/ChurchLockup.tsx` (fatia 5)
- `app/service/loading.tsx` (fatia 5)

Definir na reserva, conferindo especialmente I10: ui/, painel/comum.tsx, modules/inicio/Saude.tsx, modules/financeiro/ e modules/relatorios/. Não trabalhar simultaneamente no branch de outra frente.

## Pronto quando
- Interface inteira pt-BR/en-US/es-ES com frases completas ICU/rich, vocabulário da igreja e conteúdo das pessoas preservados. Integrar componentes do membro, painel, biblioteca e metadados dos manifestos.
- Configuração, campos, totais e exportações financeiras usam BRL/EUR/USD única por organização; escritas declaram x-service-currency. Sem câmbio ou reinterpretação de centavos. Moeda travada após qualquer valor financeiro.
- Capturas de membro e painel nos três idiomas e pseudo, textos extremos, contraste, densidade antes/depois, alvos, console e rolagem aprovados. Corrigir/verificar as três molduras da referência desktop; não alegar validação em aparelho real sem evidência.
- Testes demonstram comportamento com rollout ligado e desligado. Uma nova migração habilita service.international_rollout somente após integração e provas completas. Até lá, ambos os recursos ficam false em produção. Não ativar por console para contornar esta condição.
- CI verde, PR, merge e produção READY.

## Notas
Handoff detalhado: docs/service-v7/INTERNACIONALIZACAO.md, seção “Mensagem para o Claude” e atualizações seguintes. A base inclui 518 mensagens por idioma, extrator, preparador conservador, infraestrutura ICU/pseudo, preferência protegida, moeda/trava e adaptadores com tradutor opcional. Não refazer a base. Consumidores de tela ainda precisam passar useTexto() aos adaptadores; não traduzir status e cabeçalhos persistidos. A reserva N1 termina com a entrega parcial, sem fingir que estes critérios já foram cumpridos.

F1 continua outra história, ainda não iniciada; esbarra no Financeiro da I10. O4/O5 têm verificações de bastidor possíveis em banco local, desde que a reserva não sobreponha seus arquivos. O6 exige famílias reais para concluir Kids, além da prova de volume financeiro.

Fatia 1 (12/11, PR próprio, rollout ainda desligado): tradutor em `ui/` e nas telas do membro do trilho (Agenda, Biblia, comum, Cursos, Disponibilidade, Kids, Mural, Onboarding, Onde, Visitantes). Catálogos de 527 para 924 chaves, nenhuma vazia; plurais com `=1` (no ICU o zero cai em `one` no pt-BR; o `plural()` antigo punha o zero no plural). Prova de pt-BR idêntico: texto de 11 telas (5 do membro, 6 do painel) igual ao do main, exceto os contadores animados do `Contagem` (quadro no meio da animação). Ficou de fora, para fatias seguintes: Inicio, Conversas, Caminhada, MobileApp e ServiceExactApp (reservados por M3, M7 e O8), formatação de datas compartilhada (`dataLonga`, `MESES`), `requirementLabel`, `PERIODOS_AUSENCIA`, e mensagens enviadas a outra pessoa (chat, push), que seguem no idioma de quem envia.

Fatia 2 (12/11, PR próprio, rollout desligado): tradutor em 8 telas do painel (Agenda, Evento, EventoSerie, Visitantes, Reunioes, Identidade, Kids, Formacao). Catálogos de 924 para 1494 chaves, nenhuma vazia, plurais com `=1`. Prova: texto de 16 telas (5 do membro, 11 do painel) igual ao do main, exceto dados vivos (contadores animados e "vistos" dos cartões em Relatórios). Identidade e Reuniões não entraram na comparação (o script não abriu o item no menu); ficaram com as verificações estáticas e o revisor. Pendências de texto pt-BR antigo, mantidas para não mudar o pt-BR nesta fatia: "item(ns)" (Reunioes) e "{n} pessoas" sem plural (Formacao, Reunioes). Textos de arquivos fora da fatia seguem em pt-BR: `imageAuthorizationCopy`, `REPETICOES`, `VISITOR_STAGES`, `BAT_ST_MAP`, `resumoDaSerie`, `feitoDaSerie`.

Fatia 3 (12/11, PR próprio, rollout desligado): tradutor nos 19 arquivos restantes do painel (telas Inicio, Times, Pesquisas, Relatorios, Conversas, Caminhada, Panorama, ServiceModal, FichaPessoa, `ficha/`, três de `configuracao/`, `form/FField` e `form/FormScreen`). Catálogos de 1494 para 1966 chaves, nenhuma vazia. Prova: texto de 13 telas (inclusive a ficha da pessoa) igual ao do main, exceto dados vivos. Pesquisas e os modais não entraram na comparação de tela. O revisor achou "Inserir num {grupo}" (saía "grupo" em vez de "Grupo"): corrigido para `{Grupo}`. Ficam em pt-BR, por virem de arquivos fora da fatia: `saudacao()` e `semanaDe()` (por isso o Início em en/es mistura "Bom dia"), `modules/inicio/saude`, `requirementLabel`, `VISITOR_STAGES`, `BAT_ST_MAP`, `JRN_STEPS`, `PAPEIS_V2`, `identidadeConversa`, datas (`MES_CURTO`, `formatDateBR`) e o CSV de Relatórios. "culto" fixo em "Sem times neste culto." (Panorama) e "{n} grupos" (Relatorios) já eram fixos antes; trocar pelo termo da igreja fica para quando o pt-BR puder mudar.

Fatia 4a (12/11, PR próprio, rollout desligado): tradutor em `modules/mural` (Mural, Boletim), `modules/escalas` (Escalas, GerarPeriodo, EscalaExtra, PublicarEscala) e 10 arquivos de `modules/mapa`. Catálogos de 1966 para 2647 chaves, nenhuma vazia. Prova: texto de 9 telas (membro, Escalas, Mural, Mapa) igual ao do main, exceto os contadores animados do Início; 258 frases com plural, termo ou dados conferidas em 0, 1, 2 e 1284. O revisor corrigiu o sentido de três traduções ("Actuación", "Close" em Encerrar emergência, "1 from church in every") e um caso de nome de time vazio em Escalas. Ficam em pt-BR: push, WhatsApp e aviso de emergência enviados, público do Mural gravado, CSV, e datas montadas por funções fora da fatia (`nomeDoMes`, `DIA_LONGO`, `formatDateBR`, `linguagem.ts`).

Fatia 4b (12/11, PR próprio, rollout desligado): tradutor em 24 arquivos de `modules/` (pessoas, configuracao/Assistente e FusoField, secretaria, contribuir, entrada, aniversarios, cuidado, visitantes/Autocadastro e Convidar, grupos/GrupoEditModal, inicio/Saude, relatorios/MetricasInternas). Catálogos de 2647 para 3259 chaves, nenhuma vazia. Prova: texto de 10 telas igual ao do main, exceto os contadores animados do Início (Aniversariantes e Secretaria fora da comparação, por estarem em grupo recolhido do menu); 150 frases conferidas em 0, 1, 2 e 1284. Revisor: "Saída" compartilhada entre a rota e o rol saía "Start" em inglês (agora "Departure"), uma frase do Kids em inglês reescrita. Ficam em pt-BR: mensagens de WhatsApp (acesso, parabéns, convite, autocadastro), carteirinha e folha impressa, cabeçalhos e valores da importação, e textos de arquivos fora da fatia (`setup.ts`, `livros.ts`, `saude.ts`, Pix). A página pública `/[slug]/visita` não tem `ServiceLocaleProvider`: fica em pt-BR até ganhar um. Plurais errados do pt-BR antigo mantidos para não mudar o pt-BR: "# encontro preparados", "# time preparados" (Assistente), "1 pessoas" (Pessoas).

Fatia 5 (12/11, PR próprio, rollout desligado): tradutor em membro/Conversas, modules/oracao/Oracao, painel/telas/Quadros e 18 componentes de `app/service/` (ServiceExactApp, PublicPageEditor, CursoEditor, CursoDrawer, CheckIn, AulaCheckin, KidsCheckin, EventoShare, ThemePicker, AccentField, HelpSystem, IdentidadeFields, ImageCropper, ImageUpload, PhotoPicker, RequisitosEditor, TopUserMenu, loading). Catálogos de 3259 para 3751 chaves, nenhuma vazia. Prova: texto de 8 telas igual ao do main, exceto os contadores animados do Início (Quadros, Oração, check-ins e editores fora da comparação). `loading.tsx` virou client para usar o tradutor (fica sob o provider de `app/service/layout.tsx`). Ficam em pt-BR: conteúdo da página pública, arte e WhatsApp do EventoShare, colunas padrão do Quadro (gravadas), alt do ChurchLockup (componente sem hook), e textos de `lib/theme.ts`, `oracao.ts`, `papelDoDestinatario` (por isso "Vai para {destino}" sai misto em en/es). Para decidir na revisão das traduções: "Concluído" do check-in reaproveita "Completed"; "1 cliques"/"1 visualizações" mantidos no pt-BR. Limpeza menor para depois: `ct(traduzirUi(...))` redundante no CheckIn.
