// Catálogo de telas do painel (ordem do NAV_GROUPS em ServiceExactApp.tsx) e mapa para os prints de 02/10.
import { existsSync } from "node:fs";
import { join } from "node:path";
import { ANTES_DIR } from "./config.mjs";

const SA = "app/service/ServiceExactApp.tsx";
// id = data-tour do menu; nome = slug do arquivo; h1 = texto esperado (regex, sem acento/caixa)
export const TELAS = [
  { n: 1, id: "painel", nome: "inicio", label: "Início", grupo: "Início", h1: /^(bom dia|boa tarde|boa noite)/, comp: `${SA}:2097 (Painel)`, antes: ["05-painel-painel"] },
  { n: 2, id: "membros", nome: "pessoas", label: "Pessoas", grupo: "Pessoas", h1: /^pessoas$/, comp: `${SA}:2457 (Membros)`, antes: ["06-painel-membros", "07-painel-voluntarios"] },
  { n: 3, id: "visitantes", nome: "visitantes", label: "Visitantes", grupo: "Pessoas", h1: /^visitantes$/, comp: `${SA}:3505 (Visitantes)`, antes: ["09-painel-visitantes"] },
  { n: 4, id: "criancas", nome: "criancas", label: "Crianças", grupo: "Pessoas", h1: /^criancas$/, comp: `${SA}:4728 (Criancas)`, antes: ["10-painel-criancas"] },
  { n: 5, id: "grupos", nome: "grupos", label: "Grupos", grupo: "Pessoas", h1: /^grupos$/, comp: `${SA}:8000 (Config only=grupos)`, antes: ["24-config-grupos"] },
  { n: 6, id: "times", nome: "times", label: "Times", grupo: "Ministério", h1: /^times$/, comp: `${SA}:2608 (Times + Config only=min)`, antes: ["08-painel-times-e-ministerios", "22-config-ministerios-e-funcoes"] },
  { n: 7, id: "escalas", nome: "escalas", label: "Escalas", grupo: "Ministério", h1: /^escalas por evento$/, comp: `${SA}:2892 (Escalas)`, antes: ["13-painel-escalas"] },
  { n: 8, id: "ensaios", nome: "ensaios", label: "Ensaios", grupo: "Ministério", h1: /^ensaios$/, comp: `${SA}:3886 (Ensaios)`, antes: ["15-painel-ensaios"] },
  { n: 9, id: "reunioes", nome: "reunioes", label: "Reuniões", grupo: "Ministério", h1: /^reunioes$/, comp: `${SA}:3843 (Reunioes)`, antes: ["14-painel-reunioes"] },
  { n: 10, id: "cultos", nome: "cultos-e-eventos", label: "Cultos e eventos", grupo: "Agenda", h1: /^cultos e agenda$/, comp: `${SA}:3271 (Cultos)`, antes: ["17-painel-cultos-e-agenda"] },
  { n: 11, id: "espacos", nome: "espacos-e-salas", label: "Espaços e salas", grupo: "Agenda", h1: /^espacos e reservas$/, comp: `${SA}:4616 (Espacos)`, antes: ["25-config-espacos-e-salas"] },
  { n: 12, id: "comunicacao", nome: "mural", label: "Mural", grupo: "Comunicação", h1: /^mural$/, comp: `${SA}:4418 (Comunicacao)`, antes: ["18-painel-comunicacao"] },
  { n: 13, id: "conversas", nome: "conversas", label: "Conversas", grupo: "Comunicação", h1: /^conversas$/, comp: `${SA}:6225 (Conversas)`, antes: ["19-painel-conversas"] },
  { n: 14, id: "pesquisas", nome: "pesquisas", label: "Pesquisas", grupo: "Comunicação", h1: /^pesquisas$/, comp: `${SA}:6983 (PesquisasView)`, antes: ["29-config-pesquisas"] },
  { n: 15, id: "pagina", nome: "pagina-da-igreja", label: "Página da igreja", grupo: "Comunicação", h1: /^pagina da igreja$/, comp: "app/service/PublicPageEditor.tsx", antes: ["31-config-pagina-publica"] },
  { n: 16, id: "cursos", nome: "cursos-e-trilhas", label: "Cursos e trilhas", grupo: "Formação", h1: /^cursos e trilhas$/, comp: `${SA}:5282 (CursosTrilhas)`, antes: ["12-painel-cursos-e-trilhas"] },
  { n: 17, id: "batismos", nome: "batismos", label: "Batismos", grupo: "Formação", h1: /^batismos$/, comp: `${SA}:5184 (Batismos)`, antes: ["11-painel-batismos"] },
  { n: 18, id: "relatorios", nome: "relatorios", label: "Relatórios", grupo: "Gestão", h1: /^relatorios e indicadores$/, comp: `${SA}:6334 (Relatorios)`, antes: ["20-painel-relatorios"] },
  { n: 19, id: "quadros", nome: "quadros", label: "Quadros", grupo: "Gestão", h1: /^quadros de tarefas$/, comp: `${SA}:5998 (Quadros)`, antes: ["16-painel-quadros"] },
  { n: 20, id: "identidade", nome: "identidade-e-proposito", label: "Identidade e propósito", grupo: "Gestão", h1: /^identidade e proposito$/, comp: `${SA}:8490 (Identidade)`, antes: ["33-painel-identidade-e-proposito"] },
  { n: 21, id: "historia", nome: "nossa-historia", label: "Nossa história", grupo: "Gestão", h1: /^nossa historia$/, comp: `${SA}:8586 (Historia)`, antes: ["34-painel-nossa-historia"] },
  { n: 22, id: "config", nome: "configuracoes", label: "Configurações", grupo: "Configurações", h1: /^configuracoes$/, comp: `${SA}:7484 (Config)`, antes: ["21-painel-configuracoes"] },
];
export const tela = (id) => TELAS.find((t) => t.id === id);

export const CFG_TABS = [
  { n: 23, id: "igreja", nome: "config-dados-da-igreja", label: "Dados da igreja", comp: `${SA}:7812 (Config tab igreja)`, antes: ["21-painel-configuracoes"] },
  { n: 24, id: "visual", nome: "config-personalizacao", label: "Personalização", comp: `${SA}:8275 (Config tab visual)`, antes: ["30-config-personalizacao"] },
  { n: 25, id: "rede", nome: "config-congregacoes", label: "Congregações", comp: `${SA}:8345 (Config tab rede)`, antes: ["32-config-congregacoes"] },
  { n: 26, id: "operacao", nome: "config-escala-e-presenca", label: "Escala e presença", comp: `${SA}:8059 (Config tab operacao)`, antes: ["23-config-escala-e-presenca"] },
  { n: 27, id: "kids", nome: "config-turmas-kids", label: "Turmas Kids", comp: `${SA}:8052 (Config tab kids)`, antes: ["26-config-turmas-kids"] },
  { n: 28, id: "perm", nome: "config-permissoes", label: "Permissões", comp: `${SA}:8195 (Config tab perm)`, antes: ["27-config-permissoes"] },
  { n: 29, id: "acessos", nome: "config-acessos-por-pessoa", label: "Acessos por pessoa", comp: `${SA}:8270 (Config tab acessos)`, antes: ["28-config-acessos-por-pessoa"] },
];

/** Arquivos de 02/10 equivalentes, para o aparelho dado (null se nenhum existe). */
export function antes(aparelho, ids) {
  if (!ids) return null;
  const achados = ids.map((i) => `${aparelho}-${i}.png`).filter((f) => existsSync(join(ANTES_DIR, f))).map((f) => `service-2026-10-02/${f}`);
  return achados.length ? achados : null;
}

export const ANTES_APP = {
  inicio: ["35-app-membro-inicio"],
  agenda: ["36-app-membro-escala", "37-app-membro-tarefas"],
  mensagens: ["38-app-membro-chat"],
  caminhada: ["39-app-membro-cursos"],
  perfil: ["40-app-membro-perfil"],
};
export const ANTES_ENTRADA = {
  login: ["01-entrada-login-gestao"], igreja: ["02-entrada-login-igreja"], convite: ["03-entrada-convite-expirado"], senha: ["04-entrada-senha-nova-link-invalido"],
};
