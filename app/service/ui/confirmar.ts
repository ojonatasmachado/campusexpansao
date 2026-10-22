"use client";

/* Diálogo de risco do Service (BIBLIOTECA.md, prancha 3), no lugar de window.confirm
   (que no celular aparece como "campusexpansao.com diz:").
   Só para o que não dá para desfazer: título em pergunta, botão com o verbo exato.
   O que dá para desfazer não pergunta antes: faz e oferece Desfazer no aviso.

     if (!(await confirmar({ titulo: "Remover este link da página?", acao: "Remover" }))) return;

   Montado no mesmo padrão do avisar(): fora do React, com as classes da janela
   (.modal-bg/.modal), então o DialogosAcessiveis já cuida de foco, Tab e Esc
   (Esc e clique no fundo valem como Cancelar). */

import { botaoClasse } from "./Botao";

export type ConfirmarOpcoes = {
  titulo: string;
  texto?: string;
  /* verbo exato da ação: "Remover", "Gerar novo código" */
  acao: string;
  /* padrão true: a ação apaga ou tira algo */
  perigo?: boolean;
  cancelar?: string;
};

export function confirmar({ titulo, texto, acao, perigo = true, cancelar = "Cancelar" }: ConfirmarOpcoes): Promise<boolean> {
  if (typeof document === "undefined") return Promise.resolve(false);
  return new Promise((resolver) => {
    const fundo = document.createElement("div");
    fundo.className = "modal-bg confirmar-bg";
    const caixa = document.createElement("div");
    caixa.className = "modal confirmar";
    caixa.setAttribute("role", "alertdialog");
    caixa.setAttribute("aria-modal", "true");
    const tId = `confirmar-t-${Date.now()}`;
    caixa.setAttribute("aria-labelledby", tId);

    const t = document.createElement("h2");
    t.id = tId;
    t.className = "confirmar-t";
    t.textContent = titulo;
    caixa.append(t);
    if (texto) {
      const s = document.createElement("p");
      s.className = "confirmar-s";
      s.textContent = texto;
      caixa.append(s);
    }

    const acoes = document.createElement("div");
    acoes.className = "confirmar-acoes";
    const nao = document.createElement("button");
    nao.type = "button";
    nao.className = botaoClasse({ variante: "secundario" });
    nao.textContent = cancelar;
    const sim = document.createElement("button");
    sim.type = "button";
    sim.className = botaoClasse({ variante: perigo ? "perigo" : "principal" });
    sim.textContent = acao;
    acoes.append(nao, sim);
    caixa.append(acoes);
    fundo.append(caixa);

    let feito = false;
    const fechar = (r: boolean) => {
      if (feito) return;
      feito = true;
      fundo.remove();
      resolver(r);
    };
    nao.addEventListener("click", () => fechar(false));
    sim.addEventListener("click", () => fechar(true));
    /* clique no fundo (e o Esc, que o DialogosAcessiveis traduz em clique no fundo) cancela */
    fundo.addEventListener("click", (e) => { if (e.target === fundo) fechar(false); });

    document.body.append(fundo);
    /* foco começa no Cancelar: num diálogo de risco, Enter sem querer não apaga nada */
    requestAnimationFrame(() => nao.focus());
  });
}
