---
id: E5
titulo: Percorrer cadeia completa de troca de escala
tipo: verificacao
status: feita
quem: claude
desde: 2026-11-12
branch: historia/E5-troca-de-escala
depende: []
tamanho: M
---

## Por quê
A troca de escala tem commit de conclusão em main, mas a conversa completa ainda não foi percorrida. Falta provar que a troca chega ao destinatário certo e que a resposta volta a quem pediu.
Fonte: STATUS.md F19 e "Ordem de continuação" 2; HANDOFF item 4.

## Arquivos (trilho)
- `docs/service-v7/historias/E5-troca-de-escala.md`
- `app/service/membro/Agenda.tsx` (SheetEvento: "Pedir troca" na escala confirmada)
- `app/service/membro/Inicio.tsx` (EscalaCard: sem troca quando o destinatário é a própria pessoa)
- `app/service/MobileApp.tsx` (abrirEvento: passa member e onStartChat; prefere a vaga confirmada)
- `docs/service-v7/historias/screenshots/E5-*.png`

## Pronto quando
- Líder prepara a troca, pessoa confirma ou recusa, e gestão vê a mudança.
- Troca chega ao destinatário certo e a resposta volta a quem pediu.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Commit b5261ce "conclui jornada de troca de escala" está em main. STATUS F19 diz que o destinatário foi validado, mas a conversa completa exige cenário próprio.
Trilho a definir na reserva.

### Fechamento (12/11/2026, claude)
Percorrido pela tela no Supabase local (Igreja Teste Local; Maria pede, Lucas lidera o Louvor, Mateus substitui, Marta é a gestão), teste Playwright fora do git, 7 de 7 verificações e 0 erro de console, conferindo o banco a cada passo:
1. Maria abre o Culto E5 na Agenda, toca em "Pedir troca"; a folha diz "O pedido vai para Lucas, que lidera Louvor" e "Pedir a Lucas" abre a conversa em Mensagens com o pedido.
2. Lucas (app) recebe o pedido na conversa com a Maria e responde.
3. Lucas (painel) substitui a Maria por Mateus: vaga `Mateus Membro|wait` e 1 fato `trocou` na linha do tempo da Maria.
4. Mateus recusa ("Não posso"): `no`; a gestão vê "Não pode" em Escalas.
5. Lucas volta a vaga para aguardar (Outras ações), Mateus confirma: `ok`; a gestão vê "Confirmado".
6. A resposta do Lucas chega à Maria (uma vez só) e a escala sai do Início dela.

Lacuna corrigida: a escala já confirmada, depois de recarregar, não tinha "Pedir troca" em lugar nenhum (o cartão do Início só aparece enquanto pede resposta). Agora a folha do evento na Agenda mostra o estado e "Pedir troca" enquanto o culto não aconteceu. Do revisor: sem troca quando o destinatário é a própria pessoa (conversa consigo mesma, também no Início); com duas funções no mesmo evento, a folha usa a vaga confirmada. Não corrigido (baixo): `useDestinatario` consulta o destinatário mesmo em evento sem vaga.

Densidade (`scripts/medir-densidade.js`, primeira dobra): folha do evento 390: 3 ações (limite 12), 23 palavras (80), moldura 1, dentro. Folha pedir troca 390: 2 ações, 64 palavras, dentro. Escolher substituto 1366: 5 ações (25), 49 palavras (100), dentro. Início do substituto 390: 9 ações, 56 palavras, moldura 2, dentro. Escalas da gestão 1366: 48 ações (limite 25) e moldura 3 (limite 2): **fora da lei 13**, tela anterior à E5, fica para a I3.

Lei 16: não há tela nem fluxo novo, só uma entrada a mais para a folha de troca que já existia; sem pesquisa nova.

Fotos (md5): E5-0-evento-confirmado 0909cac59e0c96fbf02f65804353db59 · E5-1-pedir-troca ad294c8e0443bbe84ae9a40c35561a9a · E5-2-pedido-enviado 9081b1c0780b13acea177373ecf062eb · E5-3-lider-recebe-e-responde 3ef8db2a13b2bf77849c20cbfc084048 · E5-4-lider-substitui 698e1d3c1656d72107f2e0cfdb0dbada · E5-5-painel-aguardando 929ba24dc126e5a080a5682c3ccd0769 · E5-6-substituto-recebe 96d02ecee101009cee83251cf13482d2 · E5-7-gestao-ve-recusa d5522d01a0baefd44e1ff3fe377d9a1f · E5-8-substituto-confirma be0d3b700d8b3ee5c87bb4d973806ce8 · E5-9-gestao-ve-confirmado a4564753566b84b62cc6bfc1d9e82055 · E5-10-resposta-volta 94f5f8c82d91ce1382751844e2546f76.

Em aberto (perguntas ao dono do produto, não travam): onde a pessoa desfaz o "Não posso" depois que o Desfazer some (hoje só o líder volta a vaga para aguardar); e se quem pediu a troca deve receber aviso quando o líder substitui (hoje a resposta volta só pela conversa). Observação: o banco local tem a 0107 do Codex (`roster_swap_requests`), fora do main; não afeta este fluxo.
