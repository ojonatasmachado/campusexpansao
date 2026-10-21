"use client";

import { useId } from "react";
import { FUSOS_DISPONIVEIS } from "../../lib/fusos-disponiveis";

const CONHECIDOS: Record<string, string> = {
  "America/Sao_Paulo": "Brasil: Brasília, São Paulo",
  "America/Manaus": "Brasil: Manaus",
  "America/Rio_Branco": "Brasil: Rio Branco",
  "America/Noronha": "Brasil: Fernando de Noronha",
  "Europe/Lisbon": "Portugal: Lisboa, Porto",
  "Atlantic/Azores": "Portugal: Açores",
  "Africa/Luanda": "Angola: Luanda",
  "Africa/Maputo": "Moçambique: Maputo",
  "Atlantic/Cape_Verde": "Cabo Verde",
  "America/New_York": "Estados Unidos: Nova York",
  "Europe/London": "Reino Unido: Londres",
  "Asia/Tokyo": "Japão: Tóquio",
};

export function FusoField({ value, onChange }: { value: string; onChange: (fuso: string) => void }) {
  const id = useId();
  const comuns = Object.keys(CONHECIDOS);
  const outros = [...new Set([...FUSOS_DISPONIVEIS, value])].filter((f) => !comuns.includes(f));
  return <div className="field">
    <label className="field-label" htmlFor={id}>Fuso horário da igreja</label>
    <select id={id} className="select" value={value} onChange={(e) => onChange(e.target.value)} aria-describedby={`${id}-hint`}>
      <optgroup label="Mais usados">{comuns.map((f) => <option key={f} value={f}>{CONHECIDOS[f]}</option>)}</optgroup>
      <optgroup label="Outras regiões">{outros.map((f) => <option key={f} value={f}>{f.replaceAll("_", " ")}</option>)}</optgroup>
    </select>
    <div id={`${id}-hint`} className="field-hint">Define o dia da agenda e os horários dos avisos. Os encontros mantêm as datas e horas cadastradas.</div>
  </div>;
}
