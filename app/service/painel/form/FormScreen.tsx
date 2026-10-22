"use client";

import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { Icon } from "../../lib/icons";

import { Botao, BotaoIcone } from "../../ui/Botao";
/* Tela de formulário do painel (onda 1 do plano docs/service-v7/PLANO_TELA_FORMULARIO.md).
   Criar ou editar algo com mais de 4 campos abre aqui, não numa janela:
   topo fixo (voltar, título, até duas ações), coluna de 720px, e no celular o
   botão principal desce para um rodapé fixo. O voltar do navegador ou do
   celular fecha a tela; se algo mudou, pergunta antes de descartar.
   Fica sobre a área de conteúdo; o resto do app fica inerte enquanto ela está aberta. */

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** rótulo do botão principal (até 3 palavras) */
  saveLabel: string;
  saving?: boolean;
  /** o que falta preencher; com algo aqui o botão principal fica desligado */
  missing?: string[];
  /** algo mudou desde que a tela abriu */
  dirty?: boolean;
  error?: string;
  onSave: () => void;
  onClose: () => void;
  /** segunda ação (ex.: "Salvar rascunho"); no topo ocupa o lugar do Cancelar (o voltar já cancela) */
  secondary?: { label: string; onClick: () => void; disabled?: boolean };
  children: React.ReactNode;
};

/** fechar(): fecha tirando a entrada do histórico; resolve quando o voltar assentou
    (use antes de router.refresh(), senão o voltar pode restaurar a árvore velha) */
export type FormScreenHandle = { fechar: () => Promise<void> };

type EstadoHistorico = { svcForm?: string } | null;

/** "nome", "nome e telefone", "nome, telefone e culto" */
function juntar(itens: string[]) {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** volta uma entrada e espera o popstate (ou desiste em 400 ms) */
function voltarEEsperar(): Promise<void> {
  return new Promise((resolve) => {
    let feito = false;
    const fim = () => { if (feito) return; feito = true; window.removeEventListener("popstate", fim); resolve(); };
    window.addEventListener("popstate", fim);
    window.setTimeout(fim, 400);
    window.history.back();
  });
}

export const FormScreen = forwardRef<FormScreenHandle, Props>(function FormScreen({ eyebrow, title, subtitle, saveLabel, saving = false, missing = [], dirty = false, error, onSave, onClose, secondary, children }, ref) {
  const id = useId();
  const titleId = `${id}-t`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [confirmar, setConfirmar] = useState(false);
  const dirtyRef = useRef(dirty);
  const savingRef = useRef(saving);
  const confirmarRef = useRef(confirmar);
  const fechandoRef = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);
  useEffect(() => { savingRef.current = saving; }, [saving]);
  useEffect(() => { confirmarRef.current = confirmar; }, [confirmar]);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  /* Uma entrada no histórico por abertura. A marca é única (o useId se repete
     entre aberturas no mesmo lugar, e o Next copia chaves extras do estado no
     replaceState). O estado do Next (__NA etc.) é preservado, senão o roteador
     recarrega a página no voltar. Em desenvolvimento o React monta duas vezes:
     a marca só é gravada uma vez, e a entrada sai do histórico também quando a
     tela fecha por outro caminho. */
  const marcaRef = useRef("");
  const montadaRef = useRef(false);
  useEffect(() => {
    montadaRef.current = true;
    let marca = marcaRef.current;
    if (!marca || (window.history.state as EstadoHistorico)?.svcForm !== marca) {
      marca = `${id}-${Date.now()}`;
      marcaRef.current = marca;
      fechandoRef.current = false;
      window.history.pushState({ ...(window.history.state ?? {}), svcForm: marca }, "");
    }
    const reporEntrada = () => window.history.pushState({ ...(window.history.state ?? {}), svcForm: marca }, "");
    const onPop = () => {
      if (fechandoRef.current) return;
      if (savingRef.current) { reporEntrada(); return; }
      if (dirtyRef.current) { reporEntrada(); setConfirmar(true); return; }
      fechandoRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      montadaRef.current = false;
      window.setTimeout(() => {
        if (montadaRef.current || fechandoRef.current) return;
        if ((window.history.state as EstadoHistorico)?.svcForm === marca) {
          fechandoRef.current = true;
          window.history.back();
        }
      }, 0);
    };
  }, [id]);

  /* foco na tela ao abrir, resto do app inerte, foco de volta ao fechar */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const antes = document.activeElement as HTMLElement | null;
    const irmaos = Array.from(el.parentElement?.children ?? []).filter((c) => c !== el && !c.hasAttribute("inert"));
    irmaos.forEach((c) => c.setAttribute("inert", ""));
    el.focus();
    return () => {
      irmaos.forEach((c) => c.removeAttribute("inert"));
      if (antes && document.contains(antes)) antes.focus();
    };
  }, []);

  const fechar = useCallback(async () => {
    if (fechandoRef.current) return;
    fechandoRef.current = true;
    const nossa = (window.history.state as EstadoHistorico)?.svcForm === marcaRef.current;
    onCloseRef.current();
    if (nossa) await voltarEEsperar();
  }, []);

  useImperativeHandle(ref, () => ({ fechar }), [fechar]);

  const pedirFechar = useCallback(() => {
    if (savingRef.current) return;
    if (dirtyRef.current) setConfirmar(true);
    else void fechar();
  }, [fechar]);

  /* Escape só da própria tela, e só se nenhuma camada de dentro (data, lista, ajuda) estiver aberta */
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Escape" || e.defaultPrevented) return;
    if (confirmarRef.current) { e.preventDefault(); setConfirmar(false); return; }
    if (rootRef.current?.querySelector(".dp-pop, .sel-pop, .sel-menu, .help-pop, .modal-bg")) return;
    e.preventDefault();
    pedirFechar();
  };

  /* o erro aparece no topo da coluna: leva a pessoa até ele (o salvar pode estar lá embaixo) */
  const erroRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (error) erroRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [error]);

  const bloqueado = saving || missing.length > 0;
  const falta = missing.length ? `Falta: ${juntar(missing)}` : "";
  const principal = (
    <Botao variante="principal" onClick={onSave} desativado={bloqueado} aria-describedby={falta ? `${id}-falta` : undefined}>
      {saving ? "Salvando…" : saveLabel}
    </Botao>
  );

  const segunda = secondary ? (
    <Botao onClick={secondary.onClick} desativado={saving || secondary.disabled}>{secondary.label}</Botao>
  ) : null;

  return (
    <div className="fs" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={rootRef} tabIndex={-1} onKeyDown={onKeyDown}>
      <header className="fs-top">
        <BotaoIcone className="fs-back" onClick={pedirFechar} desativado={saving} rotulo="Voltar sem salvar">
          <Icon name="voltar" size={18} />
        </BotaoIcone>
        <div className="fs-head">
          {eyebrow ? <div className="fs-eyebrow">{eyebrow}</div> : null}
          <h2 className="fs-title" id={titleId}>{title}</h2>
        </div>
        <div className="fs-actions">
          {segunda ?? <Botao onClick={pedirFechar} desativado={saving}>Cancelar</Botao>}
          {principal}
        </div>
      </header>

      <div className="fs-body">
        <div className="fs-col">
          {subtitle ? <p className="fs-sub">{subtitle}</p> : null}
          {error ? <div className="fs-error" role="alert" ref={erroRef}>{error}</div> : null}
          {children}
          {falta ? <p className="fs-falta" id={`${id}-falta`}>{falta}</p> : null}
        </div>
      </div>

      <footer className={`fs-foot${segunda ? " fs-foot-2" : ""}`}>
        {segunda}
        {principal}
      </footer>

      {confirmar ? (
        <div className="fs-confirm" role="alertdialog" aria-modal="true" aria-labelledby={`${id}-c`}>
          <div className="fs-confirm-card">
            <p className="fs-confirm-t" id={`${id}-c`}>Descartar o que você preencheu?</p>
            <div className="fs-confirm-acts">
              <Botao onClick={() => setConfirmar(false)} autoFocus>Continuar editando</Botao>
              <Botao variante="perigo" onClick={() => { setConfirmar(false); void fechar(); }}>Descartar</Botao>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

/** bloco de campos com título curto ("Saúde", "Endereço") */
export function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="fs-sec">
      <h3 className="fs-sec-t">{title}</h3>
      {children}
    </section>
  );
}
