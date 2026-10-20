/* Iniciais do avatar (break-ui · nomes de verdade). Primeira letra do primeiro
   nome e do último sobrenome, pulando o que não é sobrenome: "de", "dos"…
   e sufixos como Júnior, Neto, Filho, III. Conta letras por grafema, então
   acento combinado e emoji não viram meio caractere ("�"). Nome só com
   símbolos ou vazio cai em "?". */

const SUFIXOS = new Set(["junior", "júnior", "jr", "jr.", "neto", "neta", "filho", "filha", "sobrinho", "sobrinha", "segundo", "ii", "iii", "iv"]);
const PARTICULAS = new Set(["de", "da", "do", "das", "dos", "e", "d'", "del", "van", "von"]);

function grafemas(t: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    return Array.from(new Intl.Segmenter("pt-BR", { granularity: "grapheme" }).segment(t), (s) => s.segment);
  }
  return Array.from(t);
}

/* primeira letra de verdade da palavra (pula emoji, número e pontuação na frente) */
function primeiraLetra(palavra: string): string {
  return grafemas(palavra).find((g) => /\p{L}/u.test(g)) ?? "";
}

export function iniciais(nome: string | null | undefined): string {
  const palavras = (nome ?? "").trim().split(/\s+/).filter((p) => primeiraLetra(p));
  if (palavras.length === 0) return "?";
  if (palavras.length === 1) {
    const letras = grafemas(palavras[0]).filter((g) => /\p{L}/u.test(g));
    return letras.slice(0, 2).join("").toLocaleUpperCase("pt-BR");
  }
  const sobrenomes = palavras.slice(1).filter((p) => !SUFIXOS.has(p.toLowerCase()) && !PARTICULAS.has(p.toLowerCase()));
  const ultimo = sobrenomes[sobrenomes.length - 1] ?? palavras[palavras.length - 1];
  return `${primeiraLetra(palavras[0])}${primeiraLetra(ultimo)}`.toLocaleUpperCase("pt-BR");
}
