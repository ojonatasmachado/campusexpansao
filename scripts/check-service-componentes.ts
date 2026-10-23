// Uso: npx tsx scripts/check-service-componentes.ts
//
// Lei 17 (AGENTS.md §13): peça de interface já centralizada não pode voltar a ser
// escrita à mão numa tela. Cada regra abaixo é uma peça da BIBLIOTECA.md que já
// tem componente; o componente em si (pasta permitida) fica de fora. O workflow
// .github/workflows/service.yml roda este script. Peça nova centralizada ganha
// uma regra aqui.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RAIZ = join(__dirname, "..");

function arquivos(dir: string): string[] {
  const out: string[] = [];
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) out.push(...arquivos(p));
    else if (/\.tsx?$/.test(nome)) out.push(p);
  }
  return out;
}

type Regra = { peca: string; usar: string; permitido: string; re: RegExp };

const REGRAS: Regra[] = [
  {
    peca: "Elemento clicável",
    usar: "Acao, Botao, BotaoIcone, Interruptor ou Opcao de app/service/ui/",
    permitido: "app/service/ui/",
    re: /<button\b/g,
  },
  {
    peca: "Botão",
    usar: "Botao / botaoClasse() de app/service/ui/Botao.tsx",
    permitido: "app/service/ui/",
    /* classe de botão escrita à mão: "btn btn-...", `btn ...`, "m6-btn ..." */
    re: /["'`](?:btn(?:\s|["'`$])|m6-btn(?:\s|["'`$]))/g,
  },
  {
    peca: "Selo, Etiqueta, Cartão, Linha ou Segmentado",
    usar: "Selo, Etiqueta, Cartao, Linha, Lista ou Segmentado de app/service/ui/ (ou seloClasse/cartaoClasse/linhaClasse)",
    permitido: "app/service/ui/",
    /* className que começa com a classe de uma dessas peças, escrita à mão */
    re: /className=\{?["'`](?:chip|m6-st|tag|panel|m6-card|m-card|m6-list|tr|mini-row|cfg-row|m6-row|seg)(?=[\s"'`$])/g,
  },
  {
    peca: "Seleção",
    usar: "Selecao de app/service/ui/Selecao.tsx",
    permitido: "app/service/ui/",
    re: /<select\b/g,
  },
  {
    peca: "Data ou hora",
    usar: "SeletorData ou SeletorHora de app/service/ui/Data.tsx",
    permitido: "app/service/ui/",
    re: /type=["'](?:date|time)["']/g,
  },
  {
    peca: "Caixa de marcar ou bolinha",
    usar: "Marcar de app/service/ui/Campo.tsx",
    permitido: "app/service/ui/",
    re: /type=["'](?:checkbox|radio)["']/g,
  },
  {
    peca: "Confirmação",
    usar: "confirmar() de app/service/ui/confirmar.ts",
    permitido: "app/service/ui/",
    re: /(?<![.\w])(?:window\.)?confirm\(/g,
  },
  {
    peca: "Janela, gaveta, folha ou barra de salvar",
    usar: "Janela, Gaveta, Folha ou BarraSalvar de app/service/ui/ (peça própria de verdade: marque a linha com /* lei17-ok: motivo */)",
    permitido: "app/service/ui/",
    re: /className=\{?["'`](?:modal-bg|drawer-bg|m6-scrim|save-bar)(?=[\s"'`$])/g,
  },
  {
    peca: "Menu ou abas",
    usar: "MenuAcoes ou Abas de app/service/ui/ (peça própria de verdade: marque a linha com /* lei17-ok: motivo */)",
    permitido: "app/service/ui/",
    re: /role=["'](?:menu|tablist)["']/g,
  },
  {
    peca: "Avatar",
    usar: "Avatar ou AvatarGrupo de app/service/ui/Avatar.tsx (peça própria de verdade: marque a linha com /* lei17-ok: motivo */)",
    permitido: "app/service/ui/",
    re: /className=\{?["'`](?:av|av-stack|av-more|mp-av)(?=[\s"'`$])|function (?:Av|Avatar)\(/g,
  },
  {
    peca: "Etapas ou linha do tempo",
    usar: "Etapas de app/service/ui/Etapas.tsx (estilos linha, app e faixa)",
    permitido: "app/service/ui/",
    re: /className=\{?["'`](?:tl|tl-item|tl-dot|jrn-tl|m6-steps?|imp-steps?)(?=[\s"'`$])/g,
  },
  {
    peca: "Tabela com seleção",
    usar: "Tabela de app/service/ui/Tabela.tsx (prop lote para a barra de ações em lote)",
    permitido: "app/service/ui/",
    re: /["'`]tabela-(?:lote|marca|abrir|linha)/g,
  },
];

const PASTAS = ["app/service", "app/[slug]"].map((p) => join(RAIZ, p));
let falhas = 0;
for (const regra of REGRAS) {
  for (const arq of PASTAS.flatMap(arquivos)) {
    const rel = relative(RAIZ, arq);
    if (rel.startsWith(regra.permitido)) continue;
    const src = readFileSync(arq, "utf8");
    const linhas = src.split("\n");
    for (const m of src.matchAll(regra.re)) {
      const linha = src.slice(0, m.index).split("\n").length;
      if (linhas[linha - 1].includes("lei17-ok")) continue;
      console.error(`${rel}:${linha}  ${regra.peca} escrito à mão. Use ${regra.usar}.`);
      falhas++;
    }
  }
}

if (falhas) {
  console.error(`\n${falhas} uso(s) fora da biblioteca. Índice das peças: docs/service-v7/BIBLIOTECA.md`);
  process.exit(1);
}
console.log("Componentes da biblioteca: ok");
