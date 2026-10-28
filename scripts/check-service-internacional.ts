import { friendlyReadError } from "../app/service/lib/server/adaptadores";
import { lerArquivo, lerLinha, palpiteColunas } from "../app/service/lib/planilha";
import { textoIcs } from "../app/service/lib/ics";
import { carregarExistentes, gravarImportacao } from "../app/service/lib/importar-membros";
import { uploadServiceImage, uploadServicePrivateFile } from "../app/service/lib/upload-image";
import type { Text } from "../app/service/lib/internacional/mensagens";
import type { Locale } from "../app/service/lib/internacional/contrato";
import { friendlyWriteError } from "../app/service/painel/erros";
import assert from "node:assert/strict";
import { CURRENCIES, LOCALES, currencyOrDefault, isCurrency, isLocale, localeOrDefault, requireCurrency, requireLocale } from "../app/service/lib/internacional/contrato";
import { amountForCsv, formatAmount, formatCivilDate, formatMoney, formatNumber } from "../app/service/lib/internacional/formatar";
import { loadMessages } from "../app/service/lib/internacional/catalogos";
import { bindVocabulary, createText } from "../app/service/lib/internacional/mensagens";
import { messageKey } from "../app/service/lib/internacional/chave";
import { pseudoMessage, pseudoMessages } from "../app/service/lib/internacional/pseudo";
import { parse } from "@formatjs/icu-messageformat-parser";
import { normalizarVocabulario, termoDe, vocabularioParaGravar } from "../app/service/lib/vocabulario";
import { prepareVocabulary } from "../app/service/lib/internacional/vocabulario";
import { checkCatalogs } from "./internacional/extrair";
import { checkJsxPreparation } from "./internacional/preparar-jsx.test";

for (const value of LOCALES) assert.equal(requireLocale(value), value);
for (const value of CURRENCIES) assert.equal(requireCurrency(value), value);
for (const value of [null, undefined, "", "pt", "en-GB", "constructor", "PT-BR", "../en-US"]) {
  assert.equal(isLocale(value), false);
  assert.throws(() => requireLocale(value), /invalid_locale/);
}
for (const value of [null, undefined, "", "brl", "GBP", "R$", "__proto__"]) {
  assert.equal(isCurrency(value), false);
  assert.throws(() => requireCurrency(value), /invalid_currency/);
}
assert.equal(localeOrDefault(null), "pt-BR");
assert.equal(currencyOrDefault(null), "BRL");
assert.equal(formatAmount(123456, "pt-BR"), "1.234,56");
assert.equal(formatAmount(123456, "en-US"), "1,234.56");
assert.equal(formatAmount(123456, "es-ES"), "1234,56");
assert.equal(formatNumber(1234567, "en-US"), "1,234,567");
for (const locale of LOCALES) for (const currency of CURRENCIES) {
  const expected = new Intl.NumberFormat(locale, { style: "currency", currency }).format(1234.56);
  assert.equal(formatMoney(123456, currency, locale), expected);
  assert.ok(formatMoney(0, currency, locale));
  assert.ok(formatMoney(-100_000_000_000, currency, locale));
}
for (const value of [NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER, 100_000_000_001]) {
  assert.throws(() => formatMoney(value, "BRL", "pt-BR"), /invalid_cents/);
}
assert.equal(amountForCsv(123456), "1234.56");
assert.equal(amountForCsv(-1), "-0.01");
assert.equal(formatCivilDate("2028-02-29", "pt-BR"), "29/02/2028");
assert.equal(formatCivilDate("2028-02-29", "en-US"), "02/29/2028");
for (const value of ["2027-02-29", "2026-04-31", "2026-13-01", "2026-01-01T00:00:00Z", "0000-01-01"]) {
  assert.throws(() => formatCivilDate(value, "pt-BR"), /invalid_civil_date/);
}
console.log("Internacional: locales e moedas permitidos, escrita inválida rejeitada, nove combinações monetárias, centavos inteiros e datas civis preservadas.");

async function checkFileAdapters(text: Text, locale: Locale) {
  const expected = {
    "pt-BR": { empty: "A planilha está vazia.", image: "Envie um arquivo de imagem (PNG, JPG, WebP...).", private: "Envie uma foto ou um PDF.", date: "Confira a data do evento.", warning: 'e-mail "valor{proprio}" fica de fora', limit: "A planilha tem 5.001 linhas. Importe até 5.000 por vez.", importZone: "Não foi possível carregar o fuso da igreja para importar.", duplicate: "Isso já está cadastrado." },
    "en-US": { empty: "The spreadsheet is empty.", image: "Send an image file (PNG, JPG, WebP...).", private: "Send a photo or a PDF.", date: "Check the event date.", warning: 'email "valor{proprio}" will be left out', limit: "The spreadsheet has 5,001 rows. Import up to 5,000 at a time.", importZone: "Could not load the church time zone for the import.", duplicate: "This is already registered." },
    "es-ES": { empty: "La hoja de cálculo está vacía.", image: "Envía un archivo de imagen (PNG, JPG, WebP...).", private: "Envía una foto o un PDF.", date: "Comprueba la fecha del evento.", warning: 'correo "valor{proprio}" se omitirá', limit: "La hoja tiene 5001 filas. Importa hasta 5000 cada vez.", importZone: "No se pudo cargar el huso horario de la iglesia para la importación.", duplicate: "Esto ya está registrado." },
  }[locale];
  const file = (content: string) => ({ name: "Pessoas da Família.csv", size: content.length, arrayBuffer: async () => new TextEncoder().encode(content).buffer as ArrayBuffer });
  await assert.rejects(lerArquivo(file(""), text), { message: expected.empty });
  await assert.rejects(lerArquivo(file("Nome\n" + Array(5001).fill("Pessoa local").join("\n")), text), { message: expected.limit });
  const input = "Nome;Telefone;E-mail\nMaria da Silva;11999990000;valor{proprio}";
  const parsed = await lerArquivo(file(input), text);
  assert.deepEqual(parsed, await lerArquivo(file(input)));
  const map = palpiteColunas(parsed.cabecalho);
  const row = lerLinha(parsed.linhas[0], 2, map, {}, text);
  assert.deepEqual(row.valores, lerLinha(parsed.linhas[0], 2, map).valores);
  assert.equal(row.valores.situacao, "membro");
  assert.equal(row.avisos[0], expected.warning);
  const chain = {
    select() { return chain; }, eq() { return chain; }, order() { return chain; },
    range: async () => ({ data: null, error: { code: "23505", message: "duplicate key" } }),
    single: async () => ({ data: null, error: { code: "42501", message: "permission denied" } }),
  };
  const denied = { from: () => chain } as unknown as Parameters<typeof carregarExistentes>[0];
  await assert.rejects(carregarExistentes(denied, "org", text), { message: expected.duplicate });
  await assert.rejects(gravarImportacao(denied, { organizationId: "org", churchId: "igreja", novas: [], completar: [], puladas: 0, comErro: [], colunasNovas: true, arquivo: "Dados da igreja.csv" }, text), { message: expected.importZone });
  assert.throws(() => textoIcs({ id: "local", titulo: "Culto da Família", data: "2026-02-31" }, text), { message: expected.date });
  const calendar = textoIcs({ id: "local", titulo: "Culto da Família", data: "2026-07-01", hora: "10:00", fuso: "Europe/Lisbon" }, text);
  assert.match(calendar, /DTSTART:20260701T090000Z/);
  assert.match(calendar, /SUMMARY:Culto da Família/);

  const uploaded: string[] = [];
  const storage = { storage: { from: (bucket: string) => ({
    upload: async (path: string) => { uploaded.push(`${bucket}/${path}`); return { error: null }; },
    getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.invalid/${bucket}/${path}` } }),
  }) } } as unknown as Parameters<typeof uploadServiceImage>[0];
  const invalid = { type: "text/plain", size: 1, name: "dados.txt" } as File;
  await assert.rejects(uploadServiceImage(storage, invalid, "local", text), { message: expected.image });
  await assert.rejects(uploadServicePrivateFile(storage, "privado", invalid, "local", text), { message: expected.private });
  assert.deepEqual(uploaded, []);
  const svg = { type: "image/svg+xml", size: 1, name: "igreja.svg" } as File;
  assert.equal(await uploadServiceImage(storage, svg, "org/logo.svg", text), "https://storage.invalid/service-media/org/logo.svg");
  const pdf = { type: "application/pdf", size: 1, name: "comprovante.pdf" } as File;
  assert.equal(await uploadServicePrivateFile(storage, "privado", pdf, "org/comprovante.pdf", text), "org/comprovante.pdf");
  assert.deepEqual(uploaded, ["service-media/org/logo.svg", "privado/org/comprovante.pdf"]);
}

async function messages() {
  checkJsxPreparation();
  checkCatalogs();
  const plural = "{count, plural, =0 {Nenhuma mensagem} one {# mensagem} other {# mensagens}}";
  const keys = Object.keys(await loadMessages("pt-BR")).sort();
  for (const locale of LOCALES) {
    const catalog = await loadMessages(locale);
    assert.deepEqual(Object.keys(catalog).sort(), keys);
    for (const value of Object.values(catalog)) parse(value);
    const text = createText(locale, catalog);
    await checkFileAdapters(text, locale);
    const writeMessages = {
      "pt-BR": { duplicate: "Isso já está cadastrado.", removed: "Algo que você escolheu foi apagado. Recarregue a página e tente de novo.", permission: "Você não tem permissão para fazer isso nesta igreja. Fale com quem cuida do Service da sua igreja." },
      "en-US": { duplicate: "This is already registered.", removed: "Something you selected has been deleted. Reload the page and try again.", permission: "You do not have permission to do this in this church. Contact the person who manages Service for your church." },
      "es-ES": { duplicate: "Esto ya está registrado.", removed: "Se ha eliminado algo que seleccionaste. Recarga la página e inténtalo de nuevo.", permission: "No tienes permiso para hacer esto en esta iglesia. Habla con quien gestiona Service en tu iglesia." },
    }[locale];
    assert.equal(friendlyWriteError('duplicate key value violates unique constraint "private_table"', text), writeMessages.duplicate);
    assert.equal(friendlyWriteError('insert violates foreign key constraint "private_table"', text), writeMessages.removed);
    assert.equal(friendlyWriteError('permission denied for table "private_table"', text), writeMessages.permission);
    const readMessages = {
      "pt-BR": { schema: "O app está fora do ar por alguns minutos. Tente de novo daqui a pouco.", permission: "Você não tem acesso a esta igreja. Saia e entre de novo com a conta certa." },
      "en-US": { schema: "The app is unavailable for a few minutes. Try again shortly.", permission: "You do not have access to this church. Sign out and sign back in with the correct account." },
      "es-ES": { schema: "La app no está disponible durante unos minutos. Inténtalo de nuevo dentro de poco.", permission: "No tienes acceso a esta iglesia. Cierra sesión y vuelve a entrar con la cuenta correcta." },
    }[locale];
    assert.equal(friendlyReadError("invalid schema: private_schema", text), readMessages.schema);
    assert.equal(friendlyReadError("row-level security: private_table", text), readMessages.permission);
    const churchContent = "Igreja Caminho da Paz";
    assert.ok(text("Olá, {name}.", { name: churchContent }).includes(churchContent));
    const expected = locale === "en-US" ? ["No messages", "1 message", "2 messages"] : locale === "es-ES" ? ["Ningún mensaje", "1 mensaje", "2 mensajes"] : ["Nenhuma mensagem", "1 mensagem", "2 mensagens"];
    for (const count of [0, 1, 2]) assert.equal(text(plural, { count }), expected[count]);
    assert.ok(text.rich("Leia <link>as instruções</link>.", { link: (children) => children }));
    const pseudo = pseudoMessages(catalog);
    for (const value of Object.values(pseudo)) parse(value);
    assert.ok(createText(locale, pseudo)("Olá, {name}.", { name: churchContent }).includes(churchContent));
    assert.ok(createText(locale, pseudo)(plural, { count: 2 }).includes("2"));
  }
  const original = "Uma frase longa para conferir expansão sem cortar o texto.";
  const expanded = pseudoMessage(original);
  assert.ok(expanded.length / original.length >= 1.3 && expanded.length / original.length <= 1.5);
  assert.equal(messageKey("Preferência salva."), messageKey("Prefere\u0302ncia salva."));
  const englishVocabulary = normalizarVocabulario(null, null, "en-US");
  assert.equal(termoDe(englishVocabulary, "voluntario", { plural: true }), "Volunteers");
  assert.equal(termoDe(englishVocabulary, "grupo", { plural: true }), "Groups");
  assert.deepEqual(vocabularioParaGravar(englishVocabulary, "en-US"), {});
  const existing = { culto: { tela: "Celebração do Caminho", curto: "Celebração" }, caminhada: { tela: "Journey", curto: "Journey" } };
  const custom = normalizarVocabulario(existing, null, "en-US");
  assert.equal(custom.culto.tela, "Celebração do Caminho");
  assert.deepEqual(vocabularioParaGravar(custom, "en-US", existing), existing);
  const phrase = "Próximo {Culto} em {place}.";
  const prepared = prepareVocabulary(phrase, custom);
  assert.equal(prepared.message, "Próximo {churchTerm0} em {place}.");
  const withTerms = createText("en-US", { [messageKey(phrase)]: "Next {churchTerm0} at {place}." });
  assert.equal(withTerms(phrase, { place: "Salão Português" }, custom), "Next Celebração do Caminho at Salão Português.");
  assert.equal(withTerms(phrase, { place: "Room" }), "Next Service at Room.");
  const nested = bindVocabulary(bindVocabulary(withTerms, englishVocabulary), englishVocabulary);
  assert.equal(nested(phrase, { place: "Salão Português" }, custom), "Next Celebração do Caminho at Salão Português.");
  console.log("Mensagens: três catálogos com as mesmas chaves, ICU válido, plural 0/1/2, conteúdo da igreja preservado, rich text e pseudo de 40% sem alterar argumentos.");
  console.log("Arquivos: erros por idioma, CSV/dados/IDs preservados, calendário no mesmo instante e upload simulado sem rede ou mudança de caminho.");
}
messages().catch((error) => { console.error(error); process.exitCode = 1; });
