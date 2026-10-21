"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IconPicker, Caret } from "../lib/icons";
import CepInput from "../CepInput";
import { DP_MESES } from "./comum";
import type { FieldDef } from "./tipos";

export function DrawerShell({ children, onClose, wide }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <>
      <div className="drawer-bg" onClick={onClose} />
      <div className={`drawer ${wide ? "drawer-wide" : ""}`}>{children}</div>
    </>
  );
}

export function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="dsec">
      <div className="dsec-title">{title}</div>
      {children}
    </div>
  );
}

/* Contrato dos popovers de campo (data, hora, lista): fecha no clique fora e no Esc,
   e o Esc devolve o foco ao gatilho. O Esc é tratado na captura e marcado como
   tratado, para não fechar junto a janela ou a tela de formulário onde o campo está. */
function usePopover(open: boolean, setOpen: (v: boolean) => void) {
  const caixa = useRef<HTMLDivElement>(null);
  const gatilho = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      gatilho.current?.focus();
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", esc, true);
    return () => { document.removeEventListener("mousedown", fora); document.removeEventListener("keydown", esc, true); };
  }, [open, setOpen]);
  return { caixa, gatilho };
}

export const DP_MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const DP_DIAS_MES = [31,29,31,30,31,30,31,31,30,31,30,31];

export function DatePicker({ value, onChange, id, fullDate = false, label }: { value: string; onChange: (v: string) => void; id?: string; fullDate?: boolean; label?: string }) {
  return fullDate
    ? <input id={id} className="input service-civil-date" type="date" aria-label={label ?? "Data completa"} value={value} onChange={(e) => onChange(e.target.value)} />
    : <BirthdayPicker id={id} value={value} onChange={onChange} />;
}

function BirthdayPicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const parse = () => {
    if (!value) return { d: null as number | null, m: 0 };
    const p = value.split(" ");
    const mi = DP_MESES.findIndex((x) => x.toLowerCase() === (p[1] || "").toLowerCase());
    return { d: parseInt(p[0], 10) || null, m: mi < 0 ? 0 : mi };
  };
  const init = parse();
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(init.m);
  const dia = init.d;
  const { caixa, gatilho } = usePopover(open, setOpen);
  const popId = useId();
  const pick = (d: number) => { onChange(d + " " + DP_MESES[mes].toLowerCase()); setOpen(false); gatilho.current?.focus(); };
  return (
    <div className="dp" ref={caixa}>
      <button ref={gatilho} id={id} type="button" className="dp-trigger" aria-expanded={open} aria-controls={open ? popId : undefined} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value ? `${dia} de ${DP_MESES_FULL[mes]}` : "Escolher dia e mês"}</span>
        <span className="dp-ic"><Caret /></span>
      </button>
      {open && (
        <div className="dp-pop" id={popId} role="dialog" aria-label="Escolher dia e mês">
          <div className="dp-head">
            <button type="button" aria-label="Mês anterior" onClick={() => setMes((m) => (m + 11) % 12)}>‹</button>
            <span aria-live="polite">{DP_MESES_FULL[mes]}</span>
            <button type="button" aria-label="Próximo mês" onClick={() => setMes((m) => (m + 1) % 12)}>›</button>
          </div>
          <div className="dp-grid">
            {Array.from({ length: DP_DIAS_MES[mes] }, (_, i) => i + 1).map((d) => (
              <button type="button" key={d} className={`dp-day${dia === d && init.m === mes ? " on" : ""}`} aria-pressed={dia === d && init.m === mes} aria-label={`${d} de ${DP_MESES_FULL[mes]}`} onClick={() => pick(d)}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimePicker({ value, onChange, id }: { value: string; onChange: (v: string) => void; id?: string }) {
  const [open, setOpen] = useState(false);
  const { caixa, gatilho } = usePopover(open, setOpen);
  const popId = useId();
  const p = (value || "").match(/(\d{1,2})[h:](\d{2})/);
  const hh = p ? +p[1] : 19;
  const mm = p ? +p[2] : 0;
  const set = (h: number, m: number) => onChange(String(h).padStart(2, "0") + "h" + String(m).padStart(2, "0"));
  return (
    <div className="dp" ref={caixa}>
      <button ref={gatilho} id={id} type="button" className="dp-trigger" aria-expanded={open} aria-controls={open ? popId : undefined} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value || "Escolher horário"}</span>
        <span className="dp-ic"><Caret /></span>
      </button>
      {open && (
        <div className="dp-pop tp-pop" id={popId} role="dialog" aria-label="Escolher horário">
          <div className="tp-col">
            <div className="tp-col-h">Hora</div>
            <div className="tp-scroll">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <button type="button" key={h} className={`tp-opt${hh === h ? " on" : ""}`} aria-pressed={hh === h} aria-label={`${h} horas`} onClick={() => set(h, mm)}>{String(h).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
          <div className="tp-col">
            <div className="tp-col-h">Min</div>
            <div className="tp-scroll">
              {[0, 15, 30, 45].map((m) => (
                <button type="button" key={m} className={`tp-opt${mm === m ? " on" : ""}`} aria-pressed={mm === m} aria-label={`${m} minutos`} onClick={() => { set(hh, m); setOpen(false); gatilho.current?.focus(); }}>{String(m).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function CepField({ field, value, onChange, onPatch }: { field: Extract<FieldDef, { type: "cep" }>; value: string; onChange: (v: string) => void; onPatch?: (patch: Record<string, string>) => void }) {
  return (
    <CepInput
      value={value}
      onChange={onChange}
      placeholder={field.ph}
      onResult={(data) => {
        if (!data || !field.autofill) return;
        const patch: Record<string, string> = {};
        if (field.autofill.street && data.street) patch[field.autofill.street] = data.street;
        if (field.autofill.neighborhood && data.neighborhood) patch[field.autofill.neighborhood] = data.neighborhood;
        if (field.autofill.city && data.city) patch[field.autofill.city] = data.city;
        if (field.autofill.state && data.state) patch[field.autofill.state] = data.state;
        onPatch?.(patch);
      }}
    />
  );
}

/* Select customizado, escuro : troca o <select> nativo (que abre o
   dropdown do sistema operacional, claro e fora do visual do app) por um
   popover no mesmo padrão do IconPicker/DatePicker. Único ponto de render
   de "type: select" no form genérico, então conserta todo campo desse tipo
   no app inteiro de uma vez, não só um formulário específico. */
export function SelectField({ value, onChange, options, placeholder, label, id }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; placeholder?: string; label?: string; id?: string }) {
  const [open, setOpen] = useState(false);
  const { caixa, gatilho } = usePopover(open, setOpen);
  const listaId = useId();
  const itens = [...(placeholder ? [{ v: "", l: placeholder }] : []), ...options];
  const current = options.find((o) => o.v === value);

  /* abre com o escolhido em foco; setas, Home e End andam; Enter ou espaço escolhem (botão); Tab fecha */
  useEffect(() => {
    if (!open) return;
    const lista = caixa.current?.querySelectorAll<HTMLButtonElement>("[role=option]");
    const atual = [...(lista ?? [])].find((b) => b.getAttribute("aria-selected") === "true") ?? lista?.[0];
    atual?.focus();
  }, [open, caixa]);
  const navegar = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") { setOpen(false); return; }
    const lista = [...(caixa.current?.querySelectorAll<HTMLButtonElement>("[role=option]") ?? [])];
    const i = lista.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (j: number) => { e.preventDefault(); lista[Math.max(0, Math.min(lista.length - 1, j))]?.focus(); };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(lista.length - 1);
  };
  const escolher = (v: string) => { onChange(v); setOpen(false); gatilho.current?.focus(); };

  return (
    <div className="sel-wrap" ref={caixa}>
      <button ref={gatilho} id={id} type="button" className="sel-trigger" aria-label={label ? `${label}: ${current?.l || placeholder || "Selecione"}` : undefined}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listaId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) { e.preventDefault(); setOpen(true); } }}>
        <span className={current ? "" : "sel-ph"}>{current ? current.l : (placeholder || "Selecione")}</span>
        <span className="sel-arrow"><Caret open={open} /></span>
      </button>
      {open && (
        <div className="sel-pop" id={listaId} role="listbox" aria-label={label} onKeyDown={navegar}>
          {itens.map((o) => (
            <button key={o.v || "_vazio"} type="button" role="option" aria-selected={value === o.v} className={`sel-opt${value === o.v ? " on" : ""}`} onClick={() => escolher(o.v)}>{o.l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* tipo, teclado e preenchimento automático pelo nome do campo (k) */
function semanticaDoCampo(k: string): { type: string; inputMode?: "tel" | "email" | "numeric"; autoComplete?: string } {
  const c = k.toLowerCase();
  if (/(^|_)(tel|fone|telefone|phone|whats|celular)/.test(c)) return { type: "tel", inputMode: "tel", autoComplete: "tel" };
  if (/mail/.test(c)) return { type: "email", inputMode: "email", autoComplete: "email" };
  if (/^(nome|name)$|^nome_?completo$/.test(c)) return { type: "text", autoComplete: "name" };
  if (/(^|_)(cpf|ano|numero)$/.test(c)) return { type: "text", inputMode: "numeric" };
  return { type: "text" };
}

export function FField({ field, value, onChange, onPatch, id }: { field: FieldDef; value: string; onChange: (v: string) => void; onPatch?: (patch: Record<string, string>) => void; id?: string }) {
  if (field.type === "cep") return <CepField field={field} value={value} onChange={onChange} onPatch={onPatch} />;
  if (field.type === "area")
    return <textarea id={id} name={field.k} className="textarea" aria-label={id ? undefined : field.label} value={value} placeholder={field.ph} style={field.big ? { minHeight: 110 } : undefined} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "select")
    return <SelectField id={id} label={field.label} value={value} onChange={onChange} options={field.options} placeholder={field.ph} />;
  if (field.type === "toggle")
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button id={id} type="button" role="switch" aria-label={field.label} aria-checked={value === "true"} className={`sw${value === "true" ? " on" : ""}`} onClick={() => onChange(value === "true" ? "false" : "true")} />
        <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{value === "true" ? (field.onLabel || "Sim") : (field.offLabel || "Não")}</span>
      </div>
    );
  if (field.type === "checks") {
    const arr = value ? value.split(",") : [];
    const tog = (v: string) => onChange(arr.includes(v) ? arr.filter((x) => x !== v).join(",") : [...arr, v].join(","));
    return (
      <div className="seg-check" role="group" aria-label={field.label}>
        {field.options.map((o) => <button type="button" key={o.v} className={`seg-chip${arr.includes(o.v) ? " on" : ""}`} aria-pressed={arr.includes(o.v)} onClick={() => tog(o.v)}>{o.l}</button>)}
      </div>
    );
  }
  if (field.type === "icon") {
    return <IconPicker value={value} onChange={onChange} />;
  }
  if (field.type === "date") return <DatePicker id={id} label={field.label} fullDate={field.fullDate} value={value} onChange={onChange} />;
  if (field.type === "time") return <TimePicker id={id} value={value} onChange={onChange} />;
  const sem = semanticaDoCampo(field.k);
  return <input id={id} name={field.k} className="input" aria-label={id ? undefined : field.label} type={sem.type} inputMode={sem.inputMode} autoComplete={sem.autoComplete} value={value} placeholder={field.ph} onChange={(e) => onChange(e.target.value)} />;
}
