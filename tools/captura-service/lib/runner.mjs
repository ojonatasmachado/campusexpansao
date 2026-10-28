// Execução tolerante a falhas: um passo quebrado vira bloqueio e a captura segue.
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAIDA } from "./config.mjs";
import { registrarBloqueio, capturarFalha } from "./print.mjs";

export async function tentar(chave, info, fn) {
  try {
    return await fn();
  } catch (e) {
    const detalhe = String(e?.message ?? e).replace(/eyJ[\w.-]+/g, "[token omitido]");
    const msg = detalhe.split("\n")[0].slice(0, 300);
    let print = null;
    if (info.page && !info.page.isClosed()) {
      print = `falhas/${chave}`;
      await capturarFalha(info.page, print);
      writeFileSync(join(SAIDA, print.replace(/\.png$/, ".erro.txt")), detalhe, { mode: 0o600 });
    }
    registrarBloqueio(chave, { tela: info.tela, passo: info.passo ?? "-", erro: msg, print });
    return null;
  }
}
export const APARELHOS_LISTA = ["celular", "desktop"];
