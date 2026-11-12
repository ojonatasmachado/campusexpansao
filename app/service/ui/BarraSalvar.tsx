"use client";

/* Salvar só quando muda (BIBLIOTECA.md, prancha 5): a barra sobe de baixo quando
   há alteração e desce ao salvar (0,5 s, mola). Sair da página com alteração
   pergunta antes (aviso do navegador). Fica presa ao pé da área que rola.
   Visual em biblioteca.css (.save-bar). */

import { useEffect } from "react";
import { Botao } from "./Botao";
import { useTexto } from "../lib/internacional/contexto";

export type BarraSalvarProps = {
  /* há alteração não salva */
  visivel: boolean;
  aoSalvar: () => void;
  salvando?: boolean;
  /* desfaz as alterações; sem ele, não aparece o botão */
  aoDescartar?: () => void;
  texto?: string;
  rotuloSalvar?: string;
  className?: string;
};

export function BarraSalvar({ visivel, aoSalvar, salvando, aoDescartar, texto: textoProp, rotuloSalvar: rotuloSalvarProp, className }: BarraSalvarProps) {
  const traduzirUi = useTexto();
  const texto = textoProp ?? traduzirUi("Você tem alterações não salvas.");
  const rotuloSalvar = rotuloSalvarProp ?? traduzirUi("Salvar");
  useEffect(() => {
    if (!visivel) return;
    const segurar = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", segurar);
    return () => window.removeEventListener("beforeunload", segurar);
  }, [visivel]);

  return (
    <div className={`save-bar barra-salvar${visivel ? " on" : ""}${className ? ` ${className}` : ""}`}
      aria-hidden={!visivel} inert={!visivel} role="region" aria-label={traduzirUi("Alterações")}>
      <span>{texto}</span>
      <div className="barra-salvar-acoes">
        {aoDescartar ? <Botao variante="discreto" compacto desativado={salvando} onClick={aoDescartar}>{traduzirUi("Descartar")}</Botao> : null}
        <Botao variante="principal" carregando={salvando} onClick={aoSalvar}>{salvando ? traduzirUi("Salvando...") : rotuloSalvar}</Botao>
      </div>
    </div>
  );
}
