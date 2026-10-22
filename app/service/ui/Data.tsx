"use client";

/* Data e hora do Service (BIBLIOTECA.md, prancha 4), no lugar de
   <input type="date"> e <input type="time"> nativos.
   SeletorData: o valor é o mesmo do campo nativo ("aaaa-mm-dd"), então a troca não
   mexe no dado. Abre um calendário flutuante que cresce a partir do campo: hoje tem
   anel, o dia escolhido a cor da igreja, dias com evento um ponto. Trocar o mês
   desliza para o lado da seta; tocar no mês/ano abre a grade de anos (data de
   nascimento sem 40 toques). Teclado: setas andam pelos dias (cima/baixo = semana),
   PageUp/PageDown trocam o mês, Enter escolhe, Esc fecha.
   SeletorHora: valor "hh:mm", como o nativo. Visual em biblioteca.css (.dp-*, .tp-*). */

import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { Caret } from "../lib/icons";
import { Acao } from "./Acao";
import { BotaoIcone } from "./Botao";
import { Opcao } from "./Opcao";
import { usePopover } from "./popover";

const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const SEMANA = ["D", "S", "T", "Q", "Q", "S", "S"];
const SEMANA_LONGA = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

const dois = (n: number) => String(n).padStart(2, "0");
const iso = (a: number, m: number, d: number) => `${a}-${dois(m + 1)}-${dois(d)}`;
function ler(v: string | undefined | null) {
  const p = (v || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return p ? { a: +p[1], m: +p[2] - 1, d: +p[3] } : null;
}
function hojeIso() { const h = new Date(); return iso(h.getFullYear(), h.getMonth(), h.getDate()); }
const diasNoMes = (a: number, m: number) => new Date(a, m + 1, 0).getDate();

/* "14/03/1990", para mostrar no campo */
export function dataCurta(v: string | undefined | null) {
  const p = ler(v);
  return p ? `${dois(p.d)}/${dois(p.m + 1)}/${p.a}` : "";
}

export type SeletorDataProps = {
  valor: string;
  aoMudar: (v: string) => void;
  /* limites no mesmo formato "aaaa-mm-dd" */
  min?: string;
  max?: string;
  /* dias com evento (ponto embaixo do número) */
  marcados?: string[];
  vazio?: string;
  rotulo?: string;
  id?: string;
  desativado?: boolean;
  /* mostra "Limpar" no calendário */
  limpavel?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

export function SeletorData({ valor, aoMudar, min, max, marcados, vazio = "dd/mm/aaaa", rotulo, id, desativado, limpavel, className, ...aria }: SeletorDataProps) {
  const [open, setOpen] = useState(false);
  const { caixa, gatilho } = usePopover(open, setOpen);
  const popId = useId();
  const atual = ler(valor);
  const hoje = hojeIso();
  const base = atual ?? ler(max && max < hoje ? max : min && min > hoje ? min : hoje)!;
  const [vista, setVista] = useState<{ a: number; m: number }>({ a: base.a, m: base.m });
  const [modo, setModo] = useState<"dias" | "anos">("dias");
  const [lado, setLado] = useState<"" | "esq" | "dir">("");
  const [foco, setFoco] = useState<string>(valor || iso(base.a, base.m, base.d));
  const grade = useRef<HTMLDivElement>(null);

  /* ao abrir, o calendário vai para o mês do valor (ou de hoje) */
  const alternar = () => {
    if (!open) {
      setVista({ a: base.a, m: base.m });
      setModo("dias");
      setLado("");
      setFoco(valor || iso(base.a, base.m, base.d));
    }
    setOpen(!open);
  };

  /* foco acompanha o dia ativo (só quando a pessoa usa o teclado ou acabou de abrir) */
  useEffect(() => {
    if (!open || modo !== "dias") return;
    grade.current?.querySelector<HTMLButtonElement>(`[data-dia="${foco}"]`)?.focus();
  }, [open, modo, foco, vista]);

  const fora = (d: string) => Boolean((min && d < min) || (max && d > max));
  /* trocar o mês (ou o ano) leva o dia ativo junto, para o teclado entrar na grade nova */
  const irPara = (a: number, m: number) => {
    setVista({ a, m });
    const d = ler(foco)?.d ?? 1;
    setFoco(iso(a, m, Math.min(d, diasNoMes(a, m))));
  };
  const mudarMes = (delta: number) => {
    setLado(delta < 0 ? "esq" : "dir");
    const t = vista.m + delta;
    irPara(vista.a + Math.floor(t / 12), ((t % 12) + 12) % 12);
  };
  const escolher = (d: string) => { if (fora(d)) return; aoMudar(d); setOpen(false); gatilho.current?.focus(); };

  const andar = (e: KeyboardEvent) => {
    const p = ler(foco);
    if (!p) return;
    const pulos: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    let novo: Date | null = null;
    if (e.key in pulos) novo = new Date(p.a, p.m, p.d + pulos[e.key]);
    else if (e.key === "PageUp") novo = new Date(p.a, p.m - 1, Math.min(p.d, diasNoMes(p.a, p.m - 1)));
    else if (e.key === "PageDown") novo = new Date(p.a, p.m + 1, Math.min(p.d, diasNoMes(p.a, p.m + 1)));
    else if (e.key === "Home") novo = new Date(p.a, p.m, 1);
    else if (e.key === "End") novo = new Date(p.a, p.m, diasNoMes(p.a, p.m));
    if (!novo) return;
    e.preventDefault();
    const n = iso(novo.getFullYear(), novo.getMonth(), novo.getDate());
    if (fora(n)) return;
    if (novo.getMonth() !== vista.m || novo.getFullYear() !== vista.a) {
      setLado(n < foco ? "esq" : "dir");
      setVista({ a: novo.getFullYear(), m: novo.getMonth() });
    }
    setFoco(n);
  };

  const primeiro = new Date(vista.a, vista.m, 1).getDay();
  const total = diasNoMes(vista.a, vista.m);
  const marc = new Set(marcados ?? []);
  const anoIni = vista.a - (vista.a % 12);

  return (
    <div className={`dp${open ? " aberta" : ""}${className ? ` ${className}` : ""}`} ref={caixa}>
      <Acao ref={gatilho} id={id} className="dp-trigger" desativado={desativado}
        aria-label={rotulo ? `${rotulo}: ${dataCurta(valor) || "sem data"}` : undefined}
        aria-expanded={open} aria-controls={open ? popId : undefined} aria-haspopup="dialog"
        aria-describedby={aria["aria-describedby"]} aria-invalid={aria["aria-invalid"]} aria-required={aria["aria-required"]}
        onClick={alternar}>
        <span className={valor ? "dp-val" : "dp-ph"}>{dataCurta(valor) || vazio}</span>
        <span className="dp-ic" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
        </span>
      </Acao>
      {open && (
        <div className="dp-pop dp-cal" id={popId} role="dialog" aria-label={rotulo ? `Escolher ${rotulo.toLowerCase()}` : "Escolher data"}>
          <div className="dp-head">
            <BotaoIcone rotulo={modo === "anos" ? "Anos anteriores" : "Mês anterior"}
              onClick={() => modo === "anos" ? setVista((v) => ({ ...v, a: v.a - 12 })) : mudarMes(-1)}>‹</BotaoIcone>
            <Acao className="dp-titulo" aria-label={modo === "anos" ? "Voltar aos dias" : `${MESES[vista.m]} de ${vista.a}, escolher ano`}
              onClick={() => setModo((m) => (m === "anos" ? "dias" : "anos"))}>
              <span aria-live="polite">{modo === "anos" ? `${anoIni} a ${anoIni + 11}` : `${MESES[vista.m]} ${vista.a}`}</span>
              <Caret open={modo === "anos"} size={12} />
            </Acao>
            <BotaoIcone rotulo={modo === "anos" ? "Próximos anos" : "Próximo mês"}
              onClick={() => modo === "anos" ? setVista((v) => ({ ...v, a: v.a + 12 })) : mudarMes(1)}>›</BotaoIcone>
          </div>
          {modo === "anos" ? (
            <div className="dp-anos">
              {Array.from({ length: 12 }, (_, i) => anoIni + i).map((a) => (
                <Opcao key={a} estilo="dp-day" marcada={a === vista.a} className={a === +hoje.slice(0, 4) ? "hoje" : undefined}
                  onClick={() => { irPara(a, vista.m); setModo("dias"); }}>{a}</Opcao>
              ))}
            </div>
          ) : (
            <>
              <div className="dp-semana" aria-hidden="true">{SEMANA.map((s, i) => <span key={i}>{s}</span>)}</div>
              <div key={`${vista.a}-${vista.m}`} className={`dp-grid${lado ? ` dp-vem-${lado}` : ""}`} ref={grade} role="grid" onKeyDown={andar}>
                {Array.from({ length: primeiro }, (_, i) => <span key={`v${i}`} aria-hidden="true" />)}
                {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
                  const dia = iso(vista.a, vista.m, d);
                  const sel = dia === valor;
                  const cls = [dia === hoje && "hoje", marc.has(dia) && "tem-evento"].filter(Boolean).join(" ") || undefined;
                  const sem = SEMANA_LONGA[new Date(vista.a, vista.m, d).getDay()];
                  return (
                    <Opcao key={d} estilo="dp-day" marcada={sel} className={cls} data-dia={dia} desativado={fora(dia)}
                      tabIndex={dia === foco ? 0 : -1} aria-pressed={sel}
                      aria-label={`${sem}, ${d} de ${MESES[vista.m]} de ${vista.a}${dia === hoje ? ", hoje" : ""}${marc.has(dia) ? ", com evento" : ""}`}
                      aria-current={dia === hoje ? "date" : undefined}
                      onClick={() => escolher(dia)} onFocus={() => setFoco(dia)}>{d}</Opcao>
                  );
                })}
              </div>
              <div className="dp-pe">
                <Acao className="dp-link" desativado={fora(hoje)} onClick={() => escolher(hoje)}>Hoje</Acao>
                {limpavel && valor ? <Acao className="dp-link" onClick={() => { aoMudar(""); setOpen(false); gatilho.current?.focus(); }}>Limpar</Acao> : null}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export type SeletorHoraProps = {
  valor: string;
  aoMudar: (v: string) => void;
  /* de quantos em quantos minutos (padrão 5) */
  passo?: number;
  vazio?: string;
  rotulo?: string;
  id?: string;
  desativado?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  "aria-required"?: boolean;
};

export function SeletorHora({ valor, aoMudar, passo = 5, vazio = "hh:mm", rotulo, id, desativado, className, ...aria }: SeletorHoraProps) {
  const [open, setOpen] = useState(false);
  const { caixa, gatilho } = usePopover(open, setOpen);
  const popId = useId();
  const p = (valor || "").match(/^(\d{1,2}):(\d{2})/);
  const hh = p ? +p[1] : null;
  const mm = p ? +p[2] : null;
  const set = (h: number, m: number) => aoMudar(`${dois(h)}:${dois(m)}`);
  const minutos = Array.from({ length: Math.ceil(60 / passo) }, (_, i) => i * passo);
  /* minuto fora do passo (dado antigo) continua aparecendo */
  if (mm != null && !minutos.includes(mm)) { minutos.push(mm); minutos.sort((a, b) => a - b); }

  useEffect(() => {
    if (!open) return;
    caixa.current?.querySelectorAll<HTMLElement>(".tp-opt.on").forEach((el) => el.scrollIntoView({ block: "center" }));
  }, [open, caixa]);

  return (
    <div className={`dp${open ? " aberta" : ""}${className ? ` ${className}` : ""}`} ref={caixa}>
      <Acao ref={gatilho} id={id} className="dp-trigger" desativado={desativado}
        aria-label={rotulo ? `${rotulo}: ${valor || "sem horário"}` : undefined}
        aria-expanded={open} aria-controls={open ? popId : undefined} aria-haspopup="dialog"
        aria-describedby={aria["aria-describedby"]} aria-invalid={aria["aria-invalid"]} aria-required={aria["aria-required"]}
        onClick={() => setOpen((o) => !o)}>
        <span className={valor ? "dp-val" : "dp-ph"}>{valor ? `${dois(hh!)}:${dois(mm!)}` : vazio}</span>
        <span className="dp-ic" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </span>
      </Acao>
      {open && (
        <div className="dp-pop tp-pop" id={popId} role="dialog" aria-label={rotulo ? `Escolher ${rotulo.toLowerCase()}` : "Escolher horário"}>
          <div className="tp-col">
            <div className="tp-col-h">Hora</div>
            <div className="tp-scroll">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <Opcao key={h} marcada={hh === h} estilo="tp-opt" aria-label={`${h} horas`} onClick={() => set(h, mm ?? 0)}>{dois(h)}</Opcao>
              ))}
            </div>
          </div>
          <div className="tp-col">
            <div className="tp-col-h">Min</div>
            <div className="tp-scroll">
              {minutos.map((m) => (
                <Opcao key={m} marcada={mm === m} estilo="tp-opt" aria-label={`${m} minutos`}
                  onClick={() => { set(hh ?? 19, m); setOpen(false); gatilho.current?.focus(); }}>{dois(m)}</Opcao>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
