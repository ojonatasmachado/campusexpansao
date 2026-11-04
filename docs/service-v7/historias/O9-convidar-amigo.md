---
id: O9
titulo: Convidar um amigo com link que já diz quem convidou
tipo: codigo
status: livre
quem:
desde:
branch:
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
- `supabase/migrations/` (migração nova)

## Pronto quando
- O membro abre "Convidar um amigo" e envia por WhatsApp, copia o link ou mostra um QR em tela cheia.
- Quem chega por esse link cai no autocadastro de visitante com "quem convidou" já preenchido com o nome de quem mandou, e pode apagar.
- O texto livre continua para quem chega sem link.
- Fotos em 390 do convite, do QR e do autocadastro preenchido.

## Notas
O campo `service.visitors.invited_by` já existe (0070), em texto.
