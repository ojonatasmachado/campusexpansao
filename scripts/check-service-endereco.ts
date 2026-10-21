import assert from "node:assert/strict";
import { enderecoNoBrasil, regiaoInformada } from "../app/service/lib/endereco";
assert.equal(enderecoNoBrasil(null), true, "compatibilidade das fichas brasileiras legadas");
assert.equal(regiaoInformada({ country: "Brasil", postalCode: "01001-000" }), true);
assert.equal(regiaoInformada({ country: "Brasil", postalCode: "123" }), false);
assert.equal(regiaoInformada({ country: "Portugal", city: "Lisboa", postalCode: "1000-001" }), true);
assert.equal(regiaoInformada({ country: "Canadá", city: "Ottawa", postalCode: "K1A 0B1" }), true);
assert.equal(regiaoInformada({ country: "Portugal", city: "" }), false);
console.log("Região: CEP brasileiro obrigatório, compatibilidade legada e cidade internacional sem exigir CEP brasileiro.");
