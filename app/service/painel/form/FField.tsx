"use client";

import { useId, useState } from "react";
import { IconPicker, Caret } from "../../lib/icons";
import CepInput from "../../CepInput";
import { DP_MESES } from "../comum";
import type { FieldDef } from "./tipos";
import { BotaoIcone } from "../../ui/Botao";
import { Interruptor } from "../../ui/Interruptor";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { usePopover } from "../../ui/popover";
import { Selecao } from "../../ui/Selecao";
import { SeletorData } from "../../ui/Data";

export const DP_MESES_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
export const DP_DIAS_MES = [31,29,31,30,31,30,31,31,30,31,30,31];

export function DatePicker({ value, onChange, id, fullDate = false, label }: { value: string; onChange: (v: string) => void; id?: string; fullDate?: boolean; label?: string }) {
  return fullDate
    ? <SeletorData id={id} rotulo={label ?? "Data completa"} valor={value} aoMudar={onChange} limpavel />
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
      <Acao ref={gatilho} id={id} className="dp-trigger" aria-expanded={open} aria-controls={open ? popId : undefined} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value ? `${dia} de ${DP_MESES_FULL[mes]}` : "Escolher dia e mês"}</span>
        <span className="dp-ic"><Caret /></span>
      </Acao>
      {open && (
        <div className="dp-pop" id={popId} role="dialog" aria-label="Escolher dia e mês">
          <div className="dp-head">
            <BotaoIcone rotulo="Mês anterior" onClick={() => setMes((m) => (m + 11) % 12)}>‹</BotaoIcone>
            <span aria-live="polite">{DP_MESES_FULL[mes]}</span>
            <BotaoIcone rotulo="Próximo mês" onClick={() => setMes((m) => (m + 1) % 12)}>›</BotaoIcone>
          </div>
          <div className="dp-grid">
            {Array.from({ length: DP_DIAS_MES[mes] }, (_, i) => i + 1).map((d) => (
              <Opcao key={d} marcada={dia === d && init.m === mes} estilo="dp-day" aria-pressed={dia === d && init.m === mes} aria-label={`${d} de ${DP_MESES_FULL[mes]}`} onClick={() => pick(d)}>{d}</Opcao>
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
      <Acao ref={gatilho} id={id} className="dp-trigger" aria-expanded={open} aria-controls={open ? popId : undefined} aria-haspopup="dialog" onClick={() => setOpen((o) => !o)}>
        <span className={value ? "" : "dp-ph"}>{value || "Escolher horário"}</span>
        <span className="dp-ic"><Caret /></span>
      </Acao>
      {open && (
        <div className="dp-pop tp-pop" id={popId} role="dialog" aria-label="Escolher horário">
          <div className="tp-col">
            <div className="tp-col-h">Hora</div>
            <div className="tp-scroll">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <Opcao key={h} marcada={hh === h} estilo="tp-opt" aria-pressed={hh === h} aria-label={`${h} horas`} onClick={() => set(h, mm)}>{String(h).padStart(2, "0")}</Opcao>
              ))}
            </div>
          </div>
          <div className="tp-col">
            <div className="tp-col-h">Min</div>
            <div className="tp-scroll">
              {[0, 15, 30, 45].map((m) => (
                <Opcao key={m} marcada={mm === m} estilo="tp-opt" aria-pressed={mm === m} aria-label={`${m} minutos`} onClick={() => { set(hh, m); setOpen(false); gatilho.current?.focus(); }}>{String(m).padStart(2, "0")}</Opcao>
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

/* Seleção do formulário genérico: a peça é Selecao (app/service/ui/Selecao.tsx). */
export function SelectField({ value, onChange, options, placeholder, label, id }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[]; placeholder?: string; label?: string; id?: string }) {
  return <Selecao id={id} rotulo={label} valor={value} aoMudar={onChange} opcoes={options} vazio={placeholder} />;
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
        <Interruptor ligado={value === "true"} id={id} rotulo={field.label} onClick={() => onChange(value === "true" ? "false" : "true")} />
        <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{value === "true" ? (field.onLabel || "Sim") : (field.offLabel || "Não")}</span>
      </div>
    );
  if (field.type === "checks") {
    const arr = value ? value.split(",") : [];
    const tog = (v: string) => onChange(arr.includes(v) ? arr.filter((x) => x !== v).join(",") : [...arr, v].join(","));
    return (
      <div className="seg-check" role="group" aria-label={field.label}>
        {field.options.map((o) => <Opcao key={o.v} marcada={arr.includes(o.v)} estilo="seg-chip" aria-pressed={arr.includes(o.v)} onClick={() => tog(o.v)}>{o.l}</Opcao>)}
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
