"use client";

/* Campo do Service (BIBLIOTECA.md, prancha 3).
   Rótulo sempre visível em cima; a ajuda ou o erro aparecem embaixo, no mesmo
   lugar (o erro substitui a ajuda e diz como corrigir). O Campo liga o rótulo
   ao controle (htmlFor/id) e a ajuda ou o erro ao controle (aria-describedby,
   aria-invalid), então a tela só escreve o controle:

     <Campo rotulo="Telefone" erro={erroTel}>
       <Entrada value={tel} onChange={(e) => setTel(e.target.value)} />
     </Campo>

   Controle que não é <input>/<textarea> (Selecao, SeletorData, grupo de chips)
   recebe o mesmo id; os que abrem lista usam o id no gatilho. Visual em
   biblioteca.css (.field, .field-label, .field-hint, .field-error). */

import { cloneElement, isValidElement, useId } from "react";
import type { CSSProperties, InputHTMLAttributes, ReactElement, ReactNode, Ref, TextareaHTMLAttributes } from "react";

type Ligacao = { id?: string; "aria-describedby"?: string; "aria-invalid"?: boolean; "aria-required"?: boolean; role?: string };

export type CampoProps = {
  rotulo: ReactNode;
  /* texto de apoio embaixo; some quando há erro */
  ajuda?: ReactNode;
  /* mensagem que diz como corrigir; deixa o campo em estado de erro */
  erro?: ReactNode;
  obrigatorio?: boolean;
  /* id do controle; sem ele, o Campo cria um */
  id?: string;
  /* grupo de opções (chips, marcar): o rótulo vira legenda do grupo, sem htmlFor */
  grupo?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
};

export function Campo({ rotulo, ajuda, erro, obrigatorio, id, grupo, className, style, children }: CampoProps) {
  const auto = useId();
  const ctrlId = id || (isValidElement<Ligacao>(children) ? children.props.id : undefined) || `c${auto}`;
  const apoioId = `${ctrlId}-apoio`;
  const temApoio = Boolean(erro || ajuda);
  const rotuloId = `${ctrlId}-rotulo`;
  const ligado = isValidElement<Ligacao>(children)
    ? cloneElement(children as ReactElement<Ligacao>, {
        id: ctrlId,
        "aria-describedby": [children.props["aria-describedby"], temApoio ? apoioId : null].filter(Boolean).join(" ") || undefined,
        "aria-invalid": erro ? true : children.props["aria-invalid"],
        ...(obrigatorio && !grupo ? { "aria-required": true } : {}),
        ...(grupo ? { "aria-labelledby": rotuloId, role: children.props.role ?? "group" } : {}),
      })
    : children;
  const cls = `field${erro ? " field-com-erro" : ""}${className ? ` ${className}` : ""}`;
  return (
    <div className={cls} style={style}>
      {grupo
        ? <div id={rotuloId} className={`field-label${obrigatorio ? " req" : ""}`}>{rotulo}</div>
        : <label htmlFor={ctrlId} className={`field-label${obrigatorio ? " req" : ""}`}>{rotulo}</label>}
      {ligado}
      {erro ? <div id={apoioId} className="field-error" role="alert">{erro}</div>
        : ajuda ? <div id={apoioId} className="field-hint">{ajuda}</div> : null}
    </div>
  );
}

/* Entrada de texto de uma linha. Tamanho 16px em tela de toque (sem zoom no iPhone). */
export type EntradaProps = InputHTMLAttributes<HTMLInputElement> & { ref?: Ref<HTMLInputElement> };
export function Entrada({ className, type = "text", ...rest }: EntradaProps) {
  return <input {...rest} type={type} className={className ? `input ${className}` : "input"} />;
}

/* Texto de várias linhas. */
export type TextoLongoProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { ref?: Ref<HTMLTextAreaElement> };
export function TextoLongo({ className, ...rest }: TextoLongoProps) {
  return <textarea {...rest} className={className ? `textarea ${className}` : "textarea"} />;
}

/* Caixa de marcar (ou bolinha, com tipo="radio"): elemento nativo, rótulo clicável ao lado.
   Visual em biblioteca.css (.marcar). */
export type MarcarProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "children"> & {
  tipo?: "checkbox" | "radio";
  /* direita: texto à esquerda e caixa no fim da linha (listas de permissões e camadas) */
  lado?: "esquerda" | "direita";
  children?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};
export function Marcar({ tipo = "checkbox", lado = "esquerda", children, className, ...rest }: MarcarProps) {
  return (
    <label className={`marcar${tipo === "radio" ? " marcar-radio" : ""}${lado === "direita" ? " marcar-direita" : ""}${className ? ` ${className}` : ""}`}>
      <input {...rest} type={tipo} />
      <span className="marcar-caixa" aria-hidden="true" />
      {children != null ? <span className="marcar-texto">{children}</span> : null}
    </label>
  );
}
