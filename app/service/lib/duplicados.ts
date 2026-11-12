/* O11: possíveis cadastros duplicados na tela Pessoas. Só aponta; quem decide
   e junta é a secretaria (service.juntar_fichas, 0110). Funções puras,
   testadas em scripts/check-service-duplicados.ts. */
import { nomeComparavel } from "./pessoas";
import { telefoneParaWhatsapp } from "./telefone";

export type MotivoDuplicado = "telefone" | "email" | "nome";
export type CadastroComparavel = { chave: string; nome: string; telefones: (string | null | undefined)[]; emails: (string | null | undefined)[] };
export type ParDuplicado<T extends CadastroComparavel> = { a: T; b: T; motivo: MotivoDuplicado };

/** Chave do par na ordem certa (a menor primeiro), a mesma de service.duplicados_dispensados. */
export const chaveDoPar = (x: string, y: string): [string, string] => (x < y ? [x, y] : [y, x]);

const LIGA = new Set(["de", "da", "do", "das", "dos", "e"]);
const partes = (nome: string) => nomeComparavel(nome).split(" ").filter((p) => p && !LIGA.has(p));

/** "Ana Souza" e "Ana de Souza Lima": o nome mais curto (duas partes ou mais) cabe inteiro no outro, com o mesmo primeiro nome. */
export function nomeParecido(a: string, b: string): boolean {
  const pa = partes(a), pb = partes(b);
  if (!pa.length || !pb.length) return false;
  if (pa.join(" ") === pb.join(" ")) return true;
  const [curto, longo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  if (curto.length < 2 || curto[0] !== longo[0]) return false;
  return curto.every((p) => longo.includes(p));
}

const MOTIVO_PESO: Record<MotivoDuplicado, number> = { email: 0, telefone: 1, nome: 2 };

/** Pares possíveis, o motivo mais forte de cada (e-mail, telefone, nome), sem os já dispensados. */
export function paresDuplicados<T extends CadastroComparavel>(lista: T[], dispensados: Set<string> = new Set()): ParDuplicado<T>[] {
  const pares = new Map<string, ParDuplicado<T>>();
  const anotar = (a: T, b: T, motivo: MotivoDuplicado) => {
    if (a.chave === b.chave) return;
    const [x, y] = chaveDoPar(a.chave, b.chave);
    const id = `${x}|${y}`;
    if (dispensados.has(id)) return;
    const atual = pares.get(id);
    if (!atual || MOTIVO_PESO[motivo] < MOTIVO_PESO[atual.motivo]) pares.set(id, { a: a.chave === x ? a : b, b: a.chave === x ? b : a, motivo });
  };
  const porChave = (motivo: MotivoDuplicado, chaves: (c: T) => (string | null)[]) => {
    const grupos = new Map<string, T[]>();
    for (const c of lista) for (const k of new Set(chaves(c).filter((v): v is string => !!v))) grupos.set(k, [...(grupos.get(k) ?? []), c]);
    for (const grupo of grupos.values()) for (let i = 0; i < grupo.length; i++) for (let j = i + 1; j < grupo.length; j++) anotar(grupo[i], grupo[j], motivo);
  };
  porChave("email", (c) => c.emails.map((e) => (e ?? "").trim().toLowerCase() || null));
  porChave("telefone", (c) => c.telefones.map((t) => telefoneParaWhatsapp(t)));
  /* nome: só compara quem tem o mesmo primeiro nome (evita comparar todos com todos) */
  const porPrimeiro = new Map<string, T[]>();
  for (const c of lista) { const p = partes(c.nome)[0]; if (p) porPrimeiro.set(p, [...(porPrimeiro.get(p) ?? []), c]); }
  for (const grupo of porPrimeiro.values()) for (let i = 0; i < grupo.length; i++) for (let j = i + 1; j < grupo.length; j++) if (nomeParecido(grupo[i].nome, grupo[j].nome)) anotar(grupo[i], grupo[j], "nome");
  return [...pares.values()].sort((p, q) => MOTIVO_PESO[p.motivo] - MOTIVO_PESO[q.motivo] || p.a.nome.localeCompare(q.a.nome, "pt-BR"));
}

export const ROTULO_MOTIVO: Record<MotivoDuplicado, string> = { email: "mesmo e-mail", telefone: "mesmo telefone", nome: "nome parecido" };
