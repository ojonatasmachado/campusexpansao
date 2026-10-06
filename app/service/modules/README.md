# Service · módulos

Lei permanente do Service (v7). Manifesto completo em `docs/service-v7/MANIFESTO.md`;
resumo também no `AGENTS.md` (seção "Service: módulos").

Toda função nova do Service nasce como módulo, numa pasta `app/service/modules/<id>/`
com um `manifest.ts`. Tela, item de menu, aba de configuração, cartão ou notificação
criados fora do registro não entram.

## As 12 leis

1. **Casca estável.** App do membro: 4 abas (Início, Agenda, Mensagens, Caminhada) e
   avatar no topo, que abre o Perfil. Painel: menu, barra e busca. A casca não muda
   quando entra função nova; só oferece lugares: `inicio.fila`, `inicio.igreja`,
   `agenda.minha`, `agenda.igreja`, `mensagens.itens`, `caminhada.secoes`,
   `perfil.linhas`, `painel.menu`, `painel.inicio.saude`, `painel.inicio.pendencias`,
   `painel.config`, `busca`.
2. **Uma pergunta por lugar.** Início: o que pede minha atenção agora? Agenda: quando e
   onde? Mensagens: quem falou comigo? Caminhada: como estou crescendo? Perfil: quem sou
   e como prefiro? Função nova entra onde responde à mesma pergunta.
3. **Registro único.** `registry.ts` lê os manifestos e filtra por igreja (módulo
   ligado), papel, permissão e dependências. `NAV_GROUPS`, `CFG_TABS` e `MEMBER_MODULES`
   passam a ser gerados por ele.
4. **Manifesto por módulo** (`defineModule`): `id`, `liga` (padrão por igreja), `depende`
   (sem a dependência, o módulo some), `permissoes`, `membro` (`visivel` e lugares),
   `painel` (`menu`, `inicio`, `config`), `avisos` (tipo, público, cartão, quando),
   `rotas` (QR e link público), `vocabulario` (termos renomeáveis que usa), `historico`
   (fatos que grava na história da pessoa).
5. **Contrato do cartão.** Seis tipos: `acao`, `passo`, `evento`, `aviso`, `pedido`,
   `destaque`. Campos: `id`, `modulo`, `tipo`, `prioridade` (0 a 100), `prazo`,
   `contexto`, `titulo`, `linhas`, `principal`, `secundaria` (no máximo duas ações),
   `resolvido` (título e Desfazer). A casca ordena por prioridade e prazo, mostra até 3
   na primeira dobra e dá botão cheio só ao primeiro. Resolvido segue o modelo da
   confirmação de escala: o cartão muda, oferece Desfazer e sai da fila. Fila vazia
   mostra "Tudo em dia".
6. **Nenhum beco sem saída.** Toda entrada declara do que depende (destinatário,
   conteúdo, turma aberta). Sem a dependência, a entrada não aparece. Teste automático
   falha com botão sem ação, rota sem entrada no menu ou convite que leva a botão
   desabilitado.
7. **Vocabulário da igreja.** Nenhum texto de interface escreve fixo um termo renomeável;
   usa `termo("caminhada")`. Termos iniciais: Caminhada, Grupo, Culto, Voluntário. Cada
   termo tem nome da tela (até 24 caracteres) e nome curto da barra (até 10). O código
   usa o nome interno e a busca encontra os dois.
8. **Tipografia, cor e toque.** Tokens únicos. App: 13, 15, 17, 20, 28. Painel: 12, 13,
   14, 16, 20, 32. Mínimo de 13px no app e 12px no painel, sem meio pixel. Mono só para
   números que alinham e para o sobretítulo do painel; caixa alta só nesse sobretítulo.
   Alvos de 44px no app e 32px no painel (piso de 24px). A cor de destaque da igreja vai
   em uma ação por tela e na aba ativa. Todo tamanho deriva da escala do texto da pessoa.
9. **Notificação = ação.** Cada aviso corresponde a um cartão. Categorias que a pessoa
   desliga: Escala, Mural, Mensagens, Caminhada. Silêncio das 22h às 7h. Mural chega em
   resumo. Permissão de notificação pedida depois da primeira escala confirmada.
10. **Histórico, sem gamificação.** Módulos gravam fatos numa linha do tempo da pessoa:
    serviu, faltou, trocou, concluiu aula ou curso, batizou, entrou em grupo. O membro vê
    o próprio, o líder vê o do seu time, gestão e pastores veem de todos. Proibido:
    ranking, medalha, sequência de dias, pontos ou percentual de engajamento sobre pessoas.
11. **Medição padrão.** Todo cartão emite `card_shown`, `card_acted`, `card_dismissed`;
    todo aviso emite `notification_sent` e `notification_opened`. Métricas: semanas com
    participação, vagas cobertas 48h antes do culto, minutos para fechar a escala da
    semana, visitantes contatados em 48h.
12. **Qualidade verificada por máquina.** A captura roda a cada versão e falha com texto
    abaixo do mínimo, alvo abaixo de 24px, contraste pior que a versão anterior, rolagem
    lateral, erro de console ou botão sem ação.

## Como o registro funciona (4.1)

- `registry.ts` lê os manifestos e gera o menu do painel (`navGroups`), as abas de
  Configurações (`cfgTabs`), o grupo e a permissão de cada tela (`ROTA_GRUPO`,
  `CODIGO_PERMISSAO`, `podeVerRota`) e as telas do app do membro (`telasDoMembro`).
- Liga/desliga por igreja: `service.churches.modules_on` e `modules_off` (0055) guardam só
  as exceções ao `liga` do manifesto; `modulosLigados()` resolve isso e as dependências.
  Módulo `essencial` (casca) não desliga. Ainda não há tela para ligar e desligar.
- Telas já extraídas: `escalas/Escalas.tsx`, `pessoas/Pessoas.tsx`, `mural/Mural.tsx`.
  Peças de tela comuns do painel ficam em `app/service/painel/`.

## Checklist: criar um módulo novo

- [ ] Pasta em `app/service/modules/<id>/` com `manifest.ts` a partir de `_modelo/`.
- [ ] Import do manifesto em `registry.ts` (lista `MODULOS`). Menu, Configurações e telas do app saem dele.
- [ ] Respondi em qual lugar ele mora (lei 2) e quais lugares ocupa (lei 1).
- [ ] Declarei permissões, dependências e o padrão de liga/desliga por igreja.
- [ ] Cartões usam um dos seis tipos; avisos têm categoria e cartão correspondente.
- [ ] Textos usam `termo()` para os termos renomeáveis e os tokens de fonte.
- [ ] Fatos que vão para o histórico estão declarados.
- [ ] Captura das telas novas passa nos testes da lei 12.
