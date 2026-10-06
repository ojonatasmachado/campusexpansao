/* Dados da igreja, personalização e congregações. Parte da casca. */
import { defineModule } from "../define";

export default defineModule({
  id: "igreja",
  liga: true,
  essencial: true,
  permissoes: ["permissoes"],
  membro: {
    visivel: false,
    lugares: ["painel.config"],
  },
  painel: {
    rotas: [
      { rota: "config", grupo: "Configurações", permissao: "permissoes" },
    ],
    config: [
      { id: "igreja", rotulo: "Dados da igreja", grupo: "Igreja", sub: "Nome, endereço e contato", ordem: 10 },
      { id: "visual", rotulo: "Personalização", grupo: "Igreja", sub: "Logo, cor e fundos do app", ordem: 20 },
      { id: "rede", rotulo: "Congregações", grupo: "Igreja", sub: "Matriz e outras unidades", ordem: 30 },
    ],
  },
});
