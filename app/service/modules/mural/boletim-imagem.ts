/* Imagem do boletim para status e story (1080 x 1920), desenhada num canvas,
   sem biblioteca. Cores da igreja (AGENTS.md §2, exceção do tema): lidas das
   variáveis do tema que já estão na tela. */

import { diaCurto, rotuloSemana, type Semana } from "./boletim";
import type { MuralAviso } from "./estado";
import type { EventView } from "../../ServiceExactApp";

const L = 1080;
const A = 1920;
const M = 96;

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const linhas: string[] = [];
  let atual = "";
  for (const palavra of texto.split(/\s+/).filter(Boolean)) {
    const tentativa = atual ? `${atual} ${palavra}` : palavra;
    if (ctx.measureText(tentativa).width <= largura || !atual) atual = tentativa;
    else { linhas.push(atual); atual = palavra; }
  }
  if (atual) linhas.push(atual);
  return linhas;
}

export async function desenharBoletim(origem: HTMLElement, d: { igreja: string; semana: Semana; agenda: EventView[]; avisos: MuralAviso[] }): Promise<Blob | null> {
  const css = getComputedStyle(origem);
  const cor = (v: string, padrao: string) => css.getPropertyValue(v).trim() || padrao;
  /* o tema da igreja sempre define estas variáveis no Service; o nome de cor é só reserva */
  const fundo = cor("--ink", "black");
  const texto = cor("--white", "white");
  const apoio = cor("--muted", "gray");
  const destaque = cor("--olive", "olive");
  const linha = cor("--border-2", "dimgray");
  if (document.fonts?.ready) await document.fonts.ready;

  const canvas = document.createElement("canvas");
  canvas.width = L;
  canvas.height = A;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const fonte = (peso: number, px: number) => `${peso} ${px}px Inter, system-ui, sans-serif`;
  ctx.fillStyle = fundo;
  ctx.fillRect(0, 0, L, A);
  ctx.textBaseline = "top";

  let y = M + 40;
  ctx.fillStyle = destaque;
  ctx.fillRect(M, y, 96, 10);
  y += 56;
  if (d.igreja) {
    ctx.font = fonte(700, 44);
    ctx.fillStyle = destaque;
    for (const l of quebrar(ctx, d.igreja, L - 2 * M).slice(0, 2)) { ctx.fillText(l, M, y); y += 56; }
    y += 16;
  }
  ctx.font = fonte(700, 92);
  ctx.fillStyle = texto;
  for (const l of quebrar(ctx, `Semana de ${rotuloSemana(d.semana)}`, L - 2 * M)) { ctx.fillText(l, M, y); y += 104; }
  y += 40;

  const limite = A - M - 80;
  let cortou = false;
  const secao = (titulo: string) => {
    ctx.fillStyle = linha;
    ctx.fillRect(M, y, L - 2 * M, 3);
    y += 36;
    ctx.font = fonte(700, 36);
    ctx.fillStyle = destaque;
    ctx.fillText(titulo, M, y);
    y += 64;
  };

  if (d.agenda.length) {
    secao("Agenda");
    for (const e of d.agenda) {
      ctx.font = fonte(600, 46);
      const nome = quebrar(ctx, e.name, L - 2 * M - 220).slice(0, 2);
      const altura = nome.length * 58 + 52 + 28;
      if (y + altura > limite) { cortou = true; break; }
      ctx.font = fonte(700, 40);
      ctx.fillStyle = destaque;
      ctx.fillText(diaCurto(e.eventDate), M, y + 4);
      ctx.font = fonte(600, 46);
      ctx.fillStyle = texto;
      nome.forEach((l, i) => ctx.fillText(l, M + 220, y + i * 58));
      ctx.font = fonte(400, 36);
      ctx.fillStyle = apoio;
      ctx.fillText([e.time?.slice(0, 5), e.location].filter(Boolean).join(" · "), M + 220, y + nome.length * 58 + 6);
      y += altura;
    }
    y += 24;
  }

  if (d.avisos.length && y + 260 >= limite) cortou = true;
  if (d.avisos.length && !cortou) {
    secao("Avisos");
    for (const a of d.avisos) {
      ctx.font = fonte(600, 46);
      const linhas = quebrar(ctx, a.title.trim(), L - 2 * M).slice(0, 3);
      const altura = linhas.length * 58 + 32;
      if (y + altura > limite) { cortou = true; break; }
      ctx.fillStyle = a.urgent ? destaque : texto;
      linhas.forEach((l, i) => ctx.fillText(l, M, y + i * 58));
      y += altura;
    }
  }

  if (cortou) {
    ctx.font = fonte(500, 36);
    ctx.fillStyle = apoio;
    ctx.fillText("Tem mais no app da igreja", M, limite + 20);
    return new Promise((ok) => canvas.toBlob((b) => ok(b), "image/png"));
  }

  /* pouco conteúdo: o bloco desce para o meio, sem deixar metade da imagem vazia */
  const final = document.createElement("canvas");
  final.width = L;
  final.height = A;
  const fctx = final.getContext("2d");
  if (!fctx) return null;
  fctx.fillStyle = fundo;
  fctx.fillRect(0, 0, L, A);
  const altura = y + M;
  fctx.drawImage(canvas, 0, 0, L, altura, 0, Math.max(0, Math.round((A - altura) / 2 - 40)), L, altura);
  return new Promise((ok) => final.toBlob((b) => ok(b), "image/png"));
}
