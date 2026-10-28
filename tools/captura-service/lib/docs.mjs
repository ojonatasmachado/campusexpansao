// MAPA.md, MUDANCAS.md (só se não existir) e RELATORIO.md a partir do manifest.
import { existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAIDA } from "./config.mjs";
import { lerManifest } from "./print.mjs";

export function gerarDocs() {
  const m = Object.values(lerManifest());
  const png = m.filter((e) => e.tipo !== "dialogo_nativo");
  const pasta = (e) => e.arquivo.split("/")[0];
  const por = {};
  for (const e of m) por[pasta(e)] = (por[pasta(e)] ?? 0) + 1;
  const linhas = ["# MAPA das capturas", "", `Gerado de manifest.json. Total de entradas: ${m.length}.`, "", "| arquivo | aparelho | conta | tela | estado | jornada/passo | componente | antes (02/10) |", "|---|---|---|---|---|---|---|---|"];
  for (const e of m.sort((a, b) => a.arquivo.localeCompare(b.arquivo))) {
    linhas.push(`| ${e.arquivo} | ${e.aparelho ?? ""} | ${e.conta ?? ""} | ${e.tela ?? ""} | ${e.estado ?? ""} | ${[e.jornada, e.passo].filter(Boolean).join(" / ")} | ${e.componente ?? ""} | ${(e.antes_0210 ?? []).join(", ")} |`);
  }
  writeFileSync(join(SAIDA, "MAPA.md"), linhas.join("\n") + "\n");
  if (!existsSync(join(SAIDA, "MUDANCAS.md"))) {
    writeFileSync(join(SAIDA, "MUDANCAS.md"), "# Mudanças feitas durante a captura\n\nO código do produto não é alterado. A galeria abre formulários sem salvar e descarta mudanças locais ao navegar. As jornadas autenticadas gravam suas ações nas fixtures (publicações, respostas, cadastros e preferências); consulte JORNADAS.md para cada passo. Confirmações nativas são recusadas, exceto a saída sem salvar e as confirmações explicitamente solicitadas pela jornada. No modo isolado, banco e sessões são descartados ao terminar.\n");
  }
  const falhas = png.filter((e) => e.truncada).length;
  const rel = ["# RELATORIO", "", "Imagens por pasta:", ...Object.entries(por).map(([k, v]) => `- ${k}: ${v}`), "", `Capturas truncadas por limite de altura: ${falhas}`, "", "Veja BLOQUEIOS.md para falhas e itens inexistentes."];
  writeFileSync(join(SAIDA, "RELATORIO.md"), rel.join("\n") + "\n");
}
