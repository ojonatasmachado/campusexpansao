"use client";

/* Linha-resumo de vagas abertas com link para o Panorama do culto.
   Usado em Escalas.tsx e Inicio.tsx; uma informação, um lugar (lei 13 §14).
   Cor só por variável CSS (--amber), sem style inline. */

import type { CoberturaTime } from "./cobertura";
import { Botao } from "../../ui/Botao";

export function CoberturaResumo({
  cobertura,
  onVerPanorama,
}: {
  cobertura: CoberturaTime[];
  onVerPanorama: () => void;
}) {
  const incompletos = cobertura.filter((t) => t.preenchidas < t.total);
  if (incompletos.length === 0) return null;
  const vagasAbertas = incompletos.reduce((s, t) => s + (t.total - t.preenchidas), 0);
  return (
    <div className="esc-cob-resumo">
      <span className="panel-meta">
        <span className="esc-cob-num">{vagasAbertas}</span>{" "}
        {vagasAbertas === 1 ? "vaga aberta" : "vagas abertas"} em{" "}
        {incompletos.length} {incompletos.length === 1 ? "time" : "times"}
      </span>
      <Botao variante="texto" compacto onClick={onVerPanorama}>
        Ver panorama →
      </Botao>
    </div>
  );
}