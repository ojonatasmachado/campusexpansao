"use client";
import { useEffect } from "react";

// Clicar em "Sobre" ou "Materiais" fora da home navega pra /#sobre ou
// /#materiais: uma recarga de página de verdade, não só uma rolagem. O salto
// nativo do navegador pro #id acontece antes das fontes e imagens acima da
// seção terminarem de carregar, então a posição fica errada assim que o
// layout termina de assentar. Tira o hash da URL e refaz a rolagem depois
// que a página carregou de verdade, aí sempre pousa no lugar certo.
export default function HashScroll() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = hash.slice(1);
    const el = document.getElementById(id);
    if (!el) return;

    history.replaceState(null, "", window.location.pathname + window.location.search);

    const scroll = () => el.scrollIntoView({ behavior: "smooth", block: "start" });
    if (document.readyState === "complete") {
      requestAnimationFrame(() => requestAnimationFrame(scroll));
    } else {
      window.addEventListener(
        "load",
        () => requestAnimationFrame(() => requestAnimationFrame(scroll)),
        { once: true }
      );
    }
  }, []);
  return null;
}
