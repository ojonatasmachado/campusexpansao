---
id: O9
titulo: Convidar um amigo com link que já diz quem convidou
tipo: codigo
status: feita
quem: claude
desde: 2026-11-12
branch: historia/O9-convidar-amigo
depende: []
tamanho: P
---

## Por quê
O membro só consegue compartilhar evento, não convidar alguém para a igreja. E o "Quem te convidou?" do autocadastro de visitante é texto livre. Decisão D6 de 04/11, Onda 1 (MANIFESTO 2c.5); junta os dois pontos da F2 (convidar amigo e informar quem convidou).

## Arquivos (trilho)
- `app/service/membro/Inicio.tsx`
- `app/service/membro/Perfil.tsx`
- `app/service/modules/visitantes/AutocadastroForm.tsx`
- `app/service/modules/visitantes/autocadastro.ts`
- `supabase/migrations/0109_service_convite_amigo.sql` (nova) e `docs/service-v7/producao.sql`
- `app/[slug]/visita/page.tsx`, `app/service/modules/visitantes/Convidar.tsx` (novo), `app/service/modules/visitantes/manifest.ts`
- `app/service/MobileApp.tsx`, `app/service/ServiceExactApp.tsx`, `app/service/membro/tipos.ts`
- `app/service/ui/Janela.tsx` e `app/service/ui/biblioteca.css` (prop `telaCheia`; linha na `docs/service-v7/BIBLIOTECA.md`)
- `app/service/lib/copiar.ts` (novo, usado também em `modules/contribuir/Contribuir.tsx`)
- `app/service/lib/internacional/mensagens/*.json` (duas frases do Perfil), `evolucoes/service_app/service-app.css`

## Pronto quando
- O membro abre "Convidar um amigo" e envia por WhatsApp, copia o link ou mostra um QR em tela cheia.
- Quem chega por esse link cai no autocadastro de visitante com "quem convidou" já preenchido com o nome de quem mandou, e pode apagar.
- O texto livre continua para quem chega sem link.
- Fotos em 390 do convite, do QR e do autocadastro preenchido.

## Notas
O campo `service.visitors.invited_by` já existe (0070), em texto.

2026-11-12 (claude): feita. Perfil › "Convidar um amigo" (só com o autocadastro da igreja ligado, lei 6) abre a tela com Enviar no WhatsApp (botão cheio), Copiar link e Mostrar QR em tela cheia (Janela `telaCheia`). O link é `/[slug]/visita?convite=CODIGO`; o código é da pessoa, criado na primeira vez por `service.meu_convite` (0109) e não muda. Quem abre o link chega com "Quem te convidou?" preenchido com o nome e "Um amigo ou parente" marcado, com a dica de que pode apagar; o visitante fica ligado a quem convidou (`visitors.invited_by_person_id`) só se o nome continuar igual ao da pessoa (trocar por apelido desliga, de propósito). Sem link, o texto livre segue igual. A assinatura antiga da RPC do autocadastro continua valendo (o envio sem convite não depende da migração). Início ficou de fora: convidar não é "o que pede minha atenção agora" (lei 2).
- Teste pela tela (Chromium, 390, toque): link com o código da pessoa; WhatsApp abre wa.me com a mensagem e o link; o código não muda ao reabrir; QR em 390×844; cadastro pelo link grava `Maria Membro|<id da pessoa>|amigo`; apagar o nome não liga ninguém; sem link ou código inexistente, campo vazio; autocadastro desligado tira a linha do Perfil e ligado devolve; 0 erro de console.
- Densidade (lei 13, app 390): Convidar 8 ações (limite 12) e 49 palavras (limite 80), 1 botão cheio, moldura 2 (limite 2); Perfil 10 ações e 50 palavras; nada sobreposto, sem rolagem lateral.
- Fotos (md5): O9-convidar-390 34415a56d2ca06c832beb6004813fb53 · O9-qr-390 3289b3ffb37b7f4788f25c8439948e55 · O9-autocadastro-convite-390 d14dc3fb6f333a1aa3a9aa20f451ab75 · O9-perfil-390 7a8875e4020e08fa32f44b7e3cd735a3 · O9-perfil-sem-autocadastro-390 8b7dafa8cb1dc24e550f400144d62e50.
- Mercado (lei 16): o Slack deixa quem pode convidar compartilhar um link de convite, em vez de convidar pessoa a pessoa (https://slack.com/help/articles/201330256-Invite-new-members-to-your-workspace); o Telegram usa link de convite que se manda por qualquer mensageiro (https://telegram.org/blog/invite-links). Daqui: link próprio e reaproveitável, mandado pelo app de conversa que a pessoa já usa. A FAQ do WhatsApp e a ajuda do Planning Center não abriram (400 e 403).
- Fora do escopo: mostrar no painel do visitante quem convidou como link para a pessoa (hoje aparece o texto), e o código de convite por congregação quando a pessoa troca de igreja ativa.
