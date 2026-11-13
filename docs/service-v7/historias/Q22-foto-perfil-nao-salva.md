---
id: Q22
titulo: Foto de perfil não persiste (update sem await)
tipo: codigo
status: reservada
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
