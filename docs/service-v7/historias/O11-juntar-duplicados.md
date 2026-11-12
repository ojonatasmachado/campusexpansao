---
id: O11
titulo: Juntar cadastros duplicados
tipo: codigo
status: feita
quem: claude
desde: 2026-11-12
branch: historia/O11-juntar-duplicados
depende: []
tamanho: M
---

## Por quê
Com visitante se cadastrando sozinho, entrada por link e importação por planilha, a mesma pessoa vai aparecer duas vezes. Decisão D6 de 04/11, Onda 1 (MANIFESTO 2c.5).

## Arquivos (trilho)
- `app/service/modules/pessoas/Pessoas.tsx`
- `app/service/lib/importar-membros.ts` (não precisou mudar: a lista aponta o duplicado depois da importação)
- `supabase/migrations/0110_service_juntar_fichas.sql`
- `app/service/lib/duplicados.ts`
- `app/service/modules/pessoas/Duplicados.tsx`
- `app/service/ServiceExactApp.tsx` (`podeJuntar`)
- `app/service/painel/tipos.ts` (`PersonView.userId`)
- `evolucoes/service_app/service-app.css` (`.dup-*`)
- `scripts/check-service-duplicados.ts` (no CI, `.github/workflows/service.yml`)

## Pronto quando
- O Service aponta possíveis duplicados (mesmo telefone, mesmo e-mail ou nome muito parecido) e a secretaria decide se junta.
- Juntar mantém o histórico, as escalas, os grupos e o acesso das duas fichas numa só, e mostra o que vai acontecer antes de confirmar.
- Nada é juntado sozinho.
- Teste com duas fichas com escala e histórico; fotos da sugestão e da confirmação.

## Notas
Começa pela lei 16.

**Feita em 12/11/2026 (Claude, migração 0110).**
- Mercado (lei 16, função): o Rock RMS aponta "Possible Duplicates" ao cadastrar e tem a tela Merge People, onde se escolhe a ficha principal e o valor que fica; avisa sobre o login e pede nova confirmação de e-mail depois de juntar (https://community.rockrms.com/documentation/bookcontent/5). O Planning Center People oferece "Merge duplicate profiles" (https://www.planningcenter.com/people). No HubSpot, juntar leva atividades e vínculos para o registro que fica e não tem como desfazer (https://knowledge.hubspot.com/records/merge-records); a deduplicação automática é só por e-mail (https://knowledge.hubspot.com/records/deduplication-of-records). Daí: comparar lado a lado, escolher qual fica, mostrar o que vai junto, nunca juntar sozinho, recusar duas contas de login e guardar uma cópia.
- Tela: em Pessoas (só a secretaria), uma linha "N possíveis cadastros duplicados" abre a lista de pares (motivo: mesmo e-mail, mesmo telefone ou nome parecido). "Comparar" abre "É a mesma pessoa?", com as duas fichas, a escolha de qual fica e a prévia ("Vão para X: 2 escalas, 2 times..."). "Não são a mesma pessoa" guarda o par em `service.duplicados_dispensados`.
- Banco: `juntar_fichas` move toda chave estrangeira para people e members achada no catálogo. Antes, apaga a linha repetida da ficha que sai; a escala confirmada vence. Também soma times (líder, funções) e cursos (maior progresso), troca os ids nas listas sem chave estrangeira, completa os campos vazios e passa o login. Duas contas de login diferentes: não junta. Os 11 gatilhos que gravariam fatos falsos ou travariam o financeiro ganharam `WHEN (service.juntando <> '1')`, uma variável local da transação, sem ALTER TABLE na hora de juntar. As fichas e as linhas apagadas ficam em `service.juntadas.copia`; as filhas apagadas em cascata não entram na cópia. As funções security definer usam `search_path = service, public, pg_temp`.
- Revisor: 8 achados, 6 corrigidos. 1. Duas fichas de membro com o mesmo voluntário davam "invalido"; agora a pessoa só sai uma vez. 2. ALTER TABLE travava as tabelas de todas as igrejas; agora é WHEN com variável. 3. As linhas apagadas não entravam na cópia, e a escala confirmada se perdia. 4. pg_temp no search_path. 5. A prévia contava ids de outra igreja. 6. journey nulo ou fora do formato. Ficaram de fora: 7. o `useMemo` refaz a lista a cada render, mas são centenas de linhas agrupadas pelo primeiro nome, então é barato; 8. o par dispensado com a chave `p-<id>` volta se essa linha virar `m-<id>` depois de outra junção, caso raro.
- Testes no banco local, em transação com rollback: a junção completa e os gatilhos ligados; nenhum fato "trocou"; recusas nao_pode, duas_contas e outra igreja; o login passa; mesmo voluntário; escala confirmada; cópia das apagadas (enrollments, person_ministries, registros e roster_assignments); prévia de outra igreja = 0. `scripts/check-service-duplicados.ts` está no CI.
- Pela tela (Playwright, cliques, 1366×860): 5 de 5 passos, 0 erro de console. Fotos (md5): O11-pessoas-aviso 724c7d1b6c3d7c5ef0737c070ef0ed61, O11-lista-duplicados 18b85412635fa6dc5419a801a76abc76, O11-comparar 1ccd289283ebe653b07b1e5a5d279cc9.
- Densidade (`__medir(24)`):
  - Comparar: 5 ações (limite 25), 85 palavras (limite 100), 1 botão cheio, moldura 1, nada sobreposto. Dentro da lei.
  - Pessoas: 39 ações (limite 25) e 139 palavras (limite 100), **fora da lei 13**. Os números são iguais sem o aviso (39 e 139), então já era assim antes da O11. Há também uma sobreposição antiga: o botão "?" flutuante sobre uma linha da tabela. Isso fica para a I3.
- Fora do escopo: juntar duas contas de login (fica a pergunta em aberto) e desfazer a junção (a cópia fica em `juntadas`, sem tela).
