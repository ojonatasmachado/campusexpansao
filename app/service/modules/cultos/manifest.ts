/* Cultos e eventos da agenda. */
import { defineModule } from "../define";

export default defineModule({
  id: "cultos",
  liga: true,
  permissoes: ["cultos"],
  membro: {
    visivel: true,
    lugares: ["agenda.igreja", "inicio.igreja"],
  },
  painel: {
    menu: [
      { rota: "cultos", grupo: "Agenda", rotulo: "{Cultos} e eventos", icone: "cultos", ordem: 40, permissao: "cultos" },
    ],
  },
  vocabulario: ["culto"],
  densidade: [
    {
      tela: "Panorama do culto",
      tamanho: "1366×860",
      medido: { palavras: 104, acoes: 18, sobreposicoes: 0 },
      limite: { palavras: 100, acoes: 25, sobreposicoes: 0 },
      motivo: "Os 12 times com cobertura parcial exigem uma linha por função; reduzir ocultaria vagas abertas que precisam de ação imediata antes do culto.",
    },
    {
      tela: "Panorama do culto",
      tamanho: "390×844",
      medido: { palavras: 90, acoes: 12, sobreposicoes: 0 },
      limite: { palavras: 80, acoes: 12, sobreposicoes: 0 },
      motivo: "O Panorama lista os 12 times com cobertura parcial em linhas individuais; reduzir ocultaria vagas abertas que precisam de ação imediata antes do culto no celular.",
    },
  ],
});
