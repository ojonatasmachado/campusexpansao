/* Regras de pessoa usadas no painel (lista de Pessoas, Início, cadastro). */
import { mesmoTelefone } from "./telefone";

const DIA = 86400000;
export const DIAS_NOVO = 30;

/** "Novo" = chegou à igreja há até 30 dias, pelo dado real do membro:
 *  1. situação marcada como "novo" na ficha;
 *  2. senão, a data do primeiro contato (first_contact), se houver;
 *  3. sem primeiro contato e sem "membro desde", vale a data do cadastro.
 *  Quem tem histórico (primeiro contato antigo ou ano de membro) nunca vira
 *  "novo" só porque a ficha foi importada agora. */
export function ehNovo(p: { situation?: string | null; firstContact?: string | null; sinceYear?: string | null; createdAt?: string | null }, agora = Date.now()): boolean {
  if (p.situation === "novo") return true;
  const limite = agora - DIAS_NOVO * DIA;
  const contato = (p.firstContact ?? "").trim();
  if (contato) {
    const t = new Date(contato.length === 10 ? `${contato}T12:00:00` : contato).getTime();
    return !Number.isNaN(t) && t > limite;
  }
  if ((p.sinceYear ?? "").trim()) return false;
  if (!p.createdAt) return false;
  const t = new Date(p.createdAt).getTime();
  return !Number.isNaN(t) && t > limite;
}

/** Nome comparável: sem acento, minúsculo, espaços simples. */
export function nomeComparavel(nome?: string | null): string {
  return (nome ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/** Possível duplicado de quem está sendo cadastrado: mesmo telefone ou mesmo nome. */
export function possivelDuplicado<T extends { name: string; phone?: string | null }>(lista: T[], nome: string, telefone: string): { pessoa: T; motivo: "telefone" | "nome" } | null {
  const porTel = lista.find((p) => mesmoTelefone(p.phone, telefone));
  if (porTel) return { pessoa: porTel, motivo: "telefone" };
  const n = nomeComparavel(nome);
  const porNome = n ? lista.find((p) => nomeComparavel(p.name) === n) : undefined;
  return porNome ? { pessoa: porNome, motivo: "nome" } : null;
}
