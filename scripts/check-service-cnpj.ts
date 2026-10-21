import assert from "node:assert/strict";
import { cnpjValido, normalizarCnpj, formatarCnpj } from "../app/service/lib/cnpj";
for (const c of ["19.131.243/0001-97", "12.ABC.345/01DE-35", "00.000.000/E08G-12", "12.abc.345/01de-35"]) assert.equal(cnpjValido(c), true, c);
for (const c of ["", "00000000000000", "12ABC34501DE00", "12ABC34501DE3A", "19131243000198"]) assert.equal(cnpjValido(c), false, c);
assert.equal(normalizarCnpj("12.abc.345/01de-35"), "12ABC34501DE35");
assert.equal(formatarCnpj("12abc34501de35"), "12.ABC.345/01DE-35");
assert.equal(formatarCnpj("19131243000197"), "19.131.243/0001-97");
console.log("CNPJ: exemplos oficiais numérico e alfanuméricos, maiúsculas, máscara e DVs inválidos.");
