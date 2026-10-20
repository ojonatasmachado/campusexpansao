/* Importar membros por planilha: ler o arquivo, adivinhar as colunas,
   normalizar cada linha e achar possíveis duplicados. Sem tela e sem banco
   aqui, para testar sozinho (scripts/check-planilha.ts).

   Formatos: CSV (vírgula, ponto e vírgula ou tab; UTF-8 com ou sem BOM, ou
   o ANSI que o Excel brasileiro salva) e XLSX (primeira aba), lido com o
   jszip e o fast-xml-parser que o projeto já usa. */

import { digitosTelefone, formatarTelefone } from "./telefone";
import { nomeComparavel } from "./pessoas";

export type Campo =
  | "nome" | "telefone" | "email" | "nascimento" | "sexo" | "estadoCivil"
  | "rua" | "bairro" | "cidade" | "estado" | "cep" | "situacao" | "membroDesde";

export const CAMPOS: { id: Campo; rotulo: string; apelidos: string[] }[] = [
  { id: "nome", rotulo: "Nome", apelidos: ["nome", "nomecompleto", "nomedapessoa", "nomedomembro", "membro", "pessoa", "name", "fullname"] },
  { id: "telefone", rotulo: "Telefone", apelidos: ["telefone", "celular", "whatsapp", "whats", "zap", "fone", "tel", "telefonecelular", "contato", "phone", "mobile"] },
  { id: "email", rotulo: "E-mail", apelidos: ["email", "e-mail", "mail", "correioeletronico"] },
  { id: "nascimento", rotulo: "Nascimento", apelidos: ["nascimento", "datadenascimento", "datanascimento", "dtnascimento", "dtnasc", "nasc", "aniversario", "birth", "birthday", "datadeaniversario"] },
  { id: "sexo", rotulo: "Sexo", apelidos: ["sexo", "genero", "gender", "sex"] },
  { id: "estadoCivil", rotulo: "Estado civil", apelidos: ["estadocivil", "civil", "ecivil", "maritalstatus"] },
  { id: "rua", rotulo: "Endereço (rua e número)", apelidos: ["endereco", "rua", "logradouro", "enderecocompleto", "address", "street", "residencia"] },
  { id: "bairro", rotulo: "Bairro", apelidos: ["bairro", "neighborhood", "distrito"] },
  { id: "cidade", rotulo: "Cidade", apelidos: ["cidade", "municipio", "city"] },
  { id: "estado", rotulo: "Estado (UF)", apelidos: ["estado", "uf", "state"] },
  { id: "cep", rotulo: "CEP", apelidos: ["cep", "codigopostal", "zip", "zipcode", "postalcode"] },
  { id: "situacao", rotulo: "Situação", apelidos: ["situacao", "status", "tipo", "categoria", "vinculo", "condicao"] },
  { id: "membroDesde", rotulo: "Membro desde (ano)", apelidos: ["membrodesde", "desde", "anodeentrada", "dataderecepcao", "recepcao", "datadeentrada", "admissao", "membrohadesde"] },
];

export const ROTULO_CAMPO: Record<Campo, string> = Object.fromEntries(CAMPOS.map((c) => [c.id, c.rotulo])) as Record<Campo, string>;

export type Tabela = { cabecalho: string[]; linhas: string[][] };

/** limite por importação: acima disso, dividir a planilha */
export const MAX_LINHAS = 5000;
export const MAX_BYTES = 10 * 1024 * 1024;

/* ── leitura ─────────────────────────────────────────────────────────────── */

/** "Data de Nascimento:" → "datadenascimento" */
export function chaveCabecalho(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function separadorProvavel(primeira: string): string {
  const conta = (c: string) => {
    let n = 0, aspas = false;
    for (const ch of primeira) { if (ch === '"') aspas = !aspas; else if (ch === c && !aspas) n++; }
    return n;
  };
  const opcoes = [";", ",", "\t"].map((c) => [c, conta(c)] as const).sort((a, b) => b[1] - a[1]);
  return opcoes[0][1] > 0 ? opcoes[0][0] : ",";
}

/** CSV no padrão RFC 4180: aspas, aspas dobradas e quebra de linha dentro de aspas. */
export function lerCsv(texto: string): Tabela {
  const t = texto.replace(/^﻿/, "");
  const fimPrimeira = t.search(/\r?\n/);
  const sep = separadorProvavel(fimPrimeira < 0 ? t : t.slice(0, fimPrimeira));
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (aspas) {
      if (ch === '"') {
        if (t[i + 1] === '"') { celula += '"'; i++; } else aspas = false;
      } else celula += ch;
    } else if (ch === '"' && celula === "") aspas = true;
    else if (ch === sep) { linha.push(celula); celula = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && t[i + 1] === "\n") i++;
      linha.push(celula); celula = "";
      linhas.push(linha); linha = [];
    } else celula += ch;
  }
  if (celula !== "" || linha.length) { linha.push(celula); linhas.push(linha); }
  return arrumar(linhas);
}

/** tira linhas vazias, apara as células e iguala a largura ao cabeçalho */
function arrumar(brutas: string[][]): Tabela {
  const cheias = brutas.map((l) => l.map((c) => (c ?? "").replace(/ /g, " ").trim())).filter((l) => l.some((c) => c !== ""));
  if (!cheias.length) return { cabecalho: [], linhas: [] };
  const largura = Math.max(...cheias.map((l) => l.length));
  const [cab, ...resto] = cheias;
  const cabecalho = Array.from({ length: largura }, (_, i) => cab[i] || `Coluna ${i + 1}`);
  return { cabecalho, linhas: resto.map((l) => Array.from({ length: largura }, (_, i) => l[i] ?? "")) };
}

/** Bytes de um CSV para texto: UTF-8, ou Windows-1252 se o UTF-8 não fechar (Excel BR salva assim). */
export function decodificarTexto(buf: ArrayBuffer): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder("windows-1252").decode(buf);
  }
}

/** coluna "BC12" → índice 54 */
function indiceColuna(ref: string): number {
  const letras = ref.replace(/[0-9]/g, "");
  let n = 0;
  for (const ch of letras) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

type NoXml = Record<string, unknown>;
const lista = <T,>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

/** texto de um <si> ou <is> (simples ou com trechos <r><t>) */
function textoRico(no: unknown): string {
  if (no === undefined || no === null) return "";
  if (typeof no !== "object") return String(no);
  const o = no as NoXml;
  if ("t" in o) {
    const t = o.t;
    return typeof t === "object" && t !== null ? String((t as NoXml)["#text"] ?? "") : String(t ?? "");
  }
  return lista(o.r as unknown).map((r) => textoRico(r)).join("");
}

/** Primeira aba de um .xlsx. Datas vêm como número serial do Excel; quem lê o campo converte. */
export async function lerXlsx(buf: ArrayBuffer): Promise<Tabela> {
  const [{ default: JSZip }, { XMLParser }] = await Promise.all([import("jszip"), import("fast-xml-parser")]);
  const zip = await JSZip.loadAsync(buf);
  const xml = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@", parseTagValue: false, trimValues: false, removeNSPrefix: true });
  const ler = async (caminho: string) => {
    const arq = zip.file(caminho);
    return arq ? (xml.parse(await arq.async("string")) as NoXml) : null;
  };
  /* caminho da primeira aba pelo workbook + rels (nem sempre é sheet1.xml) */
  let caminhoAba = "xl/worksheets/sheet1.xml";
  const wb = await ler("xl/workbook.xml");
  const rels = await ler("xl/_rels/workbook.xml.rels");
  const primeira = lista((wb?.workbook as NoXml | undefined)?.sheets ? ((wb!.workbook as NoXml).sheets as NoXml).sheet as NoXml[] : undefined)[0];
  const rid = primeira?.["@id"] as string | undefined;
  if (rid && rels) {
    const rel = lista((rels.Relationships as NoXml)?.Relationship as NoXml[]).find((r) => r["@Id"] === rid);
    const alvo = rel?.["@Target"] as string | undefined;
    if (alvo) caminhoAba = alvo.startsWith("/") ? alvo.slice(1) : `xl/${alvo.replace(/^\.\//, "")}`;
  }
  const compartilhadas = await ler("xl/sharedStrings.xml");
  const textos = lista((compartilhadas?.sst as NoXml | undefined)?.si as unknown).map(textoRico);
  const aba = await ler(caminhoAba);
  if (!aba) throw new Error("Não achamos a primeira aba da planilha.");
  const dados = (aba.worksheet as NoXml)?.sheetData as NoXml | undefined;
  const linhas: string[][] = [];
  for (const row of lista(dados?.row as NoXml[] | undefined)) {
    const r = Number(row["@r"] ?? linhas.length + 1) - 1;
    const celulas: string[] = [];
    let proxima = 0;
    for (const c of lista(row.c as NoXml[] | undefined)) {
      const col = c["@r"] ? indiceColuna(String(c["@r"])) : proxima;
      proxima = col + 1;
      const tipo = c["@t"] as string | undefined;
      const v = c.v === undefined ? "" : typeof c.v === "object" ? String((c.v as NoXml)["#text"] ?? "") : String(c.v);
      let valor = v;
      if (tipo === "s") valor = textos[Number(v)] ?? "";
      else if (tipo === "inlineStr") valor = textoRico(c.is);
      else if (tipo === "b") valor = v === "1" ? "sim" : "não";
      celulas[col] = valor;
    }
    linhas[r] = Array.from(celulas, (x) => x ?? "");
  }
  return arrumar(Array.from(linhas, (l) => l ?? []));
}

export type ArquivoLido = Tabela & { nome: string };

/** Lê o arquivo escolhido. Lança Error com texto pronto para a tela. */
export async function lerArquivo(arq: { name: string; size: number; arrayBuffer: () => Promise<ArrayBuffer> }): Promise<ArquivoLido> {
  const ext = (arq.name.split(".").pop() ?? "").toLowerCase();
  if (arq.size > MAX_BYTES) throw new Error("O arquivo passa de 10 MB. Divida a planilha em partes menores.");
  if (ext === "xls" || ext === "ods" || ext === "numbers") throw new Error("Esse formato não abre aqui. No Excel ou no Google Planilhas, salve como .xlsx ou .csv e envie de novo.");
  const buf = await arq.arrayBuffer();
  const ehZip = new Uint8Array(buf.slice(0, 2)).join(",") === "80,75";
  let tabela: Tabela;
  try {
    tabela = ext === "xlsx" || ehZip ? await lerXlsx(buf) : lerCsv(decodificarTexto(buf));
  } catch {
    throw new Error("Não conseguimos ler este arquivo. Confira se é uma planilha .csv ou .xlsx.");
  }
  if (!tabela.cabecalho.length) throw new Error("A planilha está vazia.");
  if (!tabela.linhas.length) throw new Error("A planilha só tem o cabeçalho. Coloque uma pessoa por linha, a partir da segunda.");
  if (tabela.linhas.length > MAX_LINHAS) throw new Error(`A planilha tem ${tabela.linhas.length.toLocaleString("pt-BR")} linhas. Importe até ${MAX_LINHAS.toLocaleString("pt-BR")} por vez.`);
  return { ...tabela, nome: arq.name };
}

/* ── colunas ─────────────────────────────────────────────────────────────── */

export type Mapa = (Campo | "")[];

/** Palpite por nome do cabeçalho: igual primeiro, depois "começa com" e "contém". Cada campo uma vez. */
export function palpiteColunas(cabecalho: string[]): Mapa {
  const chaves = cabecalho.map(chaveCabecalho);
  const mapa: Mapa = chaves.map(() => "");
  const usado = new Set<Campo>();
  const tentativas: ((k: string, a: string) => boolean)[] = [
    (k, a) => k === a,
    (k, a) => a.length >= 4 && k.startsWith(a),
    (k, a) => a.length >= 5 && k.includes(a),
  ];
  for (const teste of tentativas) {
    chaves.forEach((k, i) => {
      if (mapa[i] || !k) return;
      const campo = CAMPOS.find((c) => !usado.has(c.id) && c.apelidos.some((a) => teste(k, chaveCabecalho(a))));
      if (campo) { mapa[i] = campo.id; usado.add(campo.id); }
    });
  }
  return mapa;
}

/* ── valores ─────────────────────────────────────────────────────────────── */

const iso = (a: number, m: number, d: number) => `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
function dataReal(a: number, m: number, d: number): string | null {
  const dt = new Date(Date.UTC(a, m - 1, d));
  if (dt.getUTCFullYear() !== a || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return iso(a, m, d);
}

/** "05/03/1990", "5/3/90", "05-03-1990", "1990-03-05", 32937 (serial do Excel) → "1990-03-05". */
export function dataBR(valor: string, hoje = new Date()): string | null {
  const s = valor.trim();
  if (!s) return null;
  let r: string | null = null;
  let m: RegExpMatchArray | null;
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/))) r = dataReal(+m[1], +m[2], +m[3]);
  else if ((m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s.*)?$/))) {
    let a = +m[3];
    if (m[3].length === 2) a += a > hoje.getFullYear() % 100 ? 1900 : 2000;
    r = dataReal(a, +m[2], +m[1]);
  } else if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const n = Math.floor(Number(s));
    if (n > 60 && n < 80000) {
      const dt = new Date(Date.UTC(1899, 11, 30) + n * 86400000);
      r = iso(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
    }
  }
  if (!r) return null;
  const ano = Number(r.slice(0, 4));
  if (ano < 1900 || r > iso(hoje.getFullYear(), hoje.getMonth() + 1, hoje.getDate())) return null;
  return r;
}

const MINUSCULAS = new Set(["de", "da", "do", "das", "dos", "e", "di", "du", "del", "van", "von"]);
/** Nome todo em caixa alta ou baixa vira "Maria da Silva"; nome já misturado fica como veio. */
export function arrumarNome(valor: string): string {
  const s = valor.replace(/\s+/g, " ").trim();
  if (!s || (s !== s.toUpperCase() && s !== s.toLowerCase())) return s;
  return s.toLowerCase().split(" ").map((p, i) => (i > 0 && MINUSCULAS.has(p) ? p : p.replace(/(^|[-'])(\p{L})/gu, (_, a: string, b: string) => a + b.toUpperCase()))).join(" ");
}

export function sexo(valor: string): "masculino" | "feminino" | null {
  const k = chaveCabecalho(valor);
  if (["m", "masc", "masculino", "homem", "h", "male"].includes(k)) return "masculino";
  if (["f", "fem", "feminino", "mulher", "female"].includes(k)) return "feminino";
  return null;
}

export const ESTADOS_CIVIS = { solteiro: "Solteiro(a)", casado: "Casado(a)", uniao_estavel: "União estável", divorciado: "Divorciado(a)", separado: "Separado(a)", viuvo: "Viúvo(a)" } as const;
export type EstadoCivil = keyof typeof ESTADOS_CIVIS;
export function estadoCivil(valor: string): EstadoCivil | null {
  const k = chaveCabecalho(valor);
  if (!k) return null;
  if (k.startsWith("solt")) return "solteiro";
  if (k.startsWith("casad")) return "casado";
  if (k.startsWith("uniao") || k.includes("estavel") || k === "amasiado") return "uniao_estavel";
  if (k.startsWith("divorc")) return "divorciado";
  if (k.startsWith("separ") || k.startsWith("desquit")) return "separado";
  if (k.startsWith("viuv")) return "viuvo";
  return null;
}

const UF_POR_NOME: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE", distritofederal: "DF", espiritosanto: "ES", goias: "GO",
  maranhao: "MA", matogrosso: "MT", matogrossodosul: "MS", minasgerais: "MG", para: "PA", paraiba: "PB", parana: "PR", pernambuco: "PE",
  piaui: "PI", riodejaneiro: "RJ", riograndedonorte: "RN", riograndedosul: "RS", rondonia: "RO", roraima: "RR", santacatarina: "SC",
  saopaulo: "SP", sergipe: "SE", tocantins: "TO",
};
const UFS = new Set(Object.values(UF_POR_NOME));
export function uf(valor: string): string | null {
  const k = chaveCabecalho(valor);
  if (UFS.has(k.toUpperCase()) && k.length === 2) return k.toUpperCase();
  return UF_POR_NOME[k] ?? null;
}

/** "1234567" (o Excel come o zero) e "01234-567" → "01234-567" */
export function cep(valor: string): string | null {
  const d = valor.replace(/\D/g, "");
  if (d.length === 8 || d.length === 7) {
    const c = d.padStart(8, "0");
    return `${c.slice(0, 5)}-${c.slice(5)}`;
  }
  return null;
}

export function situacao(valor: string): "membro" | "novo" | null {
  const k = chaveCabecalho(valor);
  if (!k) return null;
  if (/^(novo|nova|visitante|visita|congregad|frequentador|frequenta|interessad|novoconvertido|novaconvertida|decis)/.test(k)) return "novo";
  if (/^(membro|ativo|ativa|batizad|comungante|efetivo|transferid)/.test(k)) return "membro";
  return null;
}

/** "2015", "15/03/2015" → "2015" */
export function anoDesde(valor: string, hoje = new Date()): string | null {
  const s = valor.trim();
  if (/^\d{4}$/.test(s)) { const a = +s; return a >= 1900 && a <= hoje.getFullYear() ? s : null; }
  const d = dataBR(s, hoje);
  return d ? d.slice(0, 4) : null;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* ── linha ───────────────────────────────────────────────────────────────── */

export type Valores = {
  nome: string; telefone: string | null; email: string | null; nascimento: string | null;
  sexo: "masculino" | "feminino" | null; estadoCivil: EstadoCivil | null;
  rua: string | null; bairro: string | null; cidade: string | null; estado: string | null; cep: string | null;
  situacao: "membro" | "novo"; membroDesde: string | null;
};

export type LinhaLida = {
  /** número da linha na planilha (o cabeçalho é a 1) */
  n: number;
  valores: Valores;
  erro: string | null;
  avisos: string[];
};

/** DDD que mais aparece entre os telefones completos da coluna (para quem veio sem DDD). */
export function dddMaisComum(tabela: Tabela, mapa: Mapa): string {
  const col = mapa.indexOf("telefone");
  if (col < 0) return "";
  const conta = new Map<string, number>();
  for (const l of tabela.linhas) {
    const d = digitosTelefone(l[col]);
    if (d.length === 10 || d.length === 11) conta.set(d.slice(0, 2), (conta.get(d.slice(0, 2)) ?? 0) + 1);
  }
  return [...conta.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export function telefoneSemDdd(valor: string): boolean {
  const d = valor.replace(/\D/g, "");
  return d.length === 8 || d.length === 9;
}

export function lerLinha(celulas: string[], n: number, mapa: Mapa, opcoes: { ddd?: string; hoje?: Date } = {}): LinhaLida {
  const hoje = opcoes.hoje ?? new Date();
  const bruto = (c: Campo) => { const i = mapa.indexOf(c); return i >= 0 ? (celulas[i] ?? "").trim() : ""; };
  const avisos: string[] = [];
  const opcional = <T,>(c: Campo, ler: (s: string) => T | null, aviso: string): T | null => {
    const s = bruto(c);
    if (!s) return null;
    const v = ler(s);
    if (v === null) avisos.push(`${aviso} "${s.length > 40 ? `${s.slice(0, 40)}…` : s}" fica de fora`);
    return v;
  };
  const nome = arrumarNome(bruto("nome")).slice(0, 160);

  let telefone: string | null = null;
  const telBruto = bruto("telefone");
  if (telBruto) {
    const ddd = (opcoes.ddd ?? "").replace(/\D/g, "");
    const comDdd = telefoneSemDdd(telBruto) && ddd.length === 2 ? `${ddd}${telBruto.replace(/\D/g, "")}` : telBruto;
    const d = digitosTelefone(comDdd);
    if (d.length === 10 || d.length === 11) telefone = formatarTelefone(comDdd);
    else { telefone = telBruto; avisos.push(telefoneSemDdd(telBruto) ? "telefone sem DDD" : "telefone incompleto, entra como está"); }
  }
  const email = opcional("email", (v) => (EMAIL.test(v) ? v.toLowerCase() : null), "e-mail");
  const nascimento = opcional("nascimento", (s) => dataBR(s, hoje), "data de nascimento");
  const sx = opcional("sexo", sexo, "sexo");
  const ec = opcional("estadoCivil", estadoCivil, "estado civil");
  const est = opcional("estado", uf, "estado");
  const cp = opcional("cep", cep, "CEP");
  const sit = opcional("situacao", situacao, "situação");
  const desde = opcional("membroDesde", (s) => anoDesde(s, hoje), "membro desde");
  const texto = (c: Campo) => bruto(c).replace(/\s+/g, " ").slice(0, 200) || null;
  return {
    n,
    valores: {
      nome, telefone, email, nascimento, sexo: sx, estadoCivil: ec,
      rua: texto("rua"), bairro: texto("bairro"), cidade: texto("cidade"), estado: est, cep: cp,
      situacao: sit ?? "membro", membroDesde: desde,
    },
    erro: !nome ? "sem nome" : null,
    avisos,
  };
}

/* ── duplicados ──────────────────────────────────────────────────────────── */

export type Existente = {
  id: string; name: string; phone: string | null; email: string | null; birth: string | null;
  neighborhood?: string | null; street?: string | null; city?: string | null; state?: string | null; postal_code?: string | null;
  sex?: string | null; marital_status?: string | null; since_year?: string | null;
};

export type Motivo = "e-mail" | "telefone" | "nome e nascimento" | "nome";
export type Conferida = LinhaLida & {
  /** já cadastrada na igreja */
  existente: { pessoa: Existente; motivo: Motivo } | null;
  /** repete uma linha anterior da própria planilha */
  repeteLinha: number | null;
};

function chaves(p: { email?: string | null; phone?: string | null; name: string; birth?: string | null }): [Motivo, string][] {
  const out: [Motivo, string][] = [];
  const e = (p.email ?? "").trim().toLowerCase();
  if (e) out.push(["e-mail", e]);
  const t = digitosTelefone(p.phone);
  if (t.length >= 10) out.push(["telefone", t]);
  const n = nomeComparavel(p.name);
  if (n && p.birth) out.push(["nome e nascimento", `${n}|${p.birth}`]);
  return out;
}

/* Linha sem e-mail, telefone completo e nascimento não tem chave forte: compara
   pelo nome, o mesmo último recurso do "Novo membro" (possivelDuplicado).
   Sem isso, reimportar a mesma planilha cadastrava essas pessoas de novo. */
function chavesDaLinha(p: { email?: string | null; phone?: string | null; name: string; birth?: string | null }): [Motivo, string][] {
  const fortes = chaves(p);
  const n = nomeComparavel(p.name);
  return fortes.length || !n ? fortes : [["nome", n]];
}

/** Marca, linha a linha, quem já está cadastrado e quem se repete na planilha. */
export function conferir(linhas: LinhaLida[], existentes: Existente[]): Conferida[] {
  const indice = new Map<string, Existente>();
  for (const p of existentes) {
    for (const [m, k] of chaves(p)) if (!indice.has(`${m}:${k}`)) indice.set(`${m}:${k}`, p);
    const n = nomeComparavel(p.name);
    if (n && !indice.has(`nome:${n}`)) indice.set(`nome:${n}`, p);
  }
  const vistas = new Map<string, number>();
  return linhas.map((l) => {
    if (l.erro) return { ...l, existente: null, repeteLinha: null };
    const ks = chavesDaLinha({ email: l.valores.email, phone: l.valores.telefone, name: l.valores.nome, birth: l.valores.nascimento });
    let existente: Conferida["existente"] = null;
    for (const [m, k] of ks) { const p = indice.get(`${m}:${k}`); if (p) { existente = { pessoa: p, motivo: m }; break; } }
    let repeteLinha: number | null = null;
    for (const [m, k] of ks) { const v = vistas.get(`${m}:${k}`); if (v !== undefined) { repeteLinha = v; break; } }
    if (repeteLinha === null) for (const [m, k] of ks) vistas.set(`${m}:${k}`, l.n);
    return { ...l, existente, repeteLinha };
  });
}

/** Colunas do banco a partir dos valores lidos. */
export function paraBanco(v: Valores, comColunasNovas: boolean) {
  return {
    name: v.nome,
    phone: v.telefone,
    email: v.email,
    birth: v.nascimento,
    street: v.rua,
    neighborhood: v.bairro,
    city: v.cidade,
    state: v.estado,
    postal_code: v.cep,
    since_year: v.membroDesde,
    ...(comColunasNovas ? { sex: v.sexo, marital_status: v.estadoCivil } : {}),
  };
}

/** Só o que está vazio na ficha e veio preenchido na planilha (nunca troca o que já existe). */
export function camposVazios(p: Existente, v: Valores, comColunasNovas: boolean): Record<string, string> {
  const novo = paraBanco(v, comColunasNovas) as Record<string, string | null>;
  const atual = p as unknown as Record<string, string | null | undefined>;
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(novo)) {
    if (k === "name" || !val) continue;
    if (!(atual[k] ?? "").toString().trim()) out[k] = val;
  }
  return out;
}

/** Planilha modelo: cabeçalho com os nomes que o palpite reconhece e duas linhas de exemplo. */
export const MODELO: string[][] = [
  ["Nome", "Telefone", "E-mail", "Nascimento", "Sexo", "Estado civil", "Endereço", "Bairro", "Cidade", "Estado", "CEP", "Situação", "Membro desde"],
  ["Maria da Silva Souza", "(11) 98765-4321", "maria@exemplo.com", "05/03/1990", "Feminino", "Casada", "Rua das Flores, 120", "Centro", "São Paulo", "SP", "01234-000", "Membro", "2015"],
  ["João Pereira", "11 91234-5678", "", "21/11/2001", "Masculino", "Solteiro", "", "Vila Nova", "São Paulo", "SP", "", "Novo", ""],
];
