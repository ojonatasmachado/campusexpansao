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
  const max = Math.max(...serie, 1);
  const falado = `${rotulo}: ${serie.map((v, i) => `${rotulos[i] ?? i + 1}, ${formatar(v)}`).join("; ")}`;
  return (
    <div className={`graf-barras${className ? ` ${className}` : ""}`} role="img" aria-label={falado}>
      {serie.map((v, i) => (
        <div className={`graf-col${destacarUltima && i === serie.length - 1 ? " atual" : ""}`} key={rotulos[i] ?? i} style={ordem(i)} aria-hidden="true">
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
  const max = Math.max(...meses.flatMap((m) => [m.entrada, m.saida]), 1);
  const falado = `Entradas e saídas: ${meses.map((m) => `${m.rotulo}, entrou ${formatar(m.entrada)} e saiu ${formatar(m.saida)}`).join("; ")}`;
  return (
    <div className={`graf-pares${className ? ` ${className}` : ""}`} role="img" aria-label={falado}>
      {meses.map((m, i) => (
        <div className="graf-col" key={m.rotulo} style={ordem(i)} aria-hidden="true">
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
  const base = max ?? (funil ? itens[0]?.valor : Math.max(...itens.map((i) => i.valor))) ?? 1;
  return (
    <div className={`graf-dist${funil ? " funil" : ""}${className ? ` ${className}` : ""}`}>
      {itens.map((it, i) => (
        <div className="dist-row" key={it.id} style={ordem(i)}>
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
  const p = Math.max(0, Math.min(100, Math.round(pct)));
  return (
    <div className={`bar graf-prog${className ? ` ${className}` : ""}`} style={style} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p} aria-label={rotulo}>
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
  return (
    <div className={`graf-cob${className ? ` ${className}` : ""}`}>
      {itens.map((it, i) => {
        const p = Math.max(0, Math.min(100, Math.round(it.pct)));
        const estado = p >= 100 ? "ok" : p < limite ? "pendente" : "";
        return (
          <div className={`graf-cob-linha ${estado}`} key={it.id} style={ordem(i)}>
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
  const frac = total > 0 ? Math.max(0, Math.min(1, valor / total)) : 0;
  return (
    <div className={`graf-meta${className ? ` ${className}` : ""}`}>
      <div className="graf-anel">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <circle className="graf-anel-fundo" cx="100" cy="100" r="82" />
          <circle className="graf-anel-arco" cx="100" cy="100" r="82" pathLength={1} style={{ strokeDashoffset: 1 - frac }} />
        </svg>
        <div className="graf-anel-centro">
          <Contagem className="graf-anel-n" valor={valor} />
          <span className="graf-anel-s">de {num(total)} {unidade}</span>
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
  const mn = Math.min(...serie);
  const mx = Math.max(...serie);
  const folga = (mx - mn) * 0.15 || 1;
  const X = (i: number) => (serie.length > 1 ? (i / (serie.length - 1)) * 100 : 50);
  const Y = (v: number) => 92 - ((v - (mn - folga)) / (mx + folga - (mn - folga))) * 84;
  const linha = serie.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(2)} ${Y(v).toFixed(2)}`).join(" ");
  const area = `${linha} L100 100 L0 100 Z`;
  const ult = serie[serie.length - 1] ?? 0;
  return (
    <div className={`graf-tend${className ? ` ${className}` : ""}`} role="img" aria-label={`${rotulo}: de ${num(serie[0] ?? 0)} a ${num(ult)}`}>
      <div className="graf-tend-area" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <line className="graf-guia" x1="0" y1="33" x2="100" y2="33" />
          <line className="graf-guia" x1="0" y1="66" x2="100" y2="66" />
          <line className="graf-base" x1="0" y1="100" x2="100" y2="100" />
          <path className="graf-eco" d={area} />
          <path className="graf-traco" d={linha} pathLength={1} />
        </svg>
        <span className="graf-ponto" style={{ left: `${X(serie.length - 1)}%`, top: `${Y(ult)}%` }} />
      </div>
      {eixo?.length ? <div className="graf-tend-eixo" aria-hidden="true">{eixo.map((e) => <span key={e}>{e}</span>)}</div> : null}
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
  const max = Math.max(...linhas.flatMap((l) => l.valores), 1);
  const n = Math.max(...linhas.map((l) => l.valores.length), 1);
  const falado = `${rotulo}: ${linhas.map((l) => `${l.rotulo}, de ${num(Math.min(...l.valores))} a ${num(Math.max(...l.valores))}`).join("; ")}`;
  return (
    <div className={`graf-freq${className ? ` ${className}` : ""}`} role="img" aria-label={falado} style={{ "--colunas": n } as CSSProperties}>
      {linhas.map((l, r) => (
        <div className="graf-freq-linha" key={l.id} aria-hidden="true">
          <span className="graf-freq-nome">{l.rotulo}</span>
          <span className="graf-freq-celulas">
            {l.valores.map((v, c) => (
              <span key={c} className="graf-freq-cel" title={colunas?.[c] ? `${colunas[c]}: ${num(v)}` : num(v)}
                style={{ "--forca": (0.12 + (v / max) * 0.88).toFixed(2), "--i": c + r * 0.6 } as CSSProperties} />
            ))}
          </span>
        </div>
      ))}
    </div>
  );
}
