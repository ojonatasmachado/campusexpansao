/* Gráficos do Service (BIBLIOTECA.md, prancha 2, "Componentes de gestão"): um
   gráfico para cada pergunta. Todo número conta do zero, toda barra sobe da base
   e toda linha se desenha da esquerda; quando o dado muda, a barra desliza até o
   novo valor. Cor da igreja só no que importa (o mês atual, a entrada, a meta);
   o resto em neutro. Com movimento reduzido, tudo aparece no estado final.
   O desenho é enfeite: cada gráfico tem um nome falado com os valores (role img)
   ou mostra os números escritos ao lado. Visual em biblioteca.css (.graf-*). */

import type { CSSProperties, ReactNode } from "react";
import { Contagem } from "./Contagem";

const num = (n: number) => n.toLocaleString("pt-BR");
const ordem = (i: number) => ({ "--i": i }) as CSSProperties;

/* ── Comparação: barras verticais, a última (o período atual) na cor da igreja ── */
export function Barras({ serie, rotulos, rotulo, formatar = num, destacarUltima = true, className }: {
  serie: number[];
  rotulos: string[];
  /* nome do gráfico para o leitor de tela */
  rotulo: string;
  formatar?: (n: number) => string;
  destacarUltima?: boolean;
  className?: string;
}) {
  if (!serie.length) return null;
  const safe = serie.map((v) => Math.max(0, Number.isFinite(v) ? v : 0));
  const max = Math.max(...safe, 1);
  const falado = `${rotulo}: ${safe.map((v, i) => `${rotulos[i] ?? i + 1}, ${formatar(v)}`).join("; ")}`;
  return (
    <div className={`graf-barras${className ? ` ${className}` : ""}`} role="img" aria-label={falado}>
      {safe.map((v, i) => (
        <div className={`graf-col${destacarUltima && i === safe.length - 1 ? " atual" : ""}`} key={`${i}-${rotulos[i] ?? i}`} style={ordem(i)} aria-hidden="true">
          <span className="graf-valor num">{formatar(v)}</span>
          <span className="graf-trilho"><span className="graf-barra" style={{ height: `${(v / max) * 100}%` }} /></span>
          <span className="graf-eixo">{rotulos[i]}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Entradas e saídas: barras pareadas, entrada na cor da igreja e saída em neutro ── */
export function EntradasSaidas({ meses, formatar = num, className }: {
  meses: { rotulo: string; entrada: number; saida: number }[];
  formatar?: (n: number) => string;
  className?: string;
}) {
  if (!meses.length) return null;
  const safe = meses.map((m) => ({
    rotulo: m.rotulo,
    entrada: Math.max(0, Number.isFinite(m.entrada) ? m.entrada : 0),
    saida: Math.max(0, Number.isFinite(m.saida) ? m.saida : 0),
  }));
  const max = Math.max(...safe.flatMap((m) => [m.entrada, m.saida]), 1);
  const falado = `Entradas e saídas: ${safe.map((m) => `${m.rotulo}, entrou ${formatar(m.entrada)} e saiu ${formatar(m.saida)}`).join("; ")}`;
  return (
    <div className={`graf-pares${className ? ` ${className}` : ""}`} role="img" aria-label={falado}>
      {safe.map((m, i) => (
        <div className="graf-col" key={`${i}-${m.rotulo}`} style={ordem(i)} aria-hidden="true">
          <span className="graf-trilho">
            <span className="graf-barra entrada" style={{ height: `${(m.entrada / max) * 100}%` }} />
            <span className="graf-barra saida" style={{ height: `${(m.saida / max) * 100}%` }} />
          </span>
          <span className="graf-eixo">{m.rotulo}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Distribuição e funil: uma linha por item, barra horizontal e número escrito.
   funil: cada etapa mais clara que a anterior, proporção sobre a primeira ── */
export type ItemDistribuicao = { id: string; rotulo: ReactNode; valor: number; detalhe?: ReactNode };

export function Distribuicao({ itens, funil, max, formatar = num, className }: {
  itens: ItemDistribuicao[];
  funil?: boolean;
  /* base da proporção; padrão é o maior valor (ou o primeiro, no funil) */
  max?: number;
  formatar?: (n: number) => string;
  className?: string;
}) {
  if (!itens.length) return null;
  const safe = itens.map((it) => ({ ...it, valor: Math.max(0, Number.isFinite(it.valor) ? it.valor : 0) }));
  const base = max ?? (funil ? safe[0]?.valor : Math.max(...safe.map((i) => i.valor))) ?? 1;
  return (
    <div className={`graf-dist${funil ? " funil" : ""}${className ? ` ${className}` : ""}`}>
      {safe.map((it, i) => (
        <div className="dist-row" key={`${i}-${it.id}`} style={ordem(i)}>
          <span className="dist-name">{it.rotulo}</span>
          <span className="dist-bar" aria-hidden="true">
            <span className="dist-bar-fill" style={{ width: `${base ? Math.min(100, (it.valor / base) * 100) : 0}%`, ...(funil ? { opacity: Math.max(0.35, 1 - i * 0.22) } : null) }} />
          </span>
          <span className="dist-num num">{it.detalhe ?? formatar(it.valor)}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Progresso: uma barra fina de parte do todo (curso, campanha, importação) ── */
export function Progresso({ pct, rotulo, tom, className, style }: {
  pct: number;
  rotulo: string;
  tom?: "pendente" | "cuidado";
  className?: string;
  style?: CSSProperties;
}) {
  const raw = Number.isFinite(pct) ? pct : 0;
  const p = Math.max(0, Math.min(100, Math.round(raw)));
  const estadoFalado = tom === "pendente" ? ", pendente" : tom === "cuidado" ? ", precisa de atenção" : "";
  return (
    <div className={`bar graf-prog${className ? ` ${className}` : ""}`} style={style} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-label={`${rotulo}: ${p}%${estadoFalado}`}>
      <div className={`bar-fill${tom === "pendente" ? " amber" : tom === "cuidado" ? " danger" : ""}`} style={{ width: `${p}%` }} />
    </div>
  );
}

/* ── Cobertura: quanto de cada escala está preenchido; abaixo do limite fica
   âmbar (pede atenção), completo fica no tom de feito ── */
export function Cobertura({ itens, limite = 80, className }: {
  itens: { id: string; rotulo: ReactNode; pct: number }[];
  limite?: number;
  className?: string;
}) {
  if (!itens.length) return null;
  return (
    <div className={`graf-cob${className ? ` ${className}` : ""}`} role="list" aria-label="Cobertura das escalas">
      {itens.map((it, i) => {
        const raw = Number.isFinite(it.pct) ? it.pct : 0;
        const p = Math.max(0, Math.min(100, Math.round(raw)));
        const estado = p >= 100 ? "ok" : p < limite ? "pendente" : "";
        const estadoFalado = estado === "ok" ? ", completo" : estado === "pendente" ? ", precisa de atenção" : "";
        return (
          <div className={`graf-cob-linha ${estado}`} key={`${i}-${it.id}`} style={ordem(i)} role="listitem" aria-label={`${typeof it.rotulo === "string" ? it.rotulo : "Escala"}: ${p}%${estadoFalado}`}>
            <span className="graf-cob-nome">{it.rotulo}</span>
            <span className="graf-cob-trilho" aria-hidden="true"><span className="graf-cob-barra" style={{ width: `${p}%` }} /></span>
            <span className="graf-cob-pct num"><Contagem valor={`${p}%`} /></span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Meta: anel para um alvo com número fechado (vagas de um evento) ── */
export function Meta({ valor, total, unidade, rotulo, className }: {
  valor: number;
  total: number;
  /* "vagas", "pessoas" */
  unidade: string;
  /* nome da meta ("Retiro de casais") */
  rotulo?: ReactNode;
  className?: string;
}) {
  const safeValor = Number.isFinite(valor) ? Math.max(0, valor) : 0;
  const safeTotal = Number.isFinite(total) ? Math.max(0, total) : 0;
  const frac = safeTotal > 0 ? Math.max(0, Math.min(1, safeValor / safeTotal)) : 0;
  const pct = Math.round(frac * 100);
  return (
    <div className={`graf-meta${className ? ` ${className}` : ""}`} role="img" aria-label={`${rotulo ?? "Meta"}: ${safeValor} de ${safeTotal} ${unidade}, ${pct}%`}>
      <div className="graf-anel">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="graf-anel-fundo" cx="100" cy="100" r="82" />
          {frac > 0 && <circle className="graf-anel-arco" cx="100" cy="100" r="82" pathLength={1} style={{ strokeDashoffset: 1 - frac }} />}
        </svg>
        <div className="graf-anel-centro">
          <Contagem className="graf-anel-n" valor={safeValor} />
          <span className="graf-anel-s">de {num(safeTotal)} {unidade}</span>
        </div>
      </div>
      {rotulo ? <div className="graf-meta-t">{rotulo}</div> : null}
    </div>
  );
}

/* ── Tendência: linha no tempo, área como eco suave e último ponto em destaque ── */
export function Tendencia({ serie, eixo, rotulo, className }: {
  serie: number[];
  /* poucas marcas embaixo ("4 ago", "1 set"), distribuídas */
  eixo?: string[];
  rotulo: string;
  className?: string;
}) {
  if (!serie.length) return null;
  const safe = serie.map((v) => Number.isFinite(v) ? v : 0);
  const mn = Math.min(...safe);
  const mx = Math.max(...safe);
  const folga = (mx - mn) * 0.15 || 1;
  const X = (i: number) => (safe.length > 1 ? (i / (safe.length - 1)) * 100 : 50);
  const Y = (v: number) => 92 - ((v - (mn - folga)) / (mx + folga - (mn - folga))) * 84;
  const linha = safe.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(2)} ${Y(v).toFixed(2)}`).join(" ");
  const area = `${linha} L100 100 L0 100 Z`;
  const ult = safe[safe.length - 1] ?? 0;
  return (
    <div className={`graf-tend${className ? ` ${className}` : ""}`} role="img" aria-label={`${rotulo}: de ${num(safe[0] ?? 0)} a ${num(ult)}`}>
      <div className="graf-tend-area" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="graf-guia" x1="0" y1="33" x2="100" y2="33" />
          <line className="graf-guia" x1="0" y1="66" x2="100" y2="66" />
          <line className="graf-base" x1="0" y1="100" x2="100" y2="100" />
          <path className="graf-eco" d={area} />
          <path className="graf-traco" d={linha} pathLength={1} />
        </svg>
        <span className="graf-ponto" style={{ left: `${X(safe.length - 1)}%`, top: `${Y(ult)}%` }} />
      </div>
      {eixo?.length ? <div className="graf-tend-eixo" aria-hidden="true">{eixo.map((e, i) => <span key={`${i}-${e}`}>{e}</span>)}</div> : null}
    </div>
  );
}

/* ── Mapa de frequência: uma linha por culto, uma célula por semana; quanto mais
   forte, mais gente. Escala de uma só cor; as células chegam em onda ── */
export function Frequencia({ linhas, colunas, rotulo, className }: {
  linhas: { id: string; rotulo: string; valores: number[] }[];
  /* nome de cada coluna (semana), para o leitor de tela */
  colunas?: string[];
  rotulo: string;
  className?: string;
}) {
  if (!linhas.length) return null;
  const safeLinhas = linhas.map((l) => ({
    ...l,
    valores: l.valores.map((v) => Number.isFinite(v) ? Math.max(0, v) : 0),
  }));
  const todosValores = safeLinhas.flatMap((l) => l.valores);
  const max = todosValores.length ? Math.max(...todosValores, 1) : 1;
  const n = Math.max(...safeLinhas.map((l) => l.valores.length), 0);
  if (n === 0) return null;
  const falado = `${rotulo}: ${safeLinhas.map((l) => {
    const vals = l.valores;
    return vals.length ? `${l.rotulo}, de ${num(Math.min(...vals))} a ${num(Math.max(...vals))}` : `${l.rotulo}, sem dados`;
  }).join("; ")}`;
  return (
    <div className={`graf-freq${className ? ` ${className}` : ""}`} role="img" aria-label={falado} style={{ "--colunas": n } as CSSProperties}>
      {safeLinhas.map((l, r) => (
        <div className="graf-freq-linha" key={`${r}-${l.id}`} aria-hidden="true">
          <span className="graf-freq-nome">{l.rotulo}</span>
          <span className="graf-freq-celulas">
            {l.valores.map((v, c) => (
              <span key={`${r}-${c}`} className="graf-freq-cel" title={colunas?.[c] ? `${colunas[c]}: ${num(v)}` : num(v)}
                style={{ "--forca": (0.12 + (v / max) * 0.88).toFixed(2), "--i": c + r * 0.6 } as CSSProperties} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
