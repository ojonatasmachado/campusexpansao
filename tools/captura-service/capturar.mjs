#!/usr/bin/env node
// Ferramenta de captura do Service. Uso (dentro de tools/captura-service):
//   node capturar.mjs                      roda todos os grupos da etapa 1
//   node capturar.mjs --so=entrada,painel  só estes grupos (entrada, painel, estados, lider, membro; jornadas e temas: etapas seguintes)
//   node capturar.mjs --ap=celular         só um aparelho (celular|desktop)
//   node capturar.mjs --so=jornadas [--j=M2,L1] [--ap=celular]   jornadas da etapa 2 (L2 = L2a,L2b; ordem obrigatória interna)
//   node capturar.mjs --docs               só regenera MAPA.md / RELATORIO.md a partir do manifest
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAIDA } from "./lib/config.mjs";
import { APARELHOS_LISTA } from "./lib/runner.mjs";
import { prepararSaida } from "./lib/print.mjs";
import { fecharNavegador } from "./lib/contexto.mjs";
import { gerarDocs } from "./lib/docs.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => { const [k, v] = a.replace(/^--/, "").split("="); return [k, v ?? true]; }));
const GRUPOS = { entrada: "./grupos/entrada.mjs", painel: "./grupos/painel.mjs", estados: "./grupos/estados.mjs", lider: "./grupos/lider.mjs", membro: "./grupos/membro.mjs", jornadas: "./grupos/jornadas.mjs", temas: "./grupos/temas.mjs" };
// As jornadas precisam das publicações ainda não lidas pela Maria. A galeria
// de telas do membro vem depois, pois abrir o Mural registra a leitura.
const ETAPA1 = ["entrada", "jornadas", "painel", "estados", "lider", "membro"];
let erros = 0;

const so = args.so ? String(args.so).split(",") : ETAPA1;
const aparelhos = args.ap ? [args.ap] : APARELHOS_LISTA;
if (aparelhos.some((a) => !APARELHOS_LISTA.includes(a))) throw new Error("Aparelho inválido; use celular ou desktop");
prepararSaida();
if (!args.docs) {
  for (const g of so) {
    if (!GRUPOS[g]) { console.error(`grupo desconhecido: ${g}`); erros++; continue; }
    console.log(`\n== ${g} ==`);
    let mod;
    try { mod = await import(GRUPOS[g]); } catch (e) { console.error(`grupo ${g} indisponível: ${e.message}`); erros++; continue; }
    if (g === "jornadas" || g === "temas") { // este grupo controla a própria ordem entre aparelhos
      try { await mod.rodar({ aparelhos, args }); } catch (e) { console.error(`grupo ${g} interrompido: ${String(e.message).split("\n")[0]}`); erros++; }
      continue;
    }
    for (const ap of aparelhos) {
      try { await mod.rodar({ aparelhos: [ap], args }); } catch (e) { console.error(`grupo ${g}/${ap} interrompido: ${String(e.message).split("\n")[0]}`); erros++; }
    }
  }
}
await fecharNavegador();
gerarDocs();

if (!args.docs) {
  const ler = (nome) => existsSync(join(SAIDA, nome)) ? JSON.parse(readFileSync(join(SAIDA, nome), "utf8")) : {};
  const bloqueios = Object.values(ler(".bloqueios.json"));
  const jornadas = ler(".jornadas.json");
  const esperadas = args.j ? String(args.j).split(",").flatMap((id) => id === "L2" ? ["L2a", "L2b"] : [id]) : ["L1", "L2a", "L2b", ...Array.from({length: 8}, (_, i) => `L${i+3}`), ...Array.from({length: 11}, (_, i) => `M${i+1}`)];
  const ausentes = [];
  if (so.includes("jornadas")) for (const id of esperadas) {
    for (const ap of id.startsWith("M") ? aparelhos.filter((a) => a === "celular") : aparelhos) {
      if (jornadas[`${id}-${ap}`]?.situacao !== "completa") ausentes.push(`${id}-${ap}`);
    }
  }
  const resumo = { erros, falhas: bloqueios.length, jornadasIncompletas: ausentes, sucesso: erros === 0 && bloqueios.length === 0 && ausentes.length === 0 };
  writeFileSync(join(SAIDA, "resultado.json"), JSON.stringify(resumo, null, 2) + "\n");
  console.log(JSON.stringify(resumo));
  if (!resumo.sucesso) process.exitCode = 1;
}
