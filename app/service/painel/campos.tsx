"use client";

import { useEffect, useRef, useState } from "react";
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
export const DP_MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const DP_DIAS_MES = [31,29,31,30,31,30,31,31,30,31,30,31];

export function DatePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
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
  const pick = (d: number) => { onChange(d + " " + DP_MESES[mes].toLowerCase()); setOpen(false); };
  return (
    <div className="dp">
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value ? `${dia} de ${DP_MESES_FULL[mes]}` : "Escolher dia e mês"}</span>
        <span className="dp-ic"><Caret /></span>
      </button>
      {open && (
        <div className="dp-pop">
          <div className="dp-head">
            <button type="button" onClick={() => setMes((m) => (m + 11) % 12)}>‹</button>
            <span>{DP_MESES_FULL[mes]}</span>
            <button type="button" onClick={() => setMes((m) => (m + 1) % 12)}>›</button>
          </div>
          <div className="dp-grid">
            {Array.from({ length: DP_DIAS_MES[mes] }, (_, i) => i + 1).map((d) => (
              <button type="button" key={d} className={`dp-day${dia === d && init.m === mes ? " on" : ""}`} onClick={() => pick(d)}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TimePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const p = (value || "").match(/(\d{1,2})[h:](\d{2})/);
  const hh = p ? +p[1] : 19;
  const mm = p ? +p[2] : 0;
  const set = (h: number, m: number) => onChange(String(h).padStart(2, "0") + "h" + String(m).padStart(2, "0"));
  return (
    <div className="dp">
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value || "Escolher horário"}</span>
        <span className="dp-ic"><Caret /></span>
      </button>
      {open && (
        <div className="dp-pop tp-pop">
          <div className="tp-col">
            <div className="tp-col-h">Hora</div>
            <div className="tp-scroll">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <button type="button" key={h} className={`tp-opt${hh === h ? " on" : ""}`} onClick={() => set(h, mm)}>{String(h).padStart(2, "0")}</button>
              ))}
            </div>
          </div>
          <div className="tp-col">
            <div className="tp-col-h">Min</div>
            <div className="tp-scroll">
              {[0, 15, 30, 45].map((m) => (
                <button type="button" key={m} className={`tp-opt${mm === m ? " on" : ""}`} onClick={() => { set(hh, m); setOpen(false); }}>{String(m).padStart(2, "0")}</button>
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
export function SelectField({ value, onChange, options, placeholder, label }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; placeholder?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickAway = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, [open]);

  const current = options.find((o) => o.v === value);

  return (
    <div className="sel-wrap" ref={ref}>
      <button type="button" className="sel-trigger" aria-label={label ? `${label}: ${current?.l || placeholder || "Selecione"}` : undefined} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className={current ? "" : "sel-ph"}>{current ? current.l : (placeholder || "Selecione")}</span>
        <span className="sel-arrow"><Caret open={open} /></span>
      </button>
      {open && (
        <div className="sel-pop">
          {placeholder && (
            <button type="button" className={`sel-opt${!value ? " on" : ""}`} onClick={() => { onChange(""); setOpen(false); }}>{placeholder}</button>
          )}
          {options.map((o) => (
            <button key={o.v} type="button" className={`sel-opt${value === o.v ? " on" : ""}`} onClick={() => { onChange(o.v); setOpen(false); }}>{o.l}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function FField({ field, value, onChange, onPatch }: { field: FieldDef; value: string; onChange: (v: string) => void; onPatch?: (patch: Record<string, string>) => void }) {
  if (field.type === "cep") return <CepField field={field} value={value} onChange={onChange} onPatch={onPatch} />;
  if (field.type === "area")
    return <textarea className="textarea" aria-label={field.label} value={value} placeholder={field.ph} style={field.big ? { minHeight: 110 } : undefined} onChange={(e) => onChange(e.target.value)} />;
  if (field.type === "select")
    return <SelectField label={field.label} value={value} onChange={onChange} options={field.options} placeholder={field.ph} />;
  if (field.type === "toggle")
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button type="button" role="switch" aria-label={field.label} aria-checked={value === "true"} className={`sw${value === "true" ? " on" : ""}`} onClick={() => onChange(value === "true" ? "false" : "true")} />
        <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{value === "true" ? (field.onLabel || "Sim") : (field.offLabel || "Não")}</span>
      </div>
    );
  if (field.type === "checks") {
    const arr = value ? value.split(",") : [];
    const tog = (v: string) => onChange(arr.includes(v) ? arr.filter((x) => x !== v).join(",") : [...arr, v].join(","));
    return (
      <div className="seg-check">
        {field.options.map((o) => <button type="button" key={o.v} className={`seg-chip${arr.includes(o.v) ? " on" : ""}`} onClick={() => tog(o.v)}>{o.l}</button>)}
      </div>
    );
  }
  if (field.type === "icon") {
    return <IconPicker value={value} onChange={onChange} />;
  }
  if (field.type === "date") return <DatePicker value={value} onChange={onChange} />;
  if (field.type === "time") return <TimePicker value={value} onChange={onChange} />;
  return <input className="input" aria-label={field.label} value={value} placeholder={field.ph} onChange={(e) => onChange(e.target.value)} />;
}
