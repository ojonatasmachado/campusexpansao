/* Contribuir por Pix: o que a igreja cadastra e o código copia-e-cola.
   Guardado em service.churches.settings.contribuirCfg da matriz (mesmo jsonb
   de sempre, sem tabela nova). O app não registra transação nem valor: só
   abre a porta para o Pix no banco da pessoa (lei 10). */

export type TipoChave = "cpf" | "cnpj" | "telefone" | "email" | "aleatoria";

export type ContribuirCfg = {
  tipo: TipoChave;
  chave: string;
  /* nome que o banco mostra ao confirmar o Pix */
  favorecido: string;
  cidade: string;
  /* frase curta da igreja no topo da tela, opcional */
  texto: string;
  /* para que a pessoa contribui (dízimo, oferta, missões); vazio = sem escolha */
  finalidades: string[];
};

export const CONTRIBUIR_PADRAO: ContribuirCfg = { tipo: "cnpj", chave: "", favorecido: "", cidade: "", texto: "", finalidades: [] };

export const TIPOS_CHAVE: { v: TipoChave; l: string; ph: string; modo: "numeric" | "tel" | "email" | "text" }[] = [
  { v: "cnpj", l: "CNPJ", ph: "00.000.000/0000-00", modo: "numeric" },
  { v: "cpf", l: "CPF", ph: "000.000.000-00", modo: "numeric" },
  { v: "telefone", l: "Celular", ph: "(11) 99999-9999", modo: "tel" },
  { v: "email", l: "E-mail", ph: "pix@suaigreja.org", modo: "email" },
  { v: "aleatoria", l: "Chave aleatória", ph: "0000aaaa-00aa-00aa-00aa-000000aaaaaa", modo: "text" },
];

export const FINALIDADES_SUGERIDAS = ["Dízimo", "Oferta", "Missões"];
export const MAX_FINALIDADES = 4;
export const MAX_TEXTO = 140;

const soDigitos = (s: string) => s.replace(/\D/g, "");

/** Chave no formato que o Pix aceita. */
export function normalizarChave(tipo: TipoChave, chave: string): string {
  const c = chave.trim();
  if (tipo === "cpf" || tipo === "cnpj") return soDigitos(c);
  if (tipo === "telefone") {
    const d = soDigitos(c);
    return d.length === 10 || d.length === 11 ? `+55${d}` : `+${d}`;
  }
  return c.toLowerCase();
}

/** O que está errado na chave, ou null. */
export function erroDaChave(tipo: TipoChave, chave: string): string | null {
  if (!chave.trim()) return "a chave Pix";
  const n = normalizarChave(tipo, chave);
  if (tipo === "cpf" && n.length !== 11) return "um CPF com 11 números";
  if (tipo === "cnpj" && n.length !== 14) return "um CNPJ com 14 números";
  if (tipo === "telefone" && !/^\+55\d{10,11}$/.test(n)) return "um celular com DDD";
  if (tipo === "email" && !/^[\x21-\x7e]+@[\x21-\x7e]+\.[\x21-\x7e]+$/.test(n)) return "um e-mail válido";
  /* o campo da conta no código Pix tem 99 caracteres: sobram 77 para a chave */
  if (n.length > 77) return "uma chave com até 77 caracteres";
  if (tipo === "aleatoria" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(n)) return "a chave aleatória completa (36 caracteres)";
  return null;
}

/** Chave como a pessoa lê (com pontos e traços). */
export function chaveLegivel(tipo: TipoChave, chave: string): string {
  const n = normalizarChave(tipo, chave);
  if (tipo === "cpf" && n.length === 11) return n.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (tipo === "cnpj" && n.length === 14) return n.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  if (tipo === "telefone") {
    const d = n.replace(/^\+55/, "");
    if (d.length === 11) return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    if (d.length === 10) return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
  }
  return n;
}

export const rotuloDoTipo = (tipo: TipoChave) => TIPOS_CHAVE.find((t) => t.v === tipo)?.l ?? "Chave";

/** Cadastro completo, com os campos que faltarem preenchidos pelo padrão; null
    quando falta chave ou favorecido (lei 6: sem isso a entrada não aparece no app). */
export function contribuirPronto(cfg: Partial<ContribuirCfg> | null | undefined): ContribuirCfg | null {
  if (!cfg || !TIPOS_CHAVE.some((t) => t.v === cfg.tipo)) return null;
  const c: ContribuirCfg = {
    ...CONTRIBUIR_PADRAO,
    ...cfg,
    texto: typeof cfg.texto === "string" ? cfg.texto : "",
    cidade: typeof cfg.cidade === "string" ? cfg.cidade : "",
    finalidades: Array.isArray(cfg.finalidades) ? cfg.finalidades.filter((f): f is string => typeof f === "string" && !!f.trim()) : [],
  };
  return typeof c.favorecido === "string" && c.favorecido.trim() && typeof c.chave === "string" && erroDaChave(c.tipo, c.chave) === null ? c : null;
}

/* ── código Pix copia-e-cola (BR Code estático, padrão EMV do Banco Central) ── */

/** sem acento e só caracteres que todo banco aceita */
function ascii(s: string, max: number) {
  const t = s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9 .,\-/]/g, "").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  /* corta em palavra inteira quando dá ("Sao Jose dos", não "Sao Jose dos Ca") */
  const corte = t.slice(0, max + 1).lastIndexOf(" ");
  return (corte > max / 2 ? t.slice(0, corte) : t.slice(0, max)).trim();
}

const campo = (id: string, valor: string) => `${id}${String(valor.length).padStart(2, "0")}${valor}`;

/** CRC16/CCITT-FALSE, como o Pix pede no campo 63 */
function crc16(s: string) {
  let crc = 0xffff;
  for (let i = 0; i < s.length; i++) {
    crc ^= s.charCodeAt(i) << 8;
    for (let b = 0; b < 8; b++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Código copia-e-cola sem valor: a pessoa digita quanto quiser no banco.
    A finalidade vai como descrição, quando cabe nos 99 caracteres do campo. */
export function codigoPix(cfg: ContribuirCfg, finalidade?: string | null): string {
  const chave = normalizarChave(cfg.tipo, cfg.chave);
  const base = campo("00", "br.gov.bcb.pix") + campo("01", chave);
  const desc = finalidade ? ascii(finalidade, 40) : "";
  const conta = desc && base.length + 4 + desc.length <= 99 ? base + campo("02", desc) : base;
  const corpo =
    campo("00", "01") +
    campo("26", conta) +
    campo("52", "0000") +
    campo("53", "986") +
    campo("58", "BR") +
    campo("59", ascii(cfg.favorecido, 25) || "IGREJA") +
    campo("60", ascii(cfg.cidade, 15) || "BRASIL") +
    campo("62", campo("05", "***")) +
    "6304";
  return corpo + crc16(corpo);
}

/** "dízimo, oferta e missões" para a linha da Caminhada; sem finalidades, dízimo e oferta */
export function listaFinalidades(fins: string[]): string {
  const l = (fins.length ? fins : ["dízimo", "oferta"]).map((f) => f.trim().charAt(0).toLowerCase() + f.trim().slice(1));
  return l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} e ${l[l.length - 1]}`;
}
