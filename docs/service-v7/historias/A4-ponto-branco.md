---
id: A4
titulo: Reproduzir e corrigir o ponto branco
tipo: verificacao
status: feita
quem: claude
desde: 2026-11-13
branch: historia/A4-ponto-branco
depende: []
tamanho: M
---

## Por quê
Um ponto branco apareceu no app, mas não foi reproduzido. A hipótese é um .chip sem variante com --st-ic:none.
Fonte: STATUS F18; QUALIDADE-E-INTERNACIONAL.md :99.

## Arquivos (trilho)
- `docs/service-v7/historias/A4-ponto-branco.md`
- `app/service/membro/Kids.tsx`
- `evolucoes/service_app/service-app.css`

## Pronto quando
- Estado exato que causa o ponto branco identificado e reproduzido, ou fechado como não reproduzível com evidência.

## Notas
2026-11-13 (claude): feita, por leitura de código (não em navegador; ver limite abaixo).

**Estado exato identificado:** `app/service/membro/Kids.tsx:530` (chip de inscrição por filho, nos eventos de Kids) montava a classe assim:
`` `${seloClasse({ tom: "neutro" })}${inscrito ? "chip-ok" : "chip-neutral"}` `` — sem espaço entre as duas interpolações. `seloClasse({tom:"neutro"})` (`app/service/ui/Selo.tsx`) já devolve `"chip chip-neutral"`, então o resultado virava `"chip chip-neutralchip-ok"` (ou `...chip-neutralchip-neutral`): um token de classe que não bate com nenhuma regra real. O elemento ficava só com a classe base `.chip`, sem nenhuma variante.

No CSS (`evolucoes/service_app/service-app.css:172-173,2682-2683`): `.chip::before` sempre existe (`content:''`, 12×12px, `background:currentColor`) e usa `mask:var(--st-ic,none)` para recortar o ícone do estado. Sem variante, `--st-ic` fica indefinida → `mask:none` → nada é recortado → o `::before` aparece cheio, um retângulo de 12px em `currentColor` (a 2682 zera o `border-radius`, então é um quadrado, não um círculo — ponto a corrigir na minha descrição inicial, o revisor achou). No app do membro (texto claro sobre fundo escuro), isso aparece como uma mancha branca/clara: o "ponto branco" relatado.

**Fix (3 partes, revisado pelo subagente `revisor`, que achou 2 problemas corrigidos antes de fechar):**
1. `Kids.tsx:530`: troquei para `seloClasse({ tom: inscrito ? "ok" : "neutro" })` (usa a função compartilhada corretamente, sem concatenação manual; também corrige um segundo bug de lógica, que sempre passava `tom:"neutro"` independente do estado real).
2. `Kids.tsx:531`: com `chip-ok` passando a valer de verdade, o `::before` já mostra o ícone `--ic-ok` sozinho; o `<Icon name="ok"/>` que o código já tinha ali virou um segundo check duplicado. Removido, mantendo só o nome da criança.
3. `service-app.css`: toda variante de `.chip-*` foi conferida — `.chip-ok/-wait/-no/-open` definem `--st-ic` (ícone próprio), `.chip-neutral/-solid` escondem o `::before` (`display:none`). Só `.chip-draft` não fazia nem uma coisa nem outra (mesma classe de bug, risco latente: hoje nenhum código usa `tom:"rascunho"`, mas dado antigo pode trazer a classe de volta via `tomDaClasse`). Acrescentei `.chip-draft::before{display:none}`, fechando a lacuna pra toda variante existente.

**Teste:** `scripts/validar.sh` completo (tsc, lint, leis 12/17, contratos, build): TUDO PASSOU.

**Não verificado** (limite real, registrado em vez de fingido): não há captura de tela de antes/depois — a identificação e o fix vieram de rastrear a cadeia `seloClasse` → CSS `--st-ic`/`mask` por leitura de código, não de reproduzir visualmente o ponto no navegador (a ferramenta de captura não está instalada nesta sessão: `npm ci --prefix tools/captura-service && npx playwright install chromium`, pulado em todo `validar.sh` desta sessão). Não dá para garantir que este era o único "ponto branco" já relatado, só que é um bug real, reproduzível por inspeção, e agora corrigido; qualquer captura futura no app do membro, no evento de Kids com inscrição, serve de confirmação visual.
