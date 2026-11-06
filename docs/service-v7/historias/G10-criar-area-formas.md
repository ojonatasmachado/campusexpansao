---
id: G10
titulo: Criar área com formas, alças e ímã
tipo: codigo
status: feita
quem: claude
desde: 2026-11-06
branch: historia/G10-criar-area-formas
depende: [G7]
tamanho: G
---

## Por quê
Hoje a área só se desenha clicando canto por canto ou juntando bairros. O usuário decidiu formas prontas que se ajustam (padrão Google My Maps e Earth) e que o responsável da área ganhe acesso ao mapa dela.
Referência: mapa/PLANO.md §10 e canvas "Mapa da igreja · evolução" (claude.ai/artifact/QohxddXmM2vnQqsYDNaAEy), prancha P5.

## Arquivos (trilho)
- `app/service/modules/mapa/CriarArea.tsx`
- `app/service/modules/mapa/desenho.ts`
- `package.json`
- `package-lock.json`
- `supabase/migrations/0100_service_mapa_responsavel_acesso.sql`
- `app/service/modules/mapa/MapaIgreja.tsx`
- `app/service/modules/mapa/contexto.ts`
- `app/service/modules/mapa/mapa.css`
- `app/service/modules/mapa/manifest.ts`
- `app/service/lib/icons.tsx`
- `docs/service-v7/producao.sql`
- `docs/service-v7/historias/G10-criar-area-formas.md`

## Pronto quando
- Nasce como quadrado, círculo, juntar bairros ou livre; cantos redimensionam (Shift proporcional), arrastar move, pontos do meio viram cantos novos, ímã nas ruas com Alt para soltar, desfazer sempre, números ao vivo.
- Painel à esquerda no lugar das camadas, com "Voltar ao mapa"; tipos Setor, Região pastoral, Atuação; cores sem o âmbar.
- Responsável recebe acesso automático só à área, pessoas uma a uma; só pastor e administração veem e gravam o campo (RLS testada).
- No celular, um dedo edita e dois movem o mapa; alças com área de toque de 44 px.
- Feito com as peças de `app/service/ui/` (lei 17) e o movimento de `movimento.ts`; nenhuma peça imitada à mão.
- Fotos do app rodando em `docs/service-v7/historias/screenshots/`, abertas e descritas, mostrando a tela que a história mudou.
- `scripts/medir-densidade.js` antes e depois, comparado com a lei 13 (painel 1366×860: até 25 ações e 100 palavras; app 390×844: até 12 ações e 80 palavras).
- Typecheck, lint dos arquivos tocados, lei 12 e `scripts/check-service-componentes.ts` passando.

## Notas
Criada em 04/11/2026 a partir da evolução da jornada do mapa (decisões do usuário em PLANO §10). Nada de aviso ou sugestão automática de expansão.
06/11/2026 (claude): terra-draw 1.38.0 com o adaptador do MapLibre 1.5.0. Quadrado e círculo nascem no meio da tela; ponto do meio do quadrado vira canto e a forma passa a livre; o círculo tem uma alça só. Ímã na rua mais perto (Alt solta), com o nome da rua na dica. Desfazer volta cada gesto, inclusive a troca de forma. Migração 0100: responsável vê só as áreas dele (pessoas uma a uma) e ganha o menu do mapa por gatilho; liberação do pastor vence e 'nenhum' tira; só pastor e administração veem e gravam o campo (testado com psql como líder, membro e master). A prévia ganhou o filtro pelo índice (estourava o tempo com os setores do país). Densidade 1366: 45 ações e 118 palavras (antes 42 e 99), fora da lei e justificada no manifesto; 390: 12 e 60, dentro. Fotos G10-0 a G10-4.
