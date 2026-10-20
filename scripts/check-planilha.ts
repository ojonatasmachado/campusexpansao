/* Confere a leitura de planilhas da importação de membros (app/service/lib/planilha.ts).
   Rodar: npx tsx scripts/check-planilha.ts */
import assert from "node:assert/strict";
import JSZip from "jszip";
import { anoDesde, arrumarNome, cep, conferir, dataBR, decodificarTexto, estadoCivil, lerArquivo, lerCsv, lerLinha, lerXlsx, palpiteColunas, sexo, situacao, uf } from "../app/service/lib/planilha";

const hoje = new Date("2026-10-20T12:00:00");
let ok = 0;
const t = (nome: string, fn: () => void | Promise<void>) => Promise.resolve(fn()).then(() => { ok++; }, (e) => { console.error(`FALHOU: ${nome}\n`, e); process.exitCode = 1; });

async function main() {
  await t("datas", () => {
    assert.equal(dataBR("05/03/1990", hoje), "1990-03-05");
    assert.equal(dataBR("5/3/90", hoje), "1990-03-05");
    assert.equal(dataBR("5/3/05", hoje), "2005-03-05");
    assert.equal(dataBR("05-03-1990", hoje), "1990-03-05");
    assert.equal(dataBR("1990-03-05", hoje), "1990-03-05");
    assert.equal(dataBR("32937", hoje), "1990-03-05");
    assert.equal(dataBR("31/02/1990", hoje), null);
    assert.equal(dataBR("01/01/2030", hoje), null);
    assert.equal(dataBR("ontem", hoje), null);
  });
  await t("campos", () => {
    assert.equal(arrumarNome("MARIA DA SILVA"), "Maria da Silva");
    assert.equal(arrumarNome("joão d'ávila"), "João D'Ávila");
    assert.equal(arrumarNome("McDonald Souza"), "McDonald Souza");
    assert.equal(sexo("F"), "feminino");
    assert.equal(sexo("Masculino"), "masculino");
    assert.equal(estadoCivil("Casada"), "casado");
    assert.equal(estadoCivil("União Estável"), "uniao_estavel");
    assert.equal(estadoCivil("viúva"), "viuvo");
    assert.equal(uf("sp"), "SP");
    assert.equal(uf("São Paulo"), "SP");
    assert.equal(uf("XX"), null);
    assert.equal(cep("1234000"), "01234-000");
    assert.equal(cep("123"), null);
    assert.equal(situacao("Visitante"), "novo");
    assert.equal(situacao("Membro ativo"), "membro");
    assert.equal(anoDesde("15/03/2015", hoje), "2015");
  });
  await t("csv com BOM, ponto e vírgula e aspas", () => {
    const tab = lerCsv('﻿Nome;Telefone;Obs\r\n"Silva; Ana";11 98765-4321;"linha\ncom quebra"\r\n;;\r\nBeto;;"diz ""oi"""\r\n');
    assert.deepEqual(tab.cabecalho, ["Nome", "Telefone", "Obs"]);
    assert.equal(tab.linhas.length, 2);
    assert.equal(tab.linhas[0][0], "Silva; Ana");
    assert.equal(tab.linhas[0][2], "linha\ncom quebra");
    assert.equal(tab.linhas[1][2], 'diz "oi"');
  });
  await t("csv ANSI do Excel", () => {
    const bytes = new Uint8Array([0x4e, 0x6f, 0x6d, 0x65, 0x0a, 0x4a, 0x6f, 0xe3, 0x6f]); // "Nome\nJoão" em Windows-1252
    assert.equal(lerCsv(decodificarTexto(bytes.buffer)).linhas[0][0], "João");
  });
  await t("palpite de colunas", () => {
    const m = palpiteColunas(["Nome completo", "Celular/WhatsApp", "E-mail", "Data de Nascimento", "Gênero", "Estado Civil", "Endereço", "Bairro", "Município", "UF", "CEP", "Status", "Membro desde", "Observação"]);
    assert.deepEqual(m, ["nome", "telefone", "email", "nascimento", "sexo", "estadoCivil", "rua", "bairro", "cidade", "estado", "cep", "situacao", "membroDesde", ""]);
  });
  await t("linha, DDD padrão e avisos", () => {
    const mapa = palpiteColunas(["Nome", "Telefone", "Email", "Nascimento"]);
    const a = lerLinha(["ANA PAULA", "98765-4321", "ANA@X.COM", "31/02/1990"], 2, mapa, { ddd: "51", hoje });
    assert.equal(a.valores.nome, "Ana Paula");
    assert.equal(a.valores.telefone, "(51) 98765-4321");
    assert.equal(a.valores.email, "ana@x.com");
    assert.equal(a.valores.nascimento, null);
    assert.equal(a.avisos.length, 1);
    const b = lerLinha(["", "11987654321", "", ""], 3, mapa, { hoje });
    assert.equal(b.erro, "sem nome");
    const c = lerLinha(["Caio", "+55 (11) 9 8765-4321", "nao-email", ""], 4, mapa, { hoje });
    assert.equal(c.valores.telefone, "(11) 98765-4321");
    assert.equal(c.valores.email, null);
  });
  await t("duplicados", () => {
    const mapa = palpiteColunas(["Nome", "Telefone", "Email", "Nascimento"]);
    const linhas = [
      lerLinha(["Ana", "(11) 98765-4321", "", ""], 2, mapa, { hoje }),
      lerLinha(["Bia", "", "bia@x.com", ""], 3, mapa, { hoje }),
      lerLinha(["Caio Souza", "", "", "01/01/1980"], 4, mapa, { hoje }),
      lerLinha(["Dani", "11 98888-7777", "", ""], 5, mapa, { hoje }),
      lerLinha(["Daniela", "11988887777", "", ""], 6, mapa, { hoje }),
    ];
    const r = conferir(linhas, [
      { id: "1", name: "Ana Lima", phone: "(11) 98765-4321", email: null, birth: null },
      { id: "2", name: "Beatriz", phone: null, email: "BIA@x.com", birth: null },
      { id: "3", name: "CAIO SOUZA", phone: null, email: null, birth: "1980-01-01" },
    ]);
    assert.equal(r[0].existente?.motivo, "telefone");
    assert.equal(r[1].existente?.motivo, "e-mail");
    assert.equal(r[2].existente?.motivo, "nome e nascimento");
    assert.equal(r[3].existente, null);
    assert.equal(r[4].repeteLinha, 5);
  });
  await t("linha sem chave forte compara pelo nome", () => {
    const mapa = palpiteColunas(["Nome", "Telefone", "Email", "Nascimento"]);
    const linhas = [
      lerLinha(["Eva Rocha", "", "", "sem data"], 2, mapa, { hoje }),
      lerLinha(["Ivo Mota", "", "", ""], 3, mapa, { hoje }),
      lerLinha(["IVO MOTA", "", "", ""], 4, mapa, { hoje }),
      lerLinha(["Eva Rocha", "(11) 91111-2222", "", ""], 5, mapa, { hoje }),
    ];
    const r = conferir(linhas, [{ id: "9", name: "Eva  Rocha", phone: null, email: null, birth: null }]);
    assert.equal(r[0].existente?.motivo, "nome");
    assert.equal(r[1].existente, null);
    assert.equal(r[2].repeteLinha, 3);
    assert.equal(r[3].existente, null, "com telefone, só o telefone decide");
  });
  await t("xlsx", async () => {
    const zip = new JSZip();
    zip.file("xl/workbook.xml", '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Membros" sheetId="1" r:id="rId1"/></sheets></workbook>');
    zip.file("xl/_rels/workbook.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="worksheet" Target="worksheets/aba.xml"/></Relationships>');
    zip.file("xl/sharedStrings.xml", '<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Nome</t></si><si><t>Nascimento</t></si><si><r><t>José </t></r><r><t>Ávila</t></r></si></sst>');
    zip.file("xl/worksheets/aba.xml", '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1" t="s"><v>1</v></c></row><row r="2"><c r="A2" t="s"><v>2</v></c><c r="C2"><v>32937</v></c></row><row r="4"><c r="A4" t="inlineStr"><is><t>Lia</t></is></c></row></sheetData></worksheet>');
    const buf = await zip.generateAsync({ type: "arraybuffer" });
    const tab = await lerXlsx(buf);
    assert.deepEqual(tab.cabecalho, ["Nome", "Coluna 2", "Nascimento"]);
    assert.equal(tab.linhas.length, 2);
    assert.equal(tab.linhas[0][0], "José Ávila");
    const l = lerLinha(tab.linhas[0], 2, palpiteColunas(tab.cabecalho), { hoje });
    assert.equal(l.valores.nascimento, "1990-03-05");
    const lido = await lerArquivo({ name: "x.xlsx", size: buf.byteLength, arrayBuffer: async () => buf });
    assert.equal(lido.linhas[1][0], "Lia");
  });
  await t("arquivo recusado", async () => {
    await assert.rejects(lerArquivo({ name: "a.xls", size: 10, arrayBuffer: async () => new ArrayBuffer(1) }), /salve como/);
    const so = new TextEncoder().encode("Nome;Telefone\n").buffer;
    await assert.rejects(lerArquivo({ name: "a.csv", size: so.byteLength, arrayBuffer: async () => so }), /só tem o cabeçalho/);
  });
  console.log(`${ok} grupos ok`);
}
void main();
