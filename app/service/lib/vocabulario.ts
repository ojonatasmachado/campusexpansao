/* Vocabulário da igreja (lei 7 de app/service/modules/README.md).
   Quatro termos renomeáveis: Caminhada, Grupo, Culto e Voluntário. Cada um tem
   o nome da tela (até 24 caracteres) e o nome curto da barra (até 10).
   Fica em service.churches.vocabulario (0056), na igreja matriz, igual à marca.
   Nenhum texto de interface escreve um desses termos fixo: usa termo() ou um
   texto com marcador ("{Cultos} e eventos") passado por comTermos().
   Funções puras: valem no servidor e no cliente. O contexto React está em
   ./vocabulario-context.tsx. */

import type { Termo } from "../modules/define";

export type { Termo };

export const LIMITE_TELA = 24;
export const LIMITE_CURTO = 10;

export const TERMOS: Record<Termo, { tela: string; curto: string; ajuda: string }> = {
  caminhada: { tela: "Caminhada", curto: "Caminhada", ajuda: "Aba do app com os passos da pessoa na igreja" },
  grupo: { tela: "Grupo", curto: "Grupo", ajuda: "Pequenos grupos que se reúnem durante a semana" },
  culto: { tela: "Culto", curto: "Culto", ajuda: "Encontros da igreja onde os times servem" },
  voluntario: { tela: "Voluntário", curto: "Voluntário", ajuda: "Quem serve em algum time" },
};

export const TERMOS_IDS = Object.keys(TERMOS) as Termo[];

export type NomeTermo = { tela: string; curto: string };
export type Vocabulario = Record<Termo, NomeTermo>;

export const VOCABULARIO_PADRAO: Vocabulario = Object.fromEntries(
  TERMOS_IDS.map((id) => [id, { tela: TERMOS[id].tela, curto: TERMOS[id].curto }]),
) as Vocabulario;

function limpa(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

/** Lê o que veio do banco. `gruposCfgTermoP` é o nome antigo do grupo
    (settings.gruposCfg.termoP), usado enquanto o termo novo não foi salvo. */
export function normalizarVocabulario(raw: unknown, gruposCfgTermoP?: string | null): Vocabulario {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = {} as Vocabulario;
  for (const id of TERMOS_IDS) {
    const r = obj[id] && typeof obj[id] === "object" ? (obj[id] as Record<string, unknown>) : {};
    const antigo = id === "grupo" ? limpa(gruposCfgTermoP, LIMITE_TELA) : "";
    const tela = limpa(r.tela, LIMITE_TELA) || antigo || TERMOS[id].tela;
    /* sem nome curto: usa o da tela se couber, senão a primeira palavra dele */
    const curtoPadrao = tela.length <= LIMITE_CURTO ? tela : tela.split(" ")[0].slice(0, LIMITE_CURTO);
    const curto = limpa(r.curto, LIMITE_CURTO) || (tela === TERMOS[id].tela ? TERMOS[id].curto : curtoPadrao);
    out[id] = { tela, curto };
  }
  return out;
}

/** O que se grava: só os termos diferentes do padrão. */
export function vocabularioParaGravar(v: Vocabulario): Partial<Record<Termo, NomeTermo>> {
  const out: Partial<Record<Termo, NomeTermo>> = {};
  for (const id of TERMOS_IDS) {
    const tela = limpa(v[id]?.tela, LIMITE_TELA) || TERMOS[id].tela;
    const curto = limpa(v[id]?.curto, LIMITE_CURTO) || (tela.length <= LIMITE_CURTO ? tela : TERMOS[id].curto);
    if (tela !== TERMOS[id].tela || curto !== TERMOS[id].curto) out[id] = { tela, curto };
  }
  return out;
}

function pluralPalavra(p: string): string {
  if (!p || /[^\p{L}]$/u.test(p)) return p;
  const low = p.toLowerCase();
  if (/(s|x)$/.test(low)) return p; // ônibus, tórax
  if (/ão$/.test(low)) return p.slice(0, -2) + (p.slice(-2) === "ÃO" ? "ÕES" : "ões");
  if (/(r|z)$/.test(low)) return p + "es";
  if (/m$/.test(low)) return p.slice(0, -1) + "ns";
  if (/[aeo]l$/.test(low)) return p.slice(0, -1) + "is";
  if (/ul$/.test(low)) return p.slice(0, -1) + "is";
  if (/il$/.test(low)) return p.slice(0, -1) + "s";
  return p + "s";
}

/** Plural do nome: só a primeira palavra varia ("Grupo de Comunhão" → "Grupos de Comunhão"). */
export function pluralTermo(nome: string): string {
  const [primeira, ...resto] = nome.split(" ");
  return [pluralPalavra(primeira), ...resto].join(" ");
}

/** Minúscula no meio da frase; siglas (GC, EBD) ficam como estão. */
export function minusculaTermo(nome: string): string {
  return nome
    .split(" ")
    .map((w) => (w.length > 1 && w === w.toUpperCase() ? w : w.toLowerCase()))
    .join(" ");
}

export type FormaTermo = { curto?: boolean; plural?: boolean; minuscula?: boolean };

export function termoDe(v: Vocabulario | null | undefined, id: Termo, forma: FormaTermo = {}): string {
  const nome = (v ?? VOCABULARIO_PADRAO)[id] ?? VOCABULARIO_PADRAO[id];
  let s = forma.curto ? nome.curto : nome.tela;
  if (forma.plural) s = pluralTermo(s);
  if (forma.minuscula) s = minusculaTermo(s);
  return s;
}

const MARCADOR = /\{(caminhada|grupo|culto|voluntario|voluntário)(s?)(:curto)?\}/gi;

/** Troca marcadores num texto fixo: {Culto}, {cultos}, {Caminhada:curto}.
    Maiúscula na primeira letra do marcador = nome como a igreja escreveu;
    minúscula = no meio da frase; "s" no fim = plural. */
export function comTermos(texto: string, v?: Vocabulario | null): string {
  if (!texto || texto.indexOf("{") < 0) return texto;
  return texto.replace(MARCADOR, (_m, nome: string, s: string, curto?: string) => {
    const id = nome.toLowerCase().replace("á", "a") as Termo;
    const minuscula = nome[0] === nome[0].toLowerCase();
    return termoDe(v, id, { plural: !!s, minuscula, curto: !!curto });
  });
}

/** Busca do painel: o texto com o nome interno (padrão) e com o nome da igreja. */
export function textoBuscavel(texto: string, v?: Vocabulario | null): string {
  const padrao = comTermos(texto, VOCABULARIO_PADRAO);
  const daIgreja = comTermos(texto, v);
  return padrao === daIgreja ? padrao : `${daIgreja} ${padrao}`;
}
