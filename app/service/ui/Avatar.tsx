/* Avatar do Service (BIBLIOTECA.md, prancha 6, "Pessoa"): foto ou iniciais.
   Sem foto, as iniciais ficam sobre um tom quente fixo por pessoa (o mesmo nome
   dá sempre o mesmo tom). Tamanhos xs 24, sm 32, md 44, lg 64 e xl 88. O ponto
   de presença só aparece no check-in do dia. É enfeite ao lado do nome escrito:
   o leitor de tela ouve o nome, não as iniciais (passe `rotulo` quando o avatar
   estiver sozinho). Grupo empilhado com "+N" no AvatarGrupo, que entra em
   cascata com a mola. Visual em biblioteca.css (.av). */

import type { CSSProperties } from "react";
import { iniciais } from "../lib/iniciais";

export type AvatarTamanho = "xs" | "sm" | "md" | "lg" | "xl";

/* tons quentes da paleta (AGENTS.md §2), misturados à superfície no CSS */
const TONS = ["sand", "wheat", "clay", "terra", "amber", "cocoa"] as const;

export function tomDoNome(nome: string) {
  let h = 0;
  for (const c of nome.trim().toLocaleLowerCase("pt-BR")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONS[h % TONS.length];
}

export type AvatarProps = {
  nome: string;
  foto?: string | null;
  tamanho?: AvatarTamanho;
  /* a própria pessoa (aro na cor da igreja) */
  eu?: boolean;
  /* líder do grupo (aro fino) */
  lider?: boolean;
  /* fez check-in hoje */
  presente?: boolean;
  /* nome falado quando o avatar está sozinho, sem o nome escrito ao lado */
  rotulo?: string;
  className?: string;
  style?: CSSProperties;
};

export function Avatar({ nome, foto, tamanho = "sm", eu, lider, presente, rotulo, className, style }: AvatarProps) {
  const cls = ["av", `av-${tamanho}`, foto ? "has-foto" : `av-tom-${tomDoNome(nome)}`, eu ? "self" : "", lider ? "lead" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <span className={cls} style={foto ? { ...style, backgroundImage: `url(${JSON.stringify(foto)})` } : style}
      role={rotulo ? "img" : undefined} aria-label={rotulo} aria-hidden={rotulo ? undefined : true}>
      {iniciais(nome)}
      {presente ? <span className="av-ponto" /> : null}
    </span>
  );
}

export type AvatarGrupoProps = {
  pessoas: { id?: string; nome: string; foto?: string | null }[];
  /* quantos aparecem antes do "+N" */
  max?: number;
  /* total de verdade, quando a lista veio cortada */
  total?: number;
  tamanho?: AvatarTamanho;
  className?: string;
};

export function AvatarGrupo({ pessoas, max = 4, total, tamanho = "sm", className }: AvatarGrupoProps) {
  const vistos = pessoas.slice(0, max);
  const resto = (total ?? pessoas.length) - vistos.length;
  return (
    <span className={`av-stack${className ? ` ${className}` : ""}`}>
      {vistos.map((p, i) => <Avatar key={p.id ?? `${p.nome}-${i}`} nome={p.nome} foto={p.foto} tamanho={tamanho} />)}
      {resto > 0 ? <span className={`av av-${tamanho} av-more num`} aria-hidden="true">+{resto}</span> : null}
    </span>
  );
}
