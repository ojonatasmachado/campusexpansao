# Auditoria · Rodada 2 (pós Fase 17)

> Depois de fechar as 17 fases da recontagem original (`AUDITORIA_COMPLETA_UI.md`),
> o usuário perguntou se ainda faltava algo do protótipo (`evolucoes/service_app/`)
> sem paridade em produção (`app/service/`). A auditoria original não foi
> reconferida arquivo a arquivo do zero — ela vinha sendo tratada como "lista
> fechada". Esta rodada 2 comparou os 23 arquivos `.jsx` do protótipo contra a
> produção, do zero, via 5 agentes em paralelo, sem confiar na lista antiga.
> Resultado: **existem gaps reais e novos**, não cobertos pelas 17 fases.
>
> Convenção: cada item tem ponteiro exato pro protótipo (`arquivo:linha`) e pra
> produção (`arquivo:linha` ou nome de função), e uma nota de por que é um
> comportamento real perdido (não cosmético).

---

## 🔴 Críticos (fluxo central quebrado ou dado descartado em silêncio)

1. **Cadastro de visitante pelo modal genérico sempre falha.**
   `ServiceExactApp.tsx:7799` valida `!value("Nome")` (N maiúsculo) mas o campo
   do form é `k:"nome"` (minúsculo) → `values["Nome"]` nunca existe → sempre
   dispara "Digite o nome do visitante.", mesmo preenchido. O botão "+
   Visitante" nunca cria nada.

2. **Onboarding: a senha criada nunca é salva.**
   Protótipo (`onboarding.jsx:18-19,66`) grava `membro.senha`. Produção
   (`MobileApp.tsx:1105-1205`) tem a etapa "Crie sua senha" completa
   visualmente, mas `onCompleteOnboarding` (chamado em `ServiceExactApp.tsx:928`)
   só recebe `{ email, nasc, bairro }` — nunca chama
   `supabase.auth.updateUser` nem grava senha em lugar nenhum. A tela promete
   e não cumpre.

3. **App do voluntário: Visitantes (avançar etapa / registrar) não persiste.**
   `TabVisitantes` (`MobileApp.tsx:626-757`) usa só `useState` local; não
   existe `onAdvanceVisitorStage`/`onRegisterVisitor` sendo passado de
   `ServiceExactApp.tsx` (confirmado: só `onReadAnnouncement`,
   `onCompleteOnboarding`, `onAddCardComment` existem). A Recepção "registra"
   pelo celular, a UI muda, mas nada entra no banco — some ao atualizar.

4. **App do voluntário: Chat é só leitura, sem responder.**
   `TabConversas` (`MobileApp.tsx:543-585`) mostra mensagens mas **não tem
   input nem botão de enviar**. O protótipo (`chat.jsx:36-68`, reusado no
   mobile) sempre teve isso. Também falta "+ Nova conversa" pra falar com
   líder/pastor (`mobile.jsx:309-337` no protótipo, ausente em produção).

5. **Decisão → Visitante: integração perdida.**
   `DecisaoDrawer.encaminhar()` no protótipo (`jornada.jsx:188`) cria um
   visitante de verdade no funil. Em produção (`ServiceExactApp.tsx:6283-6289`)
   só faz `update({status:"acompanhando"})` na própria decisão — nunca insere
   em `visitors`. A jornada "decisão → visitante → membro", que o próprio
   texto da tela ainda descreve, não acontece mais.

6. **"Enviar mensagem" no drawer de Pessoa/Membro descarta o texto.**
   `ServiceExactApp.tsx:6863,6972` abre um modal sem `action`; em
   `ServiceModal.save()` (linha 7657), sem `action` o modal só fecha — a
   mensagem digitada nunca vira nada. Pior que o protótipo, que ao menos
   mostrava um toast reconhecendo a intenção.

---

## 🟠 Moderados (regra de negócio ou navegação real perdida)

7. **Kanban: responsáveis do card não filtram mais pelo time do quadro.**
   `CardDrawer`/`NovoCard` (`ServiceExactApp.tsx:4237,4345`) usam
   `people.slice(0,12)` fixo em vez de `board.ministry_id` — qualquer quadro
   mostra as 12 primeiras pessoas da igreja como candidato a responsável, não
   só o time dono.

8. **Membros: vínculo com ministério por nome de texto, não por ID.**
   `getMemberMinistries`/`MembroDrawer` (`ServiceExactApp.tsx:1582,6873,6927`)
   comparam `personName === member.name` (string) em vez de usar
   `member.volunteerId` (que já existe e é usado corretamente em
   Conversas). Homônimos mostram ministério errado; renomear alguém quebra o
   vínculo.

9. **Membros: "Ver como voluntário" virou modal cosmético.**
   Não navega mais pro drawer da pessoa (`openPessoa` no protótipo); em
   produção abre um form sem `action.kind`, que só fecha sem salvar
   (`ServiceExactApp.tsx:6969-6971`).

10. **CursoEditor: editar um curso apaga a organização manual do quadro.**
    `CursoEditor.tsx:439` sobrescreve `category` com o campo "Nível" toda vez
    que o curso é editado, desfazendo qualquer reorganização manual feita em
    "Organizar" (`CursoBuilder`, `ServiceExactApp.tsx:3991-4002`).

11. **VisitanteDrawer: beco sem saída na última etapa.**
    Quando o visitante chega em "membro" sem `member_id` vinculado, o
    protótipo mostra CTA "Completar dados de membro →"
    (`visitantes.jsx:258-264`); produção não renderiza nada no lugar
    (`ServiceExactApp.tsx:6564-6572`).

12. **PersonTimeline virou checklist fixo, perdeu histórico real.**
    Protótipo (`jornada.jsx:9-27`) mostra linha do tempo cronológica real
    (data, tipo, autor). Produção (`ServiceExactApp.tsx:6245-6270`) é 5
    booleanos fixos (`JRN_STEPS`), sem data/autor/múltiplos eventos.

13. **ReuniaoDrawer: salvar ata não força mais decisão sobre pendências.**
    Protótipo (`reunioes.jsx:264-271`) abre `BoardChooser` automaticamente se
    sobram ações sem quadro. Produção (`ServiceExactApp.tsx:2905-2914`) só
    salva a ata; virar card no quadro fica opcional e fácil de esquecer.

14. **Config → Grupos & Células perdeu toggle mestre e nome customizável.**
    `config.jsx:230-259` tem `grupos.ativo` (esconde a feature quando
    desligada) e termo customizável. Produção (`ServiceExactApp.tsx:5747-5768`)
    é sempre "Grupos de Comunhão" fixo, sem toggle.

15. **Config → Congregações → Gerir perdeu governança própria e frentes.**
    `CongDrawer` do protótipo (`config.jsx:824-871`) mostra times/ministérios
    e frentes da congregação filha. `CongregacaoEditModal`
    (`ServiceExactApp.tsx:5265-5331`) só edita dados cadastrais.

16. **Config → Igreja perdeu "Horários de culto"; Personalização perdeu
    "dica de senha".** Nenhuma ocorrência de nenhum dos dois em
    `ServiceExactApp.tsx` (protótipo: `config.jsx:84-92,212-218`).

17. **"Quando alguém recusa" virou binário, perdendo "Avisar o líder".**
    Protótipo (`config.jsx:476-488`) tem 2 opções reais (chamar o próximo vs
    avisar o líder e deixar vaga aberta). Produção
    (`ServiceExactApp.tsx:5825-5829`) é um switch on/off só, e o texto nem
    bate com a regra original.

18. **Identidade → "Valores" virou lista rasa.**
    Protótipo: cada valor é `{titulo, texto}` (`igreja.jsx:89-95`). Produção
    (`ServiceExactApp.tsx:7887`) gera só `{title}`, perde a descrição.

19. **EventoShare (arte do evento) ignora nome/logo real da igreja.**
    Sempre mostra "CE.X Service" fixo — `firstChurch.nome`/`logoUrl` existem
    no escopo (usados em `IgrejaLogo`, linha 1044) mas não são passados pro
    componente (`ServiceExactApp.tsx:1202-1207`, `EventoShare.tsx:36,104-113`).

20. **Badge "Visitantes" da sidebar mostra número errado.**
    `ServiceExactApp.tsx:1001`: `badge: visitors.length || visitorsInCare` —
    o `||` faz sempre cair no total bruto (incluindo já convertidos) em vez
    do `visitorsInCare` (correto, já calculado em `page.tsx:1071-1075`).

---

## 🟡 Menores (cosmético ou nice-to-have)

21. Bolha de mensagem própria em Conversas nunca ganha a classe `.me`
    (`ServiceExactApp.tsx:4784`) — todas as mensagens parecem "da outra
    pessoa" visualmente, CSS já suporta mas o JSX não aciona.
22. Busca global (`GlobalSearch`) não inclui resultados de "Função" dentro
    dos times (só Membro/Voluntário/Time), ao contrário de `shell.jsx:345-347`.
23. App do voluntário → Perfil: falta "Trocar senha", toggle de tema,
    toggle de notificações push, e editar telefone/aniversário/bairro depois
    do onboarding inicial.
24. Camada PWA inteira ausente (`pwa.jsx`): sem `manifest.json`, sem banner
    de instalação, sem `beforeinstallprompt`.

---

## Não são gaps (verificado e descartado nos 5 agentes)

- Confirmar/recusar escala e alternar disponibilidade no mobile: também são
  só estado local no protótipo — não é regressão.
- "Publicar & avisar" nas Escalas: mock nos dois lados.
- Check-in por QR (`CheckIn.tsx`/`AulaCheckin.tsx`): boa paridade, produção
  até supera o protótipo nas rotas públicas.
- Relatórios: nada além do já corrigido na Fase 16.
- Composer de visitantes ("Enviar"): mock nos dois lados.

---

## Metodologia desta rodada

5 agentes em paralelo, cada um lendo os dois lados (protótipo + produção
atual) sem confiar na auditoria original nem nas fases já feitas — só
reportaram o que confirmaram de fato no código. Cobertura: todos os 23
arquivos `.jsx` de `evolucoes/service_app/` contra `ServiceExactApp.tsx`
(~8000 linhas) e os arquivos satélite (`MobileApp.tsx`, `CheckIn.tsx`,
`AulaCheckin.tsx`, `EventoShare.tsx`, `CursoEditor.tsx`, `CursoDrawer.tsx`,
`onboarding/*.tsx`).
