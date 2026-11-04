---
id: E7
titulo: Gravar faltou pelo check-in, com desfazer do líder
tipo: codigo
status: livre
quem:
desde:
branch:
depende: []
tamanho: M
---

## Por quê
O tipo "faltou" existe no histórico, mas nada grava. Decisão D5 de 04/11 (MANIFESTO 2c.3).

## Arquivos (trilho)
- `app/service/lib/historico.ts`
- `app/service/modules/escalas/manifest.ts`
- `supabase/migrations/` (migração nova)

## Pronto quando
- Com check-in aberto para a escala, quem estava escalado e não fez check-in recebe o fato "faltou" depois do culto.
- Sem check-in aberto, nada é gravado.
- O líder do time desfaz o "faltou" (a pessoa serviu e esqueceu o check-in) e o fato some.
- Só líder do time e gestão veem o "faltou"; ele não aparece na Caminhada nem em "Minha história" do voluntário.
- Teste com uma escala com check-in aberto e outra sem.

## Notas
INCERTO: conferir no código se existe check-in de voluntário por escala ("Regras da escala e check-in" em Configurações) antes de começar. Se não existir, relatar o bloqueio.
