import assert from "node:assert/strict";
import { formatarTelefone, mesmoTelefone, telefoneParaGravar, telefoneParaWhatsapp, telefoneValido, variacoesTelefone } from "../app/service/lib/telefone";
for (const n of ["11980001000", "(11) 98000-1000", "+55 11 98000-1000", "5511980001000", "011980001000"]) {
  assert.equal(telefoneParaWhatsapp(n), "5511980001000");
  assert.equal(formatarTelefone(n), "(11) 98000-1000");
  assert.equal(mesmoTelefone(n, "11980001000"), true);
}
for (const [n, wa] of [["+1 202 555 0123", "12025550123"], ["+351 912 345 678", "351912345678"], ["+39 06 6982", "39066982"], ["+44 (20) 7946-0958", "442079460958"]]) {
  assert.equal(telefoneParaGravar(n), n);
  assert.equal(telefoneParaWhatsapp(n), wa);
  assert.equal(mesmoTelefone(n, `+${wa}`), true);
  assert.ok(!variacoesTelefone(n).includes(`55${wa}`));
}
assert.equal(mesmoTelefone("+1 2025550123", "12025550123"), false, "país explícito não colide com legado nacional");
for (const n of ["", "+", "++12025550123", "+0123456789", "+1234567890123456", "+123", "ligue 11980001000", "123"]) assert.equal(telefoneValido(n), false, n);
assert.equal(telefoneValido("+123456789012345"), true, "limite estrutural de 15 dígitos");
console.log("Telefone: legado BR, países explícitos, zero nacional preservado, colisões e limites verificados.");
