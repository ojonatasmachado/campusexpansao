---
id: O11
titulo: Juntar cadastros duplicados
tipo: codigo
status: reservada
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
- `app/service/lib/importar-membros.ts`
- `supabase/migrations/` (migração nova)

## Pronto quando
- O Service aponta possíveis duplicados (mesmo telefone, mesmo e-mail ou nome muito parecido) e a secretaria decide se junta.
- Juntar mantém o histórico, as escalas, os grupos e o acesso das duas fichas numa só, e mostra o que vai acontecer antes de confirmar.
- Nada é juntado sozinho.
- Teste com duas fichas com escala e histórico; fotos da sugestão e da confirmação.

## Notas
Começa pela lei 16.
