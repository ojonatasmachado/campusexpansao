"use client";

import { useId } from "react";
import { FUSOS_DISPONIVEIS } from "../../lib/fusos-disponiveis";
import { Campo } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";

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
  return <Campo rotulo="Fuso horário da igreja" id={id} ajuda="Define o dia da agenda e os horários dos avisos. Os encontros mantêm as datas e horas cadastradas.">
    <Selecao valor={value} aoMudar={onChange} opcoes={[
      ...comuns.map((f) => ({ v: f, l: CONHECIDOS[f], grupo: "Mais usados" })),
      ...outros.map((f) => ({ v: f, l: f.replaceAll("_", " "), grupo: "Outras regiões" })),
    ]} />
  </Campo>;
}
