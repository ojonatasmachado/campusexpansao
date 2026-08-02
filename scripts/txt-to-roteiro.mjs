// Uso: node scripts/txt-to-roteiro.mjs <arquivo.txt> <linhas-a-pular>
// Converte o texto extraido de um docx (via textutil) em HTML simples pro
// campo `roteiro` de DbMaterialContent: paragrafos <p>, titulos de secao
// conhecidos <h2>, blocos de bullet "•" agrupados em <ul><li>.
import fs from "node:fs";

const HEADING_WORDS = new Set([
  // pt
  "preparação do preletor", "distribuição de tempo sugerida", "introdução",
  "aplicação", "transição", "ilustração", "conexão com cristo e o evangelho",
  "conclusão", "momento de resposta", "oração sugerida", "orientações ao preletor",
  "roteiro para pequenos grupos", "desafio da semana", "referências essenciais",
  "para aprofundamento", "créditos e uso",
  // en
  "preacher preparation", "suggested time distribution", "introduction",
  "application", "transition", "illustration", "connection to christ and the gospel",
  "conclusion", "response time", "suggested prayer", "guidance for the preacher",
  "small-group guide", "challenge for the week", "essential references",
  "for further study", "credits and use",
  // es
  "preparación del predicador", "distribución sugerida del tiempo", "introducción",
  "aplicación", "transición", "ilustración", "conexión con cristo y el evangelio",
  "conclusión", "momento de respuesta", "oración sugerida", "orientaciones para el predicador",
  "guía para grupos pequeños", "desafío de la semana", "referencias esenciales",
  "para profundizar", "créditos y uso",
  // catalogo 2: formato de encontro infantil (pt/en/es)
  "antes de começar", "roteiro do encontro", "orientação ao cuidador",
  "adaptações simples", "cuidado bíblico e pastoral", "referências para preparação",
  "before you begin", "session outline", "guidance for the caregiver",
  "simple adaptations", "biblical and pastoral care", "preparation references",
  "antes de comenzar", "guion del encuentro", "orientación para el cuidador",
  "adaptaciones sencillas", "cuidado bíblico y pastoral", "referencias para la preparación",
  // catalogo 2: formato adolescentes/jovens (extra em relacao ao material 1)
  "contexto bíblico", "desenvolvimento", "perguntas para pequenos grupos", "prática da semana",
  "biblical context", "development", "small-group questions", "weekly practice",
  "desarrollo", "preguntas para grupos pequeños", "práctica de la semana",
]);

function isMovementHeading(line) {
  return /^(Movimento|Movement|Movimiento)\s+\d/i.test(line.trim());
}

function isAgendaHeading(line) {
  return /^\d+\.\s+.+\|\s*\d+\s*(min|minutos|minutes)/i.test(line.trim());
}

function isHeading(line) {
  const t = line.trim().toLowerCase().replace(/[:.]$/, "");
  return HEADING_WORDS.has(t) || isMovementHeading(line) || isAgendaHeading(line);
}

function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function convert(lines) {
  const html = [];
  let listBuf = [];
  const flushList = () => {
    if (listBuf.length) {
      html.push(`<ul>${listBuf.map((li) => `<li>${esc(li)}</li>`).join("")}</ul>`);
      listBuf = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("•")) {
      listBuf.push(line.replace(/^•\s*/, ""));
      continue;
    }
    flushList();
    if (isHeading(line)) {
      html.push(`<h2>${esc(line)}</h2>`);
    } else {
      html.push(`<p>${esc(line)}</p>`);
    }
  }
  flushList();
  return html.join("\n");
}

const [txtPath, skip] = process.argv.slice(2);
if (!txtPath) throw new Error("Uso: node scripts/txt-to-roteiro.mjs <arquivo.txt> [linhas-a-pular]");
const lines = fs.readFileSync(txtPath, "utf-8").split("\n").slice(Number(skip ?? 0));
process.stdout.write(convert(lines));
