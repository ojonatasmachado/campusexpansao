/* HTML do editor de texto rico (divulgação do curso) antes de ir para a tela.
   O texto é gravado pelo navegador de quem edita e lido por todos os membros:
   sem esta limpeza, um <img onerror> ou <script> gravado pela API rodaria no
   app de quem abrir o curso. Passa só o que o editor produz (negrito, itálico,
   título, listas, parágrafo, quebra e link http/https/mailto), sem atributos,
   exceto o href do link. */

const TAGS = new Set(["B", "STRONG", "I", "EM", "U", "H3", "H4", "P", "DIV", "BR", "UL", "OL", "LI", "A", "SPAN"]);
/* conteúdo descartado inteiro, não só a marcação */
const FORA = new Set(["SCRIPT", "STYLE", "IFRAME", "OBJECT", "EMBED", "TEMPLATE", "NOSCRIPT", "SVG", "MATH"]);
const LINK_OK = /^(https?:|mailto:)/i;

function escapar(t: string): string {
  return t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function htmlSeguro(html: string | null | undefined): string {
  if (!html) return "";
  /* no servidor não há DOMParser: vai só o texto, sem marcação */
  if (typeof DOMParser === "undefined") return escapar(html.replace(/<[^>]*>/g, " "));
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  const limpar = (no: Node): string => {
    if (no.nodeType === Node.TEXT_NODE) return escapar(no.textContent ?? "");
    if (no.nodeType !== Node.ELEMENT_NODE) return "";
    const el = no as Element;
    if (FORA.has(el.tagName)) return "";
    const dentro = Array.from(el.childNodes).map(limpar).join("");
    if (!TAGS.has(el.tagName)) return dentro;
    const tag = el.tagName.toLowerCase();
    if (tag === "br") return "<br>";
    if (tag === "a") {
      const href = (el.getAttribute("href") ?? "").trim();
      return LINK_OK.test(href) ? `<a href="${escapar(href).replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer">${dentro}</a>` : dentro;
    }
    return `<${tag}>${dentro}</${tag}>`;
  };
  return Array.from(doc.body.childNodes).map(limpar).join("");
}
