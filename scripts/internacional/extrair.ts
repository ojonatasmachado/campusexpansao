// npx tsx scripts/internacional/extrair.ts [--escrever]
// Sem --escrever apenas verifica; tradução vazia nunca conta como concluída.
import ts from "typescript";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { parse, TYPE, type MessageFormatElement } from "@formatjs/icu-messageformat-parser";
import { messageKey } from "../../app/service/lib/internacional/chave";
import { prepareVocabulary } from "../../app/service/lib/internacional/vocabulario";
import { vocabularioPadrao } from "../../app/service/lib/vocabulario";
import { LOCALES } from "../../app/service/lib/internacional/contrato";

const root = resolve(__dirname, "../..");
const catalogs = join(root, "app/service/lib/internacional/mensagens");
type Reference = { file: string; line: number };
type Source = { source: string; references: Reference[] };

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = join(directory, entry.name);
    return entry.isDirectory() ? files(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}

export function collectMessages(): Map<string, Source> {
  const result = new Map<string, Source>();
  for (const file of [...files(join(root, "app/service")), ...files(join(root, "app/api/service"))]) {
    if (file.includes("/lib/internacional/")) continue;
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true);
    const translatorNames = new Set<string>();
    const find = (node: ts.Node) => {
      if (ts.isParameter(node) && ts.isIdentifier(node.name) && node.type?.getText(source) === "Text") translatorNames.add(node.name.text);
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        const init = ts.isAwaitExpression(node.initializer) ? node.initializer.expression : node.initializer;
        if (ts.isCallExpression(init) && ts.isIdentifier(init.expression) && ["useTexto", "getTexto"].includes(init.expression.text)) translatorNames.add(node.name.text);
      }
      ts.forEachChild(node, find);
    };
    find(source);
    const visit = (node: ts.Node) => {
      if (ts.isCallExpression(node)) {
        const callee = ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === "rich" ? node.expression.expression : node.expression;
        if (ts.isIdentifier(callee) && translatorNames.has(callee.text)) {
          const argument = node.arguments[0];
          if (argument && (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))) {
            const message = argument.text.normalize("NFC");
            const key = messageKey(message);
            const existing = result.get(key);
            if (existing && existing.source !== message) throw new Error(`Colisão de chave ${key}`);
            const value = existing ?? { source: message, references: [] };
            value.references.push({ file: relative(root, file), line: source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1 });
            result.set(key, value);
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return result;
}

function argumentsOf(elements: MessageFormatElement[]): string[] {
  const names = new Set<string>();
  const visit = (nodes: MessageFormatElement[]) => {
    for (const node of nodes) {
      if (node.type === TYPE.argument || node.type === TYPE.number || node.type === TYPE.date || node.type === TYPE.time) names.add(`argument:${node.value}`);
      else if (node.type === TYPE.tag) { names.add(`tag:${node.value}`); visit(node.children); }
      else if (node.type === TYPE.select || node.type === TYPE.plural) { names.add(`argument:${node.value}`); for (const option of Object.values(node.options)) visit(option.value); }
    }
  };
  visit(elements);
  return [...names].sort();
}

export function checkCatalogs(write = false) {
  const found = collectMessages();
  const sources: Record<string, string> = JSON.parse(readFileSync(join(catalogs, "fontes.json"), "utf8"));
  for (const [key, value] of found) {
    if (sources[key] && sources[key].normalize("NFC") !== value.source) throw new Error(`Colisão de catálogo ${key}`);
    sources[key] = value.source;
  }
  const errors: string[] = [];
  const ordered = Object.entries(sources).sort(([a], [b]) => a.localeCompare(b));
  for (const [key, source] of ordered) if (messageKey(source) !== key) errors.push(`Chave incompatível com a fonte ${key}`);
  for (const locale of LOCALES) {
    const file = join(catalogs, `${locale}.json`);
    const messages: Record<string, string> = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : {};
    for (const [key, source] of ordered) {
      const canonical = prepareVocabulary(source, vocabularioPadrao()).message;
      if (locale === "pt-BR" && write) messages[key] = canonical;
      if (!(key in messages) && write) messages[key] = "";
      if (!messages[key]) { errors.push(`${locale}: falta ${key} (${source.slice(0, 70)})`); continue; }
      try {
        const sourceArguments = argumentsOf(parse(canonical));
        const translatedArguments = argumentsOf(parse(messages[key]));
        if (JSON.stringify(sourceArguments) !== JSON.stringify(translatedArguments)) errors.push(`${locale}: argumentos/tags diferentes em ${key}`);
      } catch (error) { errors.push(`${locale}: ICU inválido em ${key}: ${String(error)}`); }
    }
    for (const key of Object.keys(messages)) if (!sources[key]) errors.push(`${locale}: chave sem fonte ${key}`);
    if (write) writeFileSync(file, JSON.stringify(Object.fromEntries(ordered.map(([key]) => [key, messages[key]])), null, 2) + "\n");
  }
  if (write) {
    writeFileSync(join(catalogs, "fontes.json"), JSON.stringify(Object.fromEntries(ordered), null, 2) + "\n");
    writeFileSync(join(catalogs, "referencias.json"), JSON.stringify(Object.fromEntries([...found].map(([key, value]) => [key, value.references])), null, 2) + "\n");
  }
  if (errors.length) throw new Error(`${errors.length} falhas de catálogo:\n${errors.slice(0, 30).join("\n")}`);
  return { sourceCount: ordered.length, usedCount: found.size, locales: LOCALES.length };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) {
  try { console.log(JSON.stringify(checkCatalogs(process.argv.includes("--escrever")))); }
  catch (error) { console.error(String(error)); process.exitCode = 1; }
}
