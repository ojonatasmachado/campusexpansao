# Service: inventário e cobertura do mapa

Data: 20/10/2026. Fonte: checkout local. Análise estática, sem acesso ao banco de produção ou execução das jornadas autenticadas.

12 jornadas, 55 momentos, 6 categorias e 5 atores. Sentimentos não pontuados. Pensamentos, dores e oportunidades são hipóteses, não pesquisa com usuários.

## Cobertura por módulo

| Módulo | Jornada | Fonte |
|---|---|---|
| acesso | 02 | [manifesto](../../app/service/modules/acesso/manifest.ts) |
| aniversarios | 03 | [manifesto](../../app/service/modules/aniversarios/manifest.ts) |
| batismos | 09 | [manifesto](../../app/service/modules/batismos/manifest.ts) |
| biblia | 09 | [manifesto](../../app/service/modules/biblia/manifest.ts) |
| configuracao | 02 | [manifesto](../../app/service/modules/configuracao/manifest.ts) |
| contribuir | 09 | [manifesto](../../app/service/modules/contribuir/manifest.ts) |
| conversas | 08 | [manifesto](../../app/service/modules/conversas/manifest.ts) |
| cuidado | 03 | [manifesto](../../app/service/modules/cuidado/manifest.ts) |
| cultos | 06 | [manifesto](../../app/service/modules/cultos/manifest.ts) |
| cursos | 09 | [manifesto](../../app/service/modules/cursos/manifest.ts) |
| decisoes | 04 | [manifesto](../../app/service/modules/decisoes/manifest.ts) |
| ensaios | 06 | [manifesto](../../app/service/modules/ensaios/manifest.ts) |
| entrada | 01 / 02 | [manifesto](../../app/service/modules/entrada/manifest.ts) |
| escalas | 05 | [manifesto](../../app/service/modules/escalas/manifest.ts) |
| espacos | 06 | [manifesto](../../app/service/modules/espacos/manifest.ts) |
| financeiro | 10 | [manifesto](../../app/service/modules/financeiro/manifest.ts) |
| grupos | 04 | [manifesto](../../app/service/modules/grupos/manifest.ts) |
| historia | 11 | [manifesto](../../app/service/modules/historia/manifest.ts) |
| identidade | 11 | [manifesto](../../app/service/modules/identidade/manifest.ts) |
| igreja | 02 | [manifesto](../../app/service/modules/igreja/manifest.ts) |
| inicio | 12 | [manifesto](../../app/service/modules/inicio/manifest.ts) |
| kids | 07 | [manifesto](../../app/service/modules/kids/manifest.ts) |
| mural | 08 | [manifesto](../../app/service/modules/mural/manifest.ts) |
| oracao | 09 | [manifesto](../../app/service/modules/oracao/manifest.ts) |
| pagina | 01 | [manifesto](../../app/service/modules/pagina/manifest.ts) |
| perfil | 12 | [manifesto](../../app/service/modules/perfil/manifest.ts) |
| pesquisas | 08 | [manifesto](../../app/service/modules/pesquisas/manifest.ts) |
| pessoas | 04 | [manifesto](../../app/service/modules/pessoas/manifest.ts) |
| quadros | 06 | [manifesto](../../app/service/modules/quadros/manifest.ts) |
| relatorios | 11 | [manifesto](../../app/service/modules/relatorios/manifest.ts) |
| reunioes | 06 | [manifesto](../../app/service/modules/reunioes/manifest.ts) |
| secretaria | 11 | [manifesto](../../app/service/modules/secretaria/manifest.ts) |
| times | 05 | [manifesto](../../app/service/modules/times/manifest.ts) |
| visitantes | 03 | [manifesto](../../app/service/modules/visitantes/manifest.ts) |

## Limites e achados

- O código atual prevalece sobre JORNADAS_PONTE.md: financeiro, Pix, autocadastro, entrada por código, importação, boletim, oração, aniversários, geração por período e secretaria já têm arquivos de implementação. Isso não comprova migrações e configuração em produção.
- O mapa agrupa cenários em 12 jornadas. Não representa todas as combinações possíveis de papel, igreja, requisito e estado.
- A declaração de carteirinha no manifesto usa /service/carteirinha; a página concreta é /service/carteirinha/[codigo]. Verificar o link emitido e o manifesto em uma revisão funcional.
- Financeiro carrega até 2000 lançamentos por mês em dados.ts. A operação em volumes maiores merece validação.
- PublicarEscala grava em lotes de 300 e depois solicita aviso. Hipótese: falha intermediária pode exigir conferência da publicação parcial e da entrega. Não foi simulada falha.
- Entrada com aprovação, etapas da caminhada e pedidos para servir dependem de outra pessoa. Hipótese: tornar estado e responsável visíveis reduz incerteza.
- Push depende de assinatura, preferências e janela de silêncio. Agendamento de publicação e envio de notificação são processos diferentes.
- Pendentes de validação real: políticas RLS aplicadas, migrações instaladas, entrega de email/push, convites expirados, aprovação entre contas, pagamentos externos e conferência presencial de retirada Kids.
- Não foram avaliados comercialização/assinatura, outras áreas CE.X ou fluxos que só existam fora das fontes inventariadas.

## Rotas concretas

- `app/[slug]/entrar/page.tsx`
- `app/[slug]/page.tsx`
- `app/[slug]/visita/page.tsx`
- `app/api/service/cep-lookup/route.ts`
- `app/api/service/cnpj-lookup/route.ts`
- `app/api/service/cron/lembretes/route.ts`
- `app/api/service/entrada/route.ts`
- `app/api/service/members/accept-invite/route.ts`
- `app/api/service/members/invite/route.ts`
- `app/api/service/push/notify/route.ts`
- `app/api/service/push/subscribe/route.ts`
- `app/api/service/push/unsubscribe/route.ts`
- `app/igreja/[slug]/page.tsx`
- `app/service/aula-checkin/page.tsx`
- `app/service/carteirinha/[codigo]/page.tsx`
- `app/service/checkin/page.tsx`
- `app/service/conexao/page.tsx`
- `app/service/convite/page.tsx`
- `app/service/demo/page.tsx`
- `app/service/kids-checkin/page.tsx`
- `app/service/login/page.tsx`
- `app/service/nova-senha/page.tsx`
- `app/service/onboarding/page.tsx`
- `app/service/page.tsx`
- `app/service/participar/[codigo]/page.tsx`
- `app/service/participar/page.tsx`

## Contratos observados por arquivo

Chamadas literais a tabelas e RPCs. Chamadas dinâmicas não são expandidas; schema e autorização devem ser conferidos na fonte.

### app/[slug]/visita/page.tsx

Tabelas: `churches`.

### app/api/service/cron/lembretes/route.ts

Tabelas: `announcement_reads`, `announcements`, `app_events`, `members`, `people`, `push_subscriptions`.

### app/api/service/entrada/route.ts

Tabelas: `entry_requests`, `memberships`.

### app/api/service/members/accept-invite/route.ts

Tabelas: `member_invites`, `members`, `memberships`, `people`.

### app/api/service/members/invite/route.ts

Tabelas: `member_invites`, `members`, `memberships`, `people`.

### app/api/service/push/notify/route.ts

Tabelas: `members`, `memberships`.

### app/api/service/push/subscribe/route.ts

Tabelas: `people`, `push_subscriptions`.

### app/api/service/push/unsubscribe/route.ts

Tabelas: `people`, `push_subscriptions`.

### app/lib/service-avisos.ts

Tabelas: `app_events`, `people`, `push_queue`, `push_subscriptions`.

### app/lib/service-entrada.ts

Tabelas: `entry_links`.

### app/lib/service-invite.ts

Tabelas: `churches`, `member_invites`.

### app/lib/service-mural-agendado.ts

Tabelas: `announcements`, `members`.

### app/service/AulaCheckin.tsx

Tabelas: `course_lessons`, `enrollments`, `lesson_attendance`, `members`, `timeline_events`.

### app/service/CheckIn.tsx

Tabelas: `event_attendance`, `events`.

### app/service/CursoDrawer.tsx

Tabelas: `enrollments`.

### app/service/CursoEditor.tsx

Tabelas: `course_lessons`, `course_modules`, `courses`.

### app/service/KidsCheckin.tsx

Tabelas: `kids_attendance`, `kids_sessions`.

### app/service/MobileApp.tsx

Tabelas: `card_comments`, `cards`, `child_guardians`, `children`, `kids_attendance`, `kids_event_enrollments`, `people`, `visitors`.

RPCs: `my_notifications`, `set_my_notifications`.

### app/service/PublicPageEditor.tsx

Tabelas: `church_links`, `church_page_posts`, `church_page_views`, `churches`.

### app/service/ServiceExactApp.tsx

Tabelas: `announcement_reads`, `announcements`, `baptism_candidates`, `baptism_classes`, `bible_marks`, `boards`, `card_comments`, `cards`, `chat_members`, `chats`, `child_guardians`, `children`, `church_identity`, `churches`, `courses`, `cycles`, `decisions`, `enquete_visto`, `event_schedule_items`, `events`, `fellowship_groups`, `history_entries`, `journey_change_requests`, `kids_classes`, `kids_events`, `meeting_actions`, `meetings`, `members`, `messages`, `ministerial_titles`, `ministries`, `ministry_positions`, `people`, `person_grants`, `person_ministries`, `pesquisas`, `pesquisas_perguntas`, `pesquisas_respostas`, `pesquisas_respostas_perguntas`, `rehearsals`, `reservations`, `respostas`, `respostas_perguntas`, `role_permissions`, `rooms`, `roster_assignments`, `tags`, `timeline_events`, `visitor_notes`, `visitors`, `wall_posts`.

RPCs: `marcar_conversa_lida`, `respond_announcement`, `respond_event`, `respond_my_assignment`, `review_serve_request`, `start_dm`, `update_my_availability`, `update_my_member_contact`.

### app/service/aula-checkin/page.tsx

Tabelas: `course_lessons`, `course_modules`, `courses`, `enrollments`, `lesson_attendance`, `members`, `people`.

### app/service/carteirinha/[codigo]/page.tsx

RPCs: `verificar_carteirinha`.

### app/service/checkin/page.tsx

Tabelas: `churches`, `event_attendance`, `events`, `people`, `roster_assignments`.

### app/service/conexao/page.tsx

Tabelas: `products`.

### app/service/convite/page.tsx

Tabelas: `churches`.

### app/service/kids-checkin/page.tsx

Tabelas: `child_guardians`, `events`, `kids_attendance`, `kids_classes`, `kids_sessions`, `people`.

### app/service/lib/auth-church.ts

Tabelas: `churches`.

### app/service/lib/destinatario.ts

RPCs: `request_recipient`, `swap_candidates`.

### app/service/lib/enquetes.ts

Tabelas: `enquetes`, `perguntas`, `respostas`.

### app/service/lib/importar-membros.ts

Tabelas: `members`, `timeline_events`.

### app/service/lib/kids-checkin.ts

Tabelas: `kids_attendance`.

RPCs: `kids_checkin_session`.

### app/service/lib/medicao.ts

Tabelas: `app_events`.

### app/service/lib/pesquisas.ts

Tabelas: `pesquisas`, `pesquisas_perguntas`, `pesquisas_respostas`, `pesquisas_respostas_perguntas`.

### app/service/lib/requirements.ts

RPCs: `set_requirements`.

### app/service/lib/settings-field.ts

Tabelas: `churches`.

### app/service/lib/text-scale.ts

RPCs: `set_my_text_size`.

### app/service/modules/cuidado/Cuidado.tsx

RPCs: `registrar_cuidado`.

### app/service/modules/entrada/EntradaConfig.tsx

RPCs: `entrada_config`, `entrada_novo_codigo`, `entrada_regra`.

### app/service/modules/entrada/NovosCadastros.tsx

RPCs: `entrada_aprovar`, `entrada_buscar_fichas`, `entrada_pedidos`, `entrada_recusar`.

### app/service/modules/escalas/EscalaExtra.tsx

Tabelas: `events`.

### app/service/modules/escalas/Escalas.tsx

Tabelas: `churches`, `ministry_positions`, `roster_assignments`.

### app/service/modules/escalas/GerarPeriodo.tsx

Tabelas: `events`, `reservations`, `roster_assignments`.

### app/service/modules/escalas/PublicarEscala.tsx

Tabelas: `members`, `roster_assignments`.

### app/service/modules/financeiro/Financeiro.tsx

Tabelas: `fin_offering_counts`.

### app/service/modules/financeiro/Formularios.tsx

Tabelas: `fin_accounts`, `fin_transactions`.

RPCs: `fin_registrar_oferta`.

### app/service/modules/financeiro/dados.ts

Tabelas: `fin_accounts`, `fin_categories`, `fin_funds`, `fin_transactions`.

RPCs: `fin_pessoas`, `fin_preparar`, `fin_saldos`, `fin_saldos_fundos`.

### app/service/modules/mural/Mural.tsx

Tabelas: `announcements`.

### app/service/modules/oracao/oracao.ts

RPCs: `prayer_create`.

### app/service/modules/pessoas/acesso-msg.tsx

Tabelas: `churches`.

### app/service/modules/relatorios/MetricasInternas.tsx

RPCs: `metricas_internas`.

### app/service/modules/secretaria/Carteirinha.tsx

Tabelas: `carteirinhas`.

### app/service/modules/secretaria/RegistroForm.tsx

Tabelas: `registros`.

### app/service/modules/secretaria/Secretaria.tsx

Tabelas: `registros`.

### app/service/modules/visitantes/AutocadastroForm.tsx

RPCs: `visitante_autocadastro`.

### app/service/onboarding/BootstrapChurchForm.tsx

RPCs: `bootstrap_church_org_v2`.

### app/service/onboarding/ConvitesPendentes.tsx

RPCs: `accept_membership`, `decline_membership`.

### app/service/onboarding/page.tsx

Tabelas: `churches`.

RPCs: `entrada_minha`, `my_pending_invites`.

### app/service/page.tsx

Tabelas: `announcement_reads`, `announcement_responses`, `announcements`, `baptism_candidates`, `baptism_classes`, `bible_marks`, `boards`, `cards`, `care_marks`, `chat_members`, `chats`, `child_guardians`, `children`, `church_identity`, `churches`, `course_lessons`, `course_modules`, `courses`, `cycles`, `decisions`, `enrollments`, `event_attendance`, `event_rsvps`, `event_schedule_items`, `events`, `fellowship_groups`, `history_entries`, `journey_change_requests`, `kids_attendance`, `kids_classes`, `kids_event_enrollments`, `kids_events`, `kids_sessions`, `lesson_attendance`, `meeting_actions`, `meetings`, `members`, `memberships`, `messages`, `ministerial_titles`, `ministries`, `ministry_positions`, `people`, `person_grants`, `person_ministries`, `rehearsals`, `requirements`, `reservations`, `role_permissions`, `rooms`, `roster_assignments`, `serve_requests`, `setlist_songs`, `tags`, `timeline_events`, `visitor_notes`, `visitors`, `wall_posts`.

RPCs: `ensure_my_member`, `my_missing_requirements`, `my_text_size`.

### app/service/participar/[codigo]/EntradaForm.tsx

RPCs: `entrada_minha`.

## Arquivos no escopo

- `app/[slug]/ChurchPageView.tsx`
- `app/[slug]/LinkThumb.tsx`
- `app/[slug]/LogoMark.tsx`
- `app/[slug]/SocialRow.tsx`
- `app/[slug]/TrackedLink.tsx`
- `app/[slug]/ViewPing.tsx`
- `app/[slug]/entrar/ThemedLoginForm.tsx`
- `app/[slug]/entrar/layout.tsx`
- `app/[slug]/entrar/page.tsx`
- `app/[slug]/layout.tsx`
- `app/[slug]/page.tsx`
- `app/[slug]/templates/TemplateEditorial.tsx`
- `app/[slug]/templates/TemplateSimples.tsx`
- `app/[slug]/templates/TemplateVitrine.tsx`
- `app/[slug]/visita/layout.tsx`
- `app/[slug]/visita/page.tsx`
- `app/api/service/cep-lookup/route.ts`
- `app/api/service/cnpj-lookup/route.ts`
- `app/api/service/cron/lembretes/route.ts`
- `app/api/service/entrada/route.ts`
- `app/api/service/members/accept-invite/route.ts`
- `app/api/service/members/invite/route.ts`
- `app/api/service/push/notify/route.ts`
- `app/api/service/push/subscribe/route.ts`
- `app/api/service/push/unsubscribe/route.ts`
- `app/igreja/[slug]/page.tsx`
- `app/lib/service-avisos.ts`
- `app/lib/service-entrada.ts`
- `app/lib/service-invite.ts`
- `app/lib/service-mural-agendado.ts`
- `app/service/AccentField.tsx`
- `app/service/AccessContext.tsx`
- `app/service/AulaCheckin.tsx`
- `app/service/AuthShell.tsx`
- `app/service/CepInput.tsx`
- `app/service/CheckIn.tsx`
- `app/service/ChurchLockup.tsx`
- `app/service/CursoDrawer.tsx`
- `app/service/CursoEditor.tsx`
- `app/service/DialogosAcessiveis.tsx`
- `app/service/EventoShare.tsx`
- `app/service/HelpSystem.tsx`
- `app/service/IdentidadeFields.tsx`
- `app/service/ImageCropper.tsx`
- `app/service/ImageUpload.tsx`
- `app/service/KidsCheckin.tsx`
- `app/service/MobileApp.tsx`
- `app/service/PasswordInput.tsx`
- `app/service/PhotoPicker.tsx`
- `app/service/PublicPageEditor.tsx`
- `app/service/PwaBootstrap.tsx`
- `app/service/RequisitosEditor.tsx`
- `app/service/ServiceExactApp.tsx`
- `app/service/ServiceTheme.tsx`
- `app/service/TextSizeSlider.tsx`
- `app/service/ThemePicker.tsx`
- `app/service/TopUserMenu.tsx`
- `app/service/aula-checkin/AulaCheckinLandingClient.tsx`
- `app/service/aula-checkin/page.tsx`
- `app/service/carteirinha/[codigo]/page.tsx`
- `app/service/checkin/CheckinLandingClient.tsx`
- `app/service/checkin/page.tsx`
- `app/service/conexao/page.tsx`
- `app/service/convite/ConviteForm.tsx`
- `app/service/convite/page.tsx`
- `app/service/demo/page.tsx`
- `app/service/demo/pior-caso.ts`
- `app/service/kids-checkin/KidsCheckinClient.tsx`
- `app/service/kids-checkin/page.tsx`
- `app/service/layout.tsx`
- `app/service/lib/agenda.ts`
- `app/service/lib/aulas.ts`
- `app/service/lib/auth-church.ts`
- `app/service/lib/avisar.ts`
- `app/service/lib/color.ts`
- `app/service/lib/contexto-dia.ts`
- `app/service/lib/csv.ts`
- `app/service/lib/date.ts`
- `app/service/lib/destinatario.ts`
- `app/service/lib/enquetes.ts`
- `app/service/lib/historico.ts`
- `app/service/lib/html-seguro.ts`
- `app/service/lib/icons.tsx`
- `app/service/lib/ics.ts`
- `app/service/lib/importar-membros.ts`
- `app/service/lib/iniciais.ts`
- `app/service/lib/kids-checkin.ts`
- `app/service/lib/kids.ts`
- `app/service/lib/medicao.ts`
- `app/service/lib/notify-push.ts`
- `app/service/lib/pesquisas.ts`
- `app/service/lib/pessoas.ts`
- `app/service/lib/planilha.ts`
- `app/service/lib/plural.ts`
- `app/service/lib/requirements.ts`
- `app/service/lib/settings-field.ts`
- `app/service/lib/silencio.ts`
- `app/service/lib/supabase-browser.ts`
- `app/service/lib/supabase.ts`
- `app/service/lib/telefone.ts`
- `app/service/lib/text-scale.ts`
- `app/service/lib/theme.ts`
- `app/service/lib/upload-image.ts`
- `app/service/lib/video.ts`
- `app/service/lib/vocabulario-context.tsx`
- `app/service/lib/vocabulario.ts`
- `app/service/login/LoginForm.tsx`
- `app/service/login/page.tsx`
- `app/service/login/useServiceLoginForm.ts`
- `app/service/modules/_modelo/manifest.ts`
- `app/service/modules/acesso/manifest.ts`
- `app/service/modules/aniversarios/Aniversariantes.tsx`
- `app/service/modules/aniversarios/CartaoDoTime.tsx`
- `app/service/modules/aniversarios/aniversarios.ts`
- `app/service/modules/aniversarios/manifest.ts`
- `app/service/modules/batismos/manifest.ts`
- `app/service/modules/biblia/manifest.ts`
- `app/service/modules/configuracao/Assistente.tsx`
- `app/service/modules/configuracao/manifest.ts`
- `app/service/modules/configuracao/setup.ts`
- `app/service/modules/contribuir/Contribuir.tsx`
- `app/service/modules/contribuir/ContribuirConfig.tsx`
- `app/service/modules/contribuir/manifest.ts`
- `app/service/modules/contribuir/pix.ts`
- `app/service/modules/conversas/manifest.ts`
- `app/service/modules/cuidado/Cuidado.tsx`
- `app/service/modules/cuidado/cuidado.ts`
- `app/service/modules/cuidado/manifest.ts`
- `app/service/modules/cultos/manifest.ts`
- `app/service/modules/cursos/manifest.ts`
- `app/service/modules/decisoes/manifest.ts`
- `app/service/modules/define.ts`
- `app/service/modules/ensaios/manifest.ts`
- `app/service/modules/entrada/EntradaConfig.tsx`
- `app/service/modules/entrada/NovosCadastros.tsx`
- `app/service/modules/entrada/manifest.ts`
- `app/service/modules/escalas/Cobertura.tsx`
- `app/service/modules/escalas/EscalaExtra.tsx`
- `app/service/modules/escalas/Escalas.tsx`
- `app/service/modules/escalas/GerarPeriodo.tsx`
- `app/service/modules/escalas/PublicarEscala.tsx`
- `app/service/modules/escalas/candidatos.ts`
- `app/service/modules/escalas/cobertura.ts`
- `app/service/modules/escalas/manifest.ts`
- `app/service/modules/escalas/periodo.ts`
- `app/service/modules/escalas/regras.ts`
- `app/service/modules/escalas/rodizio.ts`
- `app/service/modules/espacos/manifest.ts`
- `app/service/modules/fila.ts`
- `app/service/modules/financeiro/Financeiro.tsx`
- `app/service/modules/financeiro/Formularios.tsx`
- `app/service/modules/financeiro/dados.ts`
- `app/service/modules/financeiro/dinheiro.ts`
- `app/service/modules/financeiro/manifest.ts`
- `app/service/modules/grupos/manifest.ts`
- `app/service/modules/historia/manifest.ts`
- `app/service/modules/identidade/manifest.ts`
- `app/service/modules/igreja/manifest.ts`
- `app/service/modules/inicio/Saude.tsx`
- `app/service/modules/inicio/manifest.ts`
- `app/service/modules/inicio/saude.ts`
- `app/service/modules/kids/manifest.ts`
- `app/service/modules/mural/Boletim.tsx`
- `app/service/modules/mural/Mural.tsx`
- `app/service/modules/mural/boletim-imagem.ts`
- `app/service/modules/mural/boletim.ts`
- `app/service/modules/mural/estado.ts`
- `app/service/modules/mural/manifest.ts`
- `app/service/modules/oracao/Oracao.tsx`
- `app/service/modules/oracao/OracaoPainel.tsx`
- `app/service/modules/oracao/manifest.ts`
- `app/service/modules/oracao/oracao.ts`
- `app/service/modules/pagina/manifest.ts`
- `app/service/modules/perfil/manifest.ts`
- `app/service/modules/pesquisas/manifest.ts`
- `app/service/modules/pessoas/ImportarMembros.tsx`
- `app/service/modules/pessoas/Pessoas.tsx`
- `app/service/modules/pessoas/acesso-msg.tsx`
- `app/service/modules/pessoas/manifest.ts`
- `app/service/modules/quadros/manifest.ts`
- `app/service/modules/registry.ts`
- `app/service/modules/relatorios/MetricasInternas.tsx`
- `app/service/modules/relatorios/manifest.ts`
- `app/service/modules/reunioes/manifest.ts`
- `app/service/modules/secretaria/Carteirinha.tsx`
- `app/service/modules/secretaria/RegistroForm.tsx`
- `app/service/modules/secretaria/Secretaria.tsx`
- `app/service/modules/secretaria/imprimir.tsx`
- `app/service/modules/secretaria/livros.ts`
- `app/service/modules/secretaria/manifest.ts`
- `app/service/modules/times/manifest.ts`
- `app/service/modules/visitantes/AutocadastroDados.tsx`
- `app/service/modules/visitantes/AutocadastroForm.tsx`
- `app/service/modules/visitantes/AutocadastroPainel.tsx`
- `app/service/modules/visitantes/autocadastro.ts`
- `app/service/modules/visitantes/manifest.ts`
- `app/service/nova-senha/NovaSenhaForm.tsx`
- `app/service/nova-senha/page.tsx`
- `app/service/onboarding/BootstrapChurchForm.tsx`
- `app/service/onboarding/ConvitesPendentes.tsx`
- `app/service/onboarding/PedidoEmEspera.tsx`
- `app/service/onboarding/page.tsx`
- `app/service/page.tsx`
- `app/service/painel/caminhada.ts`
- `app/service/painel/erros.ts`
- `app/service/painel/form/FormScreen.tsx`
- `app/service/painel/ui.tsx`
- `app/service/participar/CodigoForm.tsx`
- `app/service/participar/[codigo]/EntradaForm.tsx`
- `app/service/participar/[codigo]/page.tsx`
- `app/service/participar/page.tsx`
