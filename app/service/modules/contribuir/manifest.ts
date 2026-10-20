/* Contribuir: dízimo e oferta por Pix no app do membro.
   Mora na Caminhada (lei 2: generosidade é prática de quem cresce). A igreja
   cadastra a chave em Configurações; sem chave, a entrada não aparece (lei 6).
   Não registra valor nem quem deu (lei 10): é só a porta para o Pix. */
import { defineModule } from "../define";

export default defineModule({
  id: "contribuir",
  liga: true,
  permissoes: ["igreja"],
  membro: {
    visivel: true,
    lugares: ["caminhada.secoes"],
    telas: [{ id: "contribuir", aba: "caminhada", titulo: "Contribuir" }],
  },
  painel: {
    config: [{ id: "contribuir", rotulo: "Contribuir", grupo: "Igreja", sub: "Chave Pix para dízimo e oferta", ordem: 25 }],
  },
  vocabulario: ["caminhada"],
});
