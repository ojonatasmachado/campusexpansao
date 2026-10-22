"use client";

/* Seleção do Service (BIBLIOTECA.md, pranchas 3 e 4): caixa suspensa no lugar do
   <select> nativo (que abre a lista do sistema, fora do tema da igreja).
   Gatilho com a altura do campo; a lista flutua, o item escolhido ganha a cor
   da igreja e o check, e a seta gira junto. Teclado: setas abrem e andam,
   Home/End, Enter ou espaço escolhem, Esc e Tab fecham.

     <Campo rotulo="Grupo"><Selecao valor={g} aoMudar={setG} opcoes={[{ v: "n", l: "Célula Norte" }]} /></Campo>

   Visual em biblioteca.css (.sel-*). */

import { Fragment, useEffect, useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { Caret } from "../lib/icons";
import { Acao } from "./Acao";
import { Opcao } from "./Opcao";
import { usePopover } from "./popover";

/* grupo: título que aparece antes da primeira opção de cada grupo (como o <optgroup>) */
export type SelecaoOpcao = { v: string; l: string; desativada?: boolean; grupo?: string };

export type SelecaoProps = {
  valor: string;
  aoMudar: (v: string) => void;
  opcoes: readonly SelecaoOpcao[];
  /* texto quando nada foi escolhido; vira também a primeira opção (valor "") */
  vazio?: string;
  /* nome falado quando não há Campo com rótulo em volta */
  rotulo?: string;
  id?: string;
  desativado?: boolean;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
};

export function Selecao({ valor, aoMudar, opcoes, vazio, rotulo, id, desativado, className, ...aria }: SelecaoProps) {
  const [open, setOpen] = useState(false);
  const { caixa, gatilho } = usePopover(open, setOpen);
  const listaId = useId();
  const itens: SelecaoOpcao[] = [...(vazio ? [{ v: "", l: vazio }] : []), ...opcoes];
  const atual = opcoes.find((o) => o.v === valor);

  /* abre com o escolhido em foco */
  useEffect(() => {
    if (!open) return;
    const lista = caixa.current?.querySelectorAll<HTMLButtonElement>("[role=option]:not(:disabled)");
    const sel = [...(lista ?? [])].find((b) => b.getAttribute("aria-selected") === "true") ?? lista?.[0];
    sel?.focus();
  }, [open, caixa]);

  const navegar = (e: KeyboardEvent) => {
    if (e.key === "Tab") { setOpen(false); return; }
    const lista = [...(caixa.current?.querySelectorAll<HTMLButtonElement>("[role=option]:not(:disabled)") ?? [])];
    const i = lista.indexOf(document.activeElement as HTMLButtonElement);
    const ir = (j: number) => { e.preventDefault(); lista[Math.max(0, Math.min(lista.length - 1, j))]?.focus(); };
    if (e.key === "ArrowDown") ir(i + 1);
    else if (e.key === "ArrowUp") ir(i - 1);
    else if (e.key === "Home") ir(0);
    else if (e.key === "End") ir(lista.length - 1);
  };
  const escolher = (v: string) => { aoMudar(v); setOpen(false); gatilho.current?.focus(); };

  return (
    <div className={`sel-wrap${open ? " aberta" : ""}${className ? ` ${className}` : ""}`} ref={caixa}>
      <Acao ref={gatilho} id={id} className="sel-trigger" desativado={desativado}
        aria-label={rotulo ? `${rotulo}: ${atual?.l || vazio || "Selecione"}` : undefined}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listaId : undefined}
        aria-describedby={aria["aria-describedby"]} aria-invalid={aria["aria-invalid"]}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => { if ((e.key === "ArrowDown" || e.key === "ArrowUp") && !open) { e.preventDefault(); setOpen(true); } }}>
        <span className={atual ? "sel-val" : "sel-ph"}>{atual ? atual.l : (vazio || "Selecione")}</span>
        <span className="sel-arrow" aria-hidden="true"><Caret open={open} /></span>
      </Acao>
      {open && (
        <div className="sel-pop" id={listaId} role="listbox" aria-label={rotulo} onKeyDown={navegar}>
          {itens.map((o, i) => (
            <Fragment key={o.v || "_vazio"}>
              {o.grupo && o.grupo !== itens[i - 1]?.grupo
                ? <div className="sel-grupo" role="presentation">{o.grupo}</div> : null}
              <Opcao role="option" aria-selected={valor === o.v} marcada={valor === o.v}
                estilo="sel-opt" desativado={o.desativada} onClick={() => escolher(o.v)}>{o.l}</Opcao>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}
