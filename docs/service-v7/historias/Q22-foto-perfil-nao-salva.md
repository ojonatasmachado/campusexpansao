---
id: Q22
titulo: Foto de perfil não persiste (update sem await)
tipo: codigo
status: feita
quem: claude
desde: 2026-11-13
branch: historia/Q22-foto-perfil-nao-salva
depende: []
tamanho: P
---

## Por quê
Usuário testando o app instalado relatou: adiciona a foto, ela nunca salva (some dos avatares depois). Achado por leitura de código: `membro/Perfil.tsx` e `membro/Kids.tsx` ("Sua foto"/"Sua foto de responsável") gravam `photo_url` sem `await` e sem conferir erro — o envio pro storage funciona, mas a gravação na tabela `people` pode falhar em silêncio (RLS, rede) ou nem terminar se a tela mudar antes da promise resolver. As outras 3 ocorrências do mesmo padrão no código (`painel/telas/Kids.tsx:247`, `painel/telas/Identidade.tsx:205`, `membro/Kids.tsx:126`) já fazem `await` corretamente; só estas duas ficaram sem.

## Arquivos (trilho)
- `docs/service-v7/historias/Q22-foto-perfil-nao-salva.md`
- `app/service/membro/Perfil.tsx`
- `app/service/membro/Kids.tsx` (nota: também no trilho da N2, fatia 1, já entregue/mesclada; mudança aqui é cirúrgica, só a função `salvarMinhaFoto`)

## Pronto quando
- `onUploaded` de "Sua foto" (Perfil) e "Sua foto de responsável" (Kids) aguarda a gravação, confere erro, desfaz a foto otimista e avisa a pessoa se falhar.
- Testado por leitura de código e, se possível, banco local descartável (RLS de `service.people` permite a própria pessoa atualizar `user_id = auth.uid()`, conferir que a chamada realmente persiste).

## Notas
2026-11-13 (claude): feita. Encontrado durante teste real do usuário no app instalado ("adiciono foto, nunca salva, some dos avatares").

**Fix em 3 partes**, nos dois lugares (`Perfil.tsx` "Sua foto", `Kids.tsx` "Sua foto de responsável"):
1. `await` na gravação + `.select("id")` + checagem `error || !data?.length`. O `.select("id")` é essencial: a policy `svc_w_upd` de `service.people` (0018) é *restrictive* e filtra no `USING` — uma gravação barrada por permissão volta **0 linhas e `error: null`**, não uma exceção. Sem o select, isso passava em silêncio mesmo depois do primeiro `await` (achado do revisor, corrigido).
2. Cache-busting (`?v=${Date.now()}`) antes de mostrar/salvar a URL: o caminho de upload é sempre o mesmo (upsert), então trocar a foto sem isso mantinha a imagem antiga em cache no navegador/CDN mesmo com a gravação certa.
3. `router.refresh()` após sucesso: outros lugares que leem `person.photoUrl` direto do servidor (ex. o `<Av>` do topo do Perfil) não reagiam ao estado local da tela; sem isso, o avatar só atualizava depois de um recarregamento manual.

Desfazer a foto otimista em caso de erro usa forma funcional (`setFoto(f => f === comVersao ? anterior : f)`), para não sobrescrever um envio mais novo se a pessoa trocar de foto duas vezes rápido.

Revisado pelo subagente `revisor` em 2 rodadas: a 1ª achou o problema do RLS silencioso (grave, impedia o critério de pronto) e o avatar não reagindo (médio); a 2ª, depois das correções, não achou mais nada.

**Teste:** `scripts/validar.sh` completo, duas vezes: TUDO PASSOU. RLS de `service.people` (0018) conferida por leitura: `user_id = auth.uid()` permite a própria pessoa atualizar seu registro. Não testado em navegador real (sem captura configurada nesta sessão); a lógica do `.select("id")` detectando 0 linhas em caso de bloqueio é inferência correta do comportamento documentado do PostgREST/supabase-js para RLS restritiva, não uma reprodução ao vivo do bloqueio.