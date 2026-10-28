// Preparação conservadora, não tradução automática.
// npx tsx scripts/internacional/preparar-jsx.ts arquivo.tsx [--aplicar]
// Conferir as reservas antes de --aplicar. Só escreve dentro do trilho N1.
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { XMLParser } from "fast-xml-parser";

const root = resolve(__dirname, "../..");
const entities = new XMLParser({ htmlEntities: true, trimValues: false, parseTagValue: false });
const uiProperties = new Set(["title", "titulo", "subtitle", "subtitulo", "label", "rotulo", "placeholder", "ph", "hint", "help", "ajuda", "saveLabel", "text", "texto", "emptyText", "aria-label", "alt", "eyebrow", "t", "s"]);
type Owner = ts.FunctionDeclaration | ts.FunctionExpression | ts.ArrowFunction;
type Patch = { start: number; end: number; text: string };

function nameOf(fn: Owner): string {
  if ((ts.isFunctionDeclaration(fn) || ts.isFunctionExpression(fn)) && fn.name) return fn.name.text;
  return ts.isVariableDeclaration(fn.parent) && ts.isIdentifier(fn.parent.name) ? fn.parent.name.text : "";
}

function ownerOf(node: ts.Node): Owner | null {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if ((ts.isFunctionDeclaration(parent) || ts.isFunctionExpression(parent) || ts.isArrowFunction(parent)) && parent.body && ts.isBlock(parent.body)) {
      if (/^[A-Z]|^use[A-Z]/.test(nameOf(parent))) return parent;
    }
  }
  return null;
}

function cleanJsx(value: string): string {
  const lines = value.replace(/\t/g, " ").split(/\r\n|\n|\r/);
  let last = -1;
  for (let i = 0; i < lines.length; i++) if (/[^ ]/.test(lines[i])) last = i;
  const cleaned = lines.map((line, i) => {
    let text = i === 0 ? line : line.replace(/^ +/, "");
    if (i !== lines.length - 1) text = text.replace(/ +$/, "");
    return text + (text && i !== last ? " " : "");
  }).join("");
  return decodeJsx(cleaned);
}

function decodeJsx(value: string): string {
  if (!/&(?:#\d+|#x[\da-f]+|[a-z]+);/iu.test(value)) return value;
  const decoded = entities.parse(`<text>${value}</text>`).text;
  if (typeof decoded !== "string") throw new Error("Texto JSX não pôde ser decodificado sem mudar seu tipo.");
  return decoded;
}

function displayExpression(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isTemplateExpression(parent)) return false;
    if (ts.isJsxExpression(parent)) {
      return !ts.isJsxAttribute(parent.parent) || uiProperties.has(parent.parent.name.getText());
    }
    if (ts.isStatement(parent) || ts.isJsxAttribute(parent)) return false;
  }
  return false;
}

function isUiObject(node: ts.Node): boolean {
  for (let parent = node.parent; parent; parent = parent.parent) {
    if (ts.isCallExpression(parent) && /^(setModal|confirmar)$/.test(parent.expression.getText())) return true;
    if (ts.isFunctionLike(parent)) return false;
  }
  return false;
}

export function prepareJsxSource(fileName: string, code: string) {
  const file = resolve(root, fileName);
  const relativeFile = relative(root, file).replaceAll("\\", "/");
  if (!relativeFile.startsWith("app/service/") || !relativeFile.endsWith(".tsx")) throw new Error("Informe um componente do Service.");
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const patches: Patch[] = [];
  const owners = new Map<Owner, { translator: string; server: boolean; existing: boolean }>();
  const manual: { line: number; reason: string; source: string }[] = [];
  const functions = new Set<string>();
  function translator(node: ts.Node) {
    const owner = ownerOf(node);
    if (!owner) { manual.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reason: "fora de componente/hook", source: node.getText(source).slice(0, 120) }); return null; }
    let info = owners.get(owner);
    if (!info) {
      const server = !!owner.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.AsyncKeyword);
      let existing: string | undefined;
      for (const statement of (owner.body as ts.Block).statements) if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          const init = declaration.initializer && (ts.isAwaitExpression(declaration.initializer) ? declaration.initializer.expression : declaration.initializer);
          if (ts.isIdentifier(declaration.name) && init && ts.isCallExpression(init) && /^(useTexto|getTexto)$/.test(init.expression.getText(source))) existing = declaration.name.text;
        }
      }
      if (!existing && /\btraduzirUi\b/.test(owner.getText(source))) throw new Error(`Nome traduzirUi já usado em ${nameOf(owner)}`);
      info = { translator: existing ?? "traduzirUi", server, existing: !!existing };
      owners.set(owner, info);
      if (!existing) functions.add(server ? "getTexto" : "useTexto");
    }
    return info.translator;
  }
  function replace(node: ts.Node, value: string, jsxAttribute = false, jsxText = false) {
    if (jsxAttribute) value = decodeJsx(value);
    if (!/\p{L}{2}/u.test(value)) return;
    if (/<\/?[a-z]/iu.test(value)) { manual.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reason: "ângulos literais: distinguir texto de tag ICU", source: value }); return; }
    const name = translator(node);
    if (!name) return;
    const call = `${name}(${JSON.stringify(value)})`;
    patches.push({ start: jsxText ? node.pos : node.getStart(source), end: node.end, text: jsxAttribute || jsxText ? `{${call}}` : call });
  }
  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      const value = cleanJsx(node.text);
      if (/\p{L}{2}/u.test(value)) {
        if (ts.isJsxElement(node.parent) && node.parent.children.every(ts.isJsxText)) replace(node, value, false, true);
        else manual.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reason: "frase com dados/marcação: tratar inteira", source: node.parent.getText(source).slice(0, 180) });
      }
      return;
    }
    if (ts.isTemplateExpression(node) && displayExpression(node)) {
      if (!/\p{L}{2}/u.test(node.head.text + node.templateSpans.map((span) => span.literal.text).join(""))) return;
      const plain = node.templateSpans.every((span) => !/[?:]/.test(span.expression.getText(source)) && !/\bplural\s*\(/.test(span.expression.getText(source)));
      if (!plain) { manual.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reason: "template condicional/plural: tratar como ICU inteiro", source: node.getText(source).slice(0, 180) }); return; }
      const name = translator(node);
      let message = node.head.text;
      node.templateSpans.forEach((span, i) => { message += `{value${i}}${span.literal.text}`; });
      if (name && /\p{L}{2}/u.test(message)) patches.push({ start: node.getStart(source), end: node.end, text: `${name}(${JSON.stringify(message)}, { ${node.templateSpans.map((span, i) => `value${i}: \`\${${span.expression.getText(source)}}\``).join(", ")} })` });
      return;
    }
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      const parent = node.parent;
      if (ts.isJsxAttribute(parent) && uiProperties.has(parent.name.getText(source))) replace(node, node.text, true);
      else if (ts.isCallExpression(parent) && parent.arguments[0] === node && parent.expression.getText(source) === "avisar") replace(node, node.text);
      else if (ts.isCallExpression(parent) && parent.arguments[0] === node && parent.expression.getText(source) === "ct" && (displayExpression(node) || isUiObject(parent))) {
        const owner = ownerOf(node);
        if (owner && nameOf(owner) === "ServiceExactApp") manual.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reason: "casca: passar o vocabulário calculado no próprio componente", source: node.text });
        else replace(node, node.text);
      }
      else if (ts.isPropertyAssignment(parent) && uiProperties.has(parent.name.getText(source).replace(/['"]/g, "")) && isUiObject(parent)) replace(node, node.text);
      else if (ts.isPropertyAssignment(parent) && uiProperties.has(parent.name.getText(source).replace(/['"]/g, "")) && /\p{L}{2}/u.test(node.text)) manual.push({ line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1, reason: "estrutura de dados: classificar interface/conteúdo e localizar no consumidor", source: node.getText(source).slice(0, 180) });
      else if (displayExpression(node) && (ts.isJsxExpression(parent) || ts.isConditionalExpression(parent) && (parent.whenTrue === node || parent.whenFalse === node) || ts.isBinaryExpression(parent) && parent.right === node && [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(parent.operatorToken.kind))) replace(node, node.text);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  const replacements = patches.length;
  for (const [owner, info] of owners) if (!info.existing) {
    let position = owner.body!.getStart(source) + 1;
    for (const statement of (owner.body as ts.Block).statements) {
      if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
      position = statement.end;
    }
    patches.push({ start: position, end: position, text: `\n  const ${info.translator} = ${info.server ? "await getTexto()" : "useTexto()"};\n` });
  }
  if (functions.size) {
    const imports = source.statements.filter(ts.isImportDeclaration);
    const position = imports.length ? imports[imports.length - 1].end : source.statements[0]?.end ?? 0;
    const imported = [...functions].map((fn) => {
      const target = resolve(root, `app/service/lib/internacional/${fn === "getTexto" ? "servidor" : "contexto"}`);
      const path = relative(dirname(file), target).replaceAll("\\", "/");
      return `\nimport { ${fn} } from ${JSON.stringify(path.startsWith(".") ? path : `./${path}`)};`;
    }).join("");
    patches.push({ start: position, end: position, text: imported + "\n" });
  }
  const ordered = patches.sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < ordered.length; i++) if (ordered[i].start < ordered[i - 1].end) throw new Error(`Alterações sobrepostas em ${relativeFile}`);
  let output = code;
  for (const patch of [...ordered].reverse()) output = output.slice(0, patch.start) + patch.text + output.slice(patch.end);
  return { file: relativeFile, replacements, componentCount: owners.size, manual, output };
}

export function prepareJsx(fileName: string, apply = false) {
  const file = resolve(root, fileName);
  const relativeFile = relative(root, file).replaceAll("\\", "/");
  const story = readFileSync(resolve(root, "docs/service-v7/historias/N1-fuso-idioma-moeda.md"), "utf8");
  const rail = [...story.matchAll(/^- `([^`]+)`/gm)].map((match) => match[1]);
  if (apply && !rail.some((path) => relativeFile === path || path.endsWith("/") && relativeFile.startsWith(path))) throw new Error(`Fora do trilho N1: ${relativeFile}`);
  const code = readFileSync(file, "utf8");
  const { output, ...result } = prepareJsxSource(fileName, code);
  if (apply && output !== code) writeFileSync(file, output);
  return { ...result, applied: apply && output !== code };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  const paths = process.argv.slice(2).filter((value) => !value.startsWith("--"));
  if (!paths.length) throw new Error("Informe os arquivos. Sem --aplicar, nada é escrito.");
  for (const file of paths) console.log(JSON.stringify(prepareJsx(file, process.argv.includes("--aplicar"))));
}
