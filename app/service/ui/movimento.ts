/* Movimento do Service (canvas "Service, direção visual", prancha 1, Movimento):
   mola nas entradas e respostas ao toque (0,5 s, curva 0.32, 0.72, 0, 1), contagem
   nos números (1,2 s) e direção na troca de tela (desliza 44 px do lado de onde vem).
   Com movimento reduzido, tudo aparece direto no estado final. */

export const MOLA = "cubic-bezier(0.32, 0.72, 0, 1)";

export function movimentoReduzido() {
  return typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/* troca de tela: os filhos do contêiner entram deslizando 44 px do lado de onde
   a tela vem (dir 1 = vem da direita, -1 = da esquerda). Fica nos filhos, não no
   contêiner, para não mexer em barras fixas lá dentro. */
export function entrarComDirecao(el: HTMLElement | null, dir: number) {
  if (!el || !dir || movimentoReduzido() || typeof el.animate !== "function") return;
  for (const filho of Array.from(el.children) as HTMLElement[]) {
    const pos = getComputedStyle(filho).position;
    if (pos === "fixed" || pos === "sticky") continue;
    filho.animate(
      [{ transform: `translateX(${44 * Math.sign(dir)}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
      { duration: 500, easing: MOLA },
    );
  }
}
