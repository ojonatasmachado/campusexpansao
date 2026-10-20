/* Secretaria: livros de registro (batismo, casamento, apresentação de
   crianças, rol de membros) e carteirinha de membro. Os livros de batismo e
   rol nascem dos fatos e das fichas (0078); casamento e apresentação são
   lançados aqui. Quem usa: master e pastor (matriz) e quem recebeu a
   liberação "secretaria". A verificação da carteirinha é pública e mínima. */
import { defineModule } from "../define";

export default defineModule({
  id: "secretaria",
  liga: true,
  permissoes: ["secretaria"],
  painel: {
    menu: [
      { rota: "secretaria", grupo: "Gestão", rotulo: "Secretaria", icone: "documento", ordem: 74, permissao: "secretaria", papeis: ["master", "pastor"], acessos: ["secretaria"] },
    ],
  },
  rotas: [{ caminho: "/service/carteirinha/[codigo]", tipo: "qr" }],
});
