// Execução tolerante a falhas: um passo quebrado vira bloqueio e a captura segue.
import { registrarBloqueio } from "./print.mjs";

export async function tentar(chave, info, fn) {
  try {
    return await fn();
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n")[0].slice(0, 300);
    registrarBloqueio(chave, { tela: info.tela, passo: info.passo ?? "-", erro: msg, print: null });
    return null;
  }
}
export const APARELHOS_LISTA = ["celular", "desktop"];
