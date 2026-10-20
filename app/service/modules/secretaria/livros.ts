/* Livros da secretaria (0078): tipos, colunas, filtro por ano, CSV e os
   dados de demonstração (/service/demo, ?dados=pior gera 1.000 registros).
   Nada aqui desenha tela. */
import { formatDateBR } from "../../lib/date";

export type Livro = "batismo" | "casamento" | "apresentacao" | "rol";

export type Pessoa = { nome: string; member_id?: string | null };

export type Registro = {
  id: string;
  organization_id: string;
  church_id: string;
  livro: Livro;
  numero: number;
  livro_fisico: string | null;
  folha: string | null;
  data: string;
  nome: string;
  member_id: string | null;
  child_id: string | null;
  fato_id: string | null;
  oficiante: string | null;
  local: string | null;
  dados: {
    noivo?: Pessoa;
    noiva?: Pessoa;
    testemunhas?: string[];
    nascimento?: string | null;
    pais?: string | null;
    forma?: string | null;
  };
  saida: string | null;
  saida_motivo: string | null;
  observacao: string | null;
};

export const REGISTRO_COLS = "id,organization_id,church_id,livro,numero,livro_fisico,folha,data,nome,member_id,child_id,fato_id,oficiante,local,dados,saida,saida_motivo,observacao";

export const LIVROS: { id: Livro; rotulo: string; singular: string; plural: string; vazio: string }[] = [
  { id: "batismo", rotulo: "Batismos", singular: "batismo", plural: "batismos", vazio: "Quando uma turma de batismo é concluída, ou a etapa Batismo é marcada na ficha, a pessoa entra aqui com número de registro." },
  { id: "casamento", rotulo: "Casamentos", singular: "casamento", plural: "casamentos", vazio: "Registre os casamentos celebrados pela igreja, com noivos, oficiante e testemunhas." },
  { id: "apresentacao", rotulo: "Apresentações", singular: "apresentação", plural: "apresentações", vazio: "Registre a apresentação de crianças. Se a criança já está no Kids, os dados vêm de lá." },
  { id: "rol", rotulo: "Rol de membros", singular: "membro", plural: "membros", vazio: "Toda ficha de membro entra no rol com a data de entrada. A saída e o motivo ficam aqui." },
];

export const livroDe = (id: Livro) => LIVROS.find((l) => l.id === id)!;

/** livros que a tela deixa lançar à mão (batismo e rol vêm dos fatos e das fichas) */
export const LANCA_A_MAO: Livro[] = ["casamento", "apresentacao"];

export const FORMAS_ENTRADA = ["Batismo", "Transferência", "Aclamação", "Reconciliação"];
export const MOTIVOS_SAIDA = ["Transferência", "A pedido", "Falecimento", "Mudança de cidade", "Outro"];

export const anoDe = (r: Pick<Registro, "data">) => Number(r.data.slice(0, 4));

/** anos com registro no livro, do mais recente ao mais antigo */
export function anos(regs: Registro[]): number[] {
  return [...new Set(regs.map(anoDe))].sort((a, b) => b - a);
}

/** texto que a busca procura em cada registro */
export function textoBusca(r: Registro): string {
  return [r.nome, r.oficiante, r.local, r.dados.noivo?.nome, r.dados.noiva?.nome, r.dados.pais, ...(r.dados.testemunhas ?? []), String(r.numero)]
    .filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
}

/** folha e livro físico juntos, quando a igreja usa ("Livro 2 · fl. 14") */
export function folhaLivro(r: Registro): string {
  return [r.livro_fisico ? `Livro ${r.livro_fisico}` : "", r.folha ? `fl. ${r.folha}` : ""].filter(Boolean).join(" · ");
}

export const numeroFmt = (n: number) => String(n).padStart(4, "0");

/** colunas do livro: na tela, na impressão e no CSV são as mesmas */
export function colunas(livro: Livro): { t: string; v: (r: Registro) => string }[] {
  const base = [{ t: "Nº", v: (r: Registro) => numeroFmt(r.numero) }, { t: "Data", v: (r: Registro) => formatDateBR(r.data) }];
  const fl = { t: "Livro e folha", v: folhaLivro };
  if (livro === "batismo") return [...base, { t: "Nome", v: (r) => r.nome }, { t: "Oficiante", v: (r) => r.oficiante ?? "" }, { t: "Local", v: (r) => r.local ?? "" }, fl];
  if (livro === "casamento") return [...base, { t: "Noivos", v: (r) => [r.dados.noivo?.nome, r.dados.noiva?.nome].filter(Boolean).join(" e ") || r.nome }, { t: "Oficiante", v: (r) => r.oficiante ?? "" }, { t: "Testemunhas", v: (r) => (r.dados.testemunhas ?? []).join(", ") }, { t: "Local", v: (r) => r.local ?? "" }, fl];
  if (livro === "apresentacao") return [...base, { t: "Criança", v: (r) => r.nome }, { t: "Nascimento", v: (r) => formatDateBR(r.dados.nascimento ?? "") }, { t: "Pais", v: (r) => r.dados.pais ?? "" }, { t: "Oficiante", v: (r) => r.oficiante ?? "" }, fl];
  return [{ t: "Nº", v: (r) => numeroFmt(r.numero) }, { t: "Nome", v: (r) => r.nome }, { t: "Entrada", v: (r) => formatDateBR(r.data) }, { t: "Forma", v: (r) => r.dados.forma ?? "" }, { t: "Saída", v: (r) => formatDateBR(r.saida ?? "") }, { t: "Motivo", v: (r) => r.saida_motivo ?? "" }];
}

export function linhasCsv(livro: Livro, regs: Registro[]): string[][] {
  const cols = colunas(livro);
  return [cols.map((c) => c.t), ...regs.map((r) => cols.map((c) => c.v(r)))];
}

/* ── demonstração ───────────────────────────────────────────────────────── */

const NOMES = ["Ana Paula Ribeiro", "Bruno Henrique Costa", "Carla Mendes", "Daniel Souza", "Elisa Nogueira", "Felipe Araújo", "Gabriela Lima", "Henrique Prado", "Isabela Duarte", "João Victor Martins", "Larissa Teles", "Marcos Vinícius Rocha"];
const LONGO = "Maria Aparecida dos Santos Albuquerque de Vasconcelos Cavalcanti";
const PASTORES = ["Pr. Ricardo Alves", "Pra. Débora Lins", "Pr. Samuel Freitas"];

/** livros de exemplo para o demo; `pior` traz nomes longos e 1.000 registros no rol e nos batismos */
export function registrosDemo(org: string, church: string, pior: boolean): Registro[] {
  const out: Registro[] = [];
  const add = (livro: Livro, i: number, r: Partial<Registro>) => {
    out.push({
      id: `demo-${livro}-${i}`, organization_id: org, church_id: church, livro, numero: i + 1,
      livro_fisico: null, folha: null, data: "2026-01-01", nome: "", member_id: null, child_id: null, fato_id: null,
      oficiante: null, local: null, dados: {}, saida: null, saida_motivo: null, observacao: null, ...r,
    });
  };
  const n = pior ? 1000 : 18;
  const dataDe = (i: number, total: number) => {
    const d = new Date(Date.UTC(2014, 0, 5) + Math.floor((i / total) * (Date.UTC(2026, 9, 1) - Date.UTC(2014, 0, 5))));
    return d.toISOString().slice(0, 10);
  };
  for (let i = 0; i < n; i++) {
    const nome = pior && i % 7 === 0 ? LONGO : NOMES[i % NOMES.length];
    add("rol", i, {
      nome, member_id: i === 0 ? "m1" : null, data: dataDe(i, n), dados: { forma: FORMAS_ENTRADA[i % 4] },
      ...(i % 9 === 4 ? { saida: dataDe(Math.min(n - 1, i + 3), n), saida_motivo: MOTIVOS_SAIDA[i % MOTIVOS_SAIDA.length] } : {}),
    });
    add("batismo", i, {
      nome, member_id: i === 0 ? "m1" : null, data: dataDe(i, n), oficiante: PASTORES[i % 3],
      local: pior && i % 11 === 0 ? "Chácara Recanto das Águas Claras, estrada municipal do Barreiro, km 14" : "Templo sede",
      livro_fisico: i < n / 2 ? "1" : "2", folha: String(1 + Math.floor(i / 4)),
    });
  }
  const casais = pior ? 120 : 4;
  for (let i = 0; i < casais; i++) {
    const a = pior && i === 0 ? LONGO : NOMES[(i * 2) % NOMES.length];
    const b = NOMES[(i * 2 + 1) % NOMES.length];
    add("casamento", i, {
      nome: `${a} e ${b}`, data: dataDe(i, casais), oficiante: PASTORES[i % 3], local: "Templo sede",
      dados: { noivo: { nome: b }, noiva: { nome: a }, testemunhas: [NOMES[(i + 5) % NOMES.length], NOMES[(i + 7) % NOMES.length]] },
    });
  }
  const criancas = pior ? 80 : 3;
  for (let i = 0; i < criancas; i++) {
    add("apresentacao", i, {
      nome: pior && i === 0 ? "Benjamin Gabriel Henrique de Oliveira Montenegro" : ["Davi", "Helena", "Théo"][i % 3] + " " + NOMES[i % NOMES.length].split(" ").pop(),
      data: dataDe(i, criancas), oficiante: PASTORES[i % 3],
      dados: { nascimento: dataDe(Math.max(0, i - 1), criancas), pais: `${NOMES[(i + 2) % NOMES.length]} e ${NOMES[(i + 3) % NOMES.length]}` },
    });
  }
  return out;
}
