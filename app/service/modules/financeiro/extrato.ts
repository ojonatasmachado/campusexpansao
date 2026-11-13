/* Financeiro, fase 4 (0112): leitura de extrato bancário em .ofx e .csv. Cada
   linha lida vira um lançamento candidato; quem revisa escolhe categoria e
   fundo antes de confirmar (service.fin_importar_lote exige os dois, igual a
   qualquer lançamento). O .pdf fica para depois (exige biblioteca de leitura
   de PDF, decisão do usuário antes de entrar).

   Dedup: o banco já impede duas vezes o mesmo `external_id` na mesma conta
   (índice único criado na 0073); aqui só preparamos um external_id estável
   por linha (o FITID do OFX, ou uma chave composta para o CSV, que não tem
   id próprio) e desempatamos repetição legítima com um contador por chave
   (duas tarifas iguais no mesmo dia não podem virar "a mesma linha").

   Financeiro ainda não entrou na tradução (decisão registrada na N2: fica em
   pt-BR por enquanto). Mensagens aqui são texto direto, sem t()/Text. */

import { dataBR } from "../../lib/planilha";
import { isCivilDate } from "../../lib/date";

export type LinhaExtrato = {
  /** chave de linha, só para a tela (não é o id de banco); React key */
  chave: string;
  external_id: string | null;
  data: string;
  valor_cents: number;
  descricao: string;
  kind: "entrada" | "despesa";
};

/** resultado de uma leitura: linhas boas prontas pra revisão, e as que não deu pra entender (a tela avisa quantas ficaram de fora) */
export type LeituraExtrato = { linhas: LinhaExtrato[]; descartadas: number };

const MAX_LINHAS_EXTRATO = 2000;

/** acrescenta ":n" na enésima repetição da mesma chave, pra duas linhas iguais (duas tarifas de
    R$10 no mesmo dia, por exemplo) não virarem "a mesma linha" aos olhos do índice único do banco */
function desambiguar(linhas: LinhaExtrato[]): LinhaExtrato[] {
  const vistos = new Map<string, number>();
  return linhas.map((l) => {
    if (!l.external_id) return l;
    const n = (vistos.get(l.external_id) ?? 0) + 1;
    vistos.set(l.external_id, n);
    return n === 1 ? l : { ...l, external_id: `${l.external_id}:${n}` };
  });
}

/* ── OFX ──────────────────────────────────────────────────────────────────── */

/** Tolerante ao SGML do OFX 1.x (tags sem fechamento) e ao XML do OFX 2.x (todo
    mundo fechado, às vezes tudo numa linha só): quebra antes de CADA "<" (abertura
    ou fechamento), então cada tag cai na própria linha, não importa como veio. */
export function lerOfx(texto: string): LeituraExtrato {
  const limpo = texto.replace(/^﻿/, "").replace(/</g, "\n<");
  const linhas = limpo.split(/\r?\n/);
  const blocos: Record<string, string>[] = [];
  let atual: Record<string, string> | null = null;
  for (const bruta of linhas) {
    const linha = bruta.trim();
    if (!linha) continue;
    if (/^<STMTTRN>/i.test(linha)) { atual = {}; continue; }
    if (/^<\/STMTTRN>/i.test(linha)) { if (atual) blocos.push(atual); atual = null; continue; }
    if (!atual || linha.startsWith("</")) continue; // fecha de campo folha (DTPOSTED, TRNAMT...): nada a fazer
    const m = linha.match(/^<([A-Za-z0-9.]+)>(.*)$/);
    if (m) atual[m[1].toUpperCase()] = m[2].trim();
  }
  if (blocos.length === 0) throw new Error("Não achamos nenhum lançamento nesse arquivo OFX.");
  if (blocos.length > MAX_LINHAS_EXTRATO) throw new Error(`Esse extrato tem mais de ${MAX_LINHAS_EXTRATO} lançamentos; importe em partes menores.`);
  let descartadas = 0;
  const boas: LinhaExtrato[] = [];
  blocos.forEach((campos, i) => {
    const linha = converterOfx(campos, i);
    if (linha) boas.push(linha); else descartadas++;
  });
  if (boas.length === 0) throw new Error("Nenhum lançamento desse arquivo tinha data e valor que déssemos pra entender.");
  return { linhas: desambiguar(boas), descartadas };
}

function converterOfx(campos: Record<string, string>, i: number): LinhaExtrato | null {
  const dtposted = campos.DTPOSTED;
  if (!dtposted || dtposted.length < 8) return null;
  const data = `${dtposted.slice(0, 4)}-${dtposted.slice(4, 6)}-${dtposted.slice(6, 8)}`;
  if (!isCivilDate(data)) return null;
  const centavos = valorParaCentavos(campos.TRNAMT ?? "");
  if (centavos === null || centavos === 0) return null;
  const descricao = (campos.MEMO || campos.NAME || campos.PAYEE || "").slice(0, 140);
  const fitid = campos.FITID?.trim() || null;
  return {
    chave: `ofx-${i}`,
    external_id: fitid,
    data,
    valor_cents: Math.abs(centavos),
    descricao,
    kind: centavos < 0 ? "despesa" : "entrada",
  };
}

/* ── CSV ──────────────────────────────────────────────────────────────────── */

export type Tabela = { cabecalho: string[]; linhas: string[][] };
export type MapaExtrato = { data: number; valor: number; descricao: number };

const chave = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const PALPITES_DATA = ["data", "dataoperacao", "dtposted", "datalancamento", "datamovimento"];
const PALPITES_VALOR = ["valor", "valorlancamento", "valoroperacao", "amount", "montante"];
const PALPITES_DESC = ["descricao", "historico", "memo", "detalhes", "lancamento", "title"];

/** chuta data/valor/descrição pelo nome das colunas; -1 quando não achou (a tela pede pra escolher à mão) */
export function palpiteColunasExtrato(cabecalho: string[]): MapaExtrato {
  const chaves = cabecalho.map(chave);
  const achar = (palpites: string[]) => chaves.findIndex((c) => palpites.some((p) => c === p || c.includes(p)));
  return { data: achar(PALPITES_DATA), valor: achar(PALPITES_VALOR), descricao: achar(PALPITES_DESC) };
}

/** "123,45" · "123.45" · "R$ 123,45" · "(123,45)" (parênteses = negativo, extrato de cartão) → 12345 (ou -12345) centavos.
    Decide milhar x decimal pelo separador seguido de exatamente 3 dígitos e nada depois: "1.234" é milhar (123400),
    "1,234" na posição de decimal de 3 casas não existe em real, então mesma regra; "12,34" (2 casas) é decimal. */
export function valorParaCentavos(texto: string): number | null {
  const comParenteses = /^\s*\(.*\)\s*$/.test(texto);
  const limpo = texto.replace(/[^\d,.\-]/g, "").trim();
  if (!limpo) return null;
  const neg = comParenteses || limpo.includes("-");
  const semSinal = limpo.replace(/-/g, "");
  const normalizado = semSinal.replace(/([,.])(\d{3})(?!\d)/g, "$2").replace(",", ".");
  const n = Number(normalizado);
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.abs(n) * 100) * (neg ? -1 : 1);
}

/** linhas de uma Tabela já lida (ver lerCsv em lib/planilha.ts) viram lançamentos candidatos; linha sem data
    ou valor que dê pra entender é descartada (extrato real tem linha de saldo/total no meio), não derruba o arquivo */
export function lerExtratoCsv(tabela: Tabela, mapa: MapaExtrato): LeituraExtrato {
  if (mapa.data < 0 || mapa.valor < 0 || mapa.descricao < 0) throw new Error("Escolha as colunas de data, valor e descrição.");
  if (tabela.linhas.length === 0) throw new Error("A planilha não tem nenhuma linha.");
  if (tabela.linhas.length > MAX_LINHAS_EXTRATO) throw new Error(`Esse extrato tem mais de ${MAX_LINHAS_EXTRATO} lançamentos; importe em partes menores.`);
  let descartadas = 0;
  const boas: LinhaExtrato[] = [];
  tabela.linhas.forEach((linha, i) => {
    const data = dataBR(linha[mapa.data] ?? "");
    const centavos = valorParaCentavos(linha[mapa.valor] ?? "");
    if (!data || centavos === null || centavos === 0) { descartadas++; return; }
    const descricao = (linha[mapa.descricao] ?? "").slice(0, 140);
    boas.push({
      chave: `csv-${i}`,
      // CSV não tem um id de banco: a chave de dedup é a própria combinação dos dados da linha.
      external_id: `csv:${data}:${centavos}:${descricao}`.slice(0, 200),
      data,
      valor_cents: Math.abs(centavos),
      descricao,
      kind: centavos < 0 ? "despesa" : "entrada",
    });
  });
  if (boas.length === 0) throw new Error("Nenhuma linha tinha data e valor que déssemos pra entender. Confira as colunas escolhidas.");
  return { linhas: desambiguar(boas), descartadas };
}
