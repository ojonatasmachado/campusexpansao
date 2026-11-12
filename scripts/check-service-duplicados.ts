import assert from "node:assert/strict";
import { chaveDoPar, nomeParecido, paresDuplicados } from "../app/service/lib/duplicados";

const c = (chave: string, nome: string, tel?: string, email?: string) => ({ chave, nome, telefones: [tel], emails: [email] });

/* nome parecido: igual sem acento, o curto cabe no longo com o mesmo primeiro nome */
assert.equal(nomeParecido("José Souza", "jose  souza"), true);
assert.equal(nomeParecido("Ana Souza", "Ana de Souza Lima"), true);
assert.equal(nomeParecido("Ana", "Ana Souza"), false);
assert.equal(nomeParecido("Ana Souza", "Maria Souza"), false);
assert.equal(nomeParecido("Ana Lima", "Ana Souza"), false);

/* telefone com e sem máscara, e-mail com maiúscula; o motivo mais forte vence */
const lista = [
  c("m-1", "Ana Souza", "(11) 9 1234-5678", "ana@x.com"),
  c("p-2", "Ana de Souza", "11912345678", "ANA@x.com "),
  c("m-3", "Bruno Lima", "(21) 9 1111-2222"),
  c("m-4", "Carla Dias", "+55 21 91111-2222"),
  c("m-5", "Davi Rocha", ""),
  c("m-6", "Davi Rocha", ""),
  c("m-7", "Eva Melo"),
];
const pares = paresDuplicados(lista);
assert.deepEqual(pares.map((p) => `${p.a.chave}+${p.b.chave}:${p.motivo}`), ["m-1+p-2:email", "m-3+m-4:telefone", "m-5+m-6:nome"]);

/* dispensado não volta; a chave é a mesma nas duas ordens */
assert.deepEqual(chaveDoPar("p-2", "m-1"), ["m-1", "p-2"]);
assert.equal(paresDuplicados(lista, new Set(["m-1|p-2"])).some((p) => p.a.chave === "m-1"), false);

/* telefone vazio ou inválido não junta ninguém */
assert.equal(paresDuplicados([c("a", "X Um", "000"), c("b", "Y Dois", "000")]).length, 0);

console.log("Duplicados: nome parecido, telefone com máscara, e-mail, motivo mais forte e dispensados.");
