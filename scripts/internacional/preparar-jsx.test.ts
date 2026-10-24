import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { runInNewContext } from "node:vm";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { prepareJsxSource } from "./preparar-jsx";
import { ServiceLocaleProvider, useTexto } from "../../app/service/lib/internacional/contexto";
import { messageKey } from "../../app/service/lib/internacional/chave";

const localRequire = createRequire(resolve(__dirname, "../../package.json"));
function compile(source: string): ComponentType<Record<string, unknown>> {
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const compiledModule = { exports: {} as Record<string, ComponentType<Record<string, unknown>>> };
  runInNewContext(output, { module: compiledModule, exports: compiledModule.exports, require: (id: string) => id.endsWith("internacional/contexto") ? { useTexto } : localRequire(id) });
  assert.equal(typeof compiledModule.exports.Example, "function");
  return compiledModule.exports.Example;
}

export function checkJsxPreparation() {
  const file = "app/service/__i18n_fixture.tsx"; // virtual; nenhum arquivo do app é criado
  const source = `export function Example({name, status}) {
    return <section className={status} data-state="ativo">
      <h1>Nome &amp; telefone</h1>
      <input readOnly value={name} placeholder="&quot;Nome&quot;" />
      <b>{name}</b>
      <span>{\`Olá \${name}\`}</span>
      <button disabled={status !== "ativo"}>Salvar</button>
      <a href="/service?tipo=ativo">Salvar</a>
    </section>;
  }`;
  const prepared = prepareJsxSource(file, source);
  const Original = compile(source), Prepared = compile(prepared.output);
  const props = { name: "Salvar", status: "ativo" };
  assert.equal(renderToStaticMarkup(createElement(Prepared, props)), renderToStaticMarkup(createElement(Original, props)));
  assert.ok(prepared.output.includes('status !== "ativo"'));
  assert.ok(prepared.output.includes('data-state="ativo"'));
  assert.ok(prepared.output.includes('href="/service?tipo=ativo"'));
  assert.equal(prepareJsxSource(file, prepared.output).replacements, 0);

  const messages = {
    [messageKey("Nome & telefone")]: "Name & phone",
    [messageKey('"Nome"')]: '"Name"',
    [messageKey("Olá {value0}")]: "Hello {value0}",
    [messageKey("Salvar")]: "Save",
  };
  // createElement exige children nas props porque o contrato do provider o requer.
  // eslint-disable-next-line react/no-children-prop
  const translated = renderToStaticMarkup(createElement(ServiceLocaleProvider, { locale: "en-US", messages, children: createElement(Prepared, props) }));
  assert.ok(translated.includes("Name &amp; phone"));
  assert.ok(translated.includes("Hello Salvar"));
  assert.ok(translated.includes("<b>Salvar</b>")); // nome da pessoa, mesmo igual à chave, não é traduzido
  assert.ok(translated.includes('value="Salvar"'));

  const symbol = "export function Example({token}) { return <span>{`Valor ${token}`}</span>; }";
  const SymbolOriginal = compile(symbol), SymbolPrepared = compile(prepareJsxSource(file, symbol).output);
  const isTypeError = (error: unknown) => !!error && typeof error === "object" && "name" in error && error.name === "TypeError";
  assert.throws(() => renderToStaticMarkup(createElement(SymbolOriginal, { token: Symbol("data") })), isTypeError);
  assert.throws(() => renderToStaticMarkup(createElement(SymbolPrepared, { token: Symbol("data") })), isTypeError);

  const mixed = "export function Example({name}) { return <p>Olá <b>{name}</b>.</p>; }";
  const mixedResult = prepareJsxSource(file, mixed);
  assert.ok(mixedResult.manual.length > 0);
  assert.equal(mixedResult.output, mixed); // não quebra uma frase rica em fragmentos traduzidos
  console.log("Preparação JSX: HTML pt-BR idêntico, entidades, template, IDs/condições intactos, idempotência e conteúdo da pessoa preservado em inglês.");
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(__filename)) checkJsxPreparation();
