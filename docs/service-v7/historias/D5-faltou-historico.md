---
id: D5
titulo: Decidir se faltou entra como fato no histórico
tipo: decisao
status: livre
quem:
desde:
branch:
depende: []
tamanho: P
---

## Por quê
O tipo "faltou" existe no histórico, mas nenhuma migração grava esse fato. Falta uma regra clara sobre quando gravar, por exemplo só com check-in de culto aberto.
Fonte: DEPLOY.md:97 ("Fato 'faltou' na história (4.8)"), PROGRESSO.md 4.8.

## Arquivos (trilho)
- `docs/service-v7/MANIFESTO.md`

## Pronto quando
- Regra decidida e registrada, dizendo se e quando "faltou" é gravado.

## Notas
INCERTO: conferir no código antes de começar; se já estiver feito, marcar status: feita com a evidência.
Decisão do usuário: o agente só prepara as opções e registra a resposta.
O tipo existe em app/service/lib/historico.ts:20 e em modules/define.ts:31. Pausas e recusas são fatos, não diagnóstico (STATUS F20: sem registro não é ausência comprovada), o que pode explicar por que não se grava.
