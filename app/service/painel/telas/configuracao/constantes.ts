import type { GruposCfg, StatusCriterios } from "../../tipos";

export const STATUS_CFG_DEFAULT: StatusCriterios = { recusasInativando: 2, recusasInativo: 4, diasIndispInativo: 30, considerarFerias: false };

export const GRUPOS_CFG_DEFAULT: GruposCfg = { ativo: true, termo: "Grupos de Comunhão", termoP: "Grupo de Comunhão", sigla: "GC" };


export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];



/* telas extras liberáveis pessoa a pessoa, além do que o papel já dá
   (Configurações → Acessos por pessoa). Só rotas que já têm entrada real
   no menu lateral. */
export const ACESSO_ROTAS: { id: string; label: string }[] = [
  { id: "painel", label: "Início" },
  { id: "membros", label: "Pessoas" },
  { id: "pessoas", label: "{Voluntarios}" },
  { id: "times", label: "Times" },
  { id: "visitantes", label: "Visitantes" },
  { id: "batismos", label: "Batismos" },
  { id: "cursos", label: "Cursos e trilhas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "secretaria", label: "Secretaria" },
  { id: "marca", label: "Personalização (cor e logo)" },
  { id: "pesquisas", label: "Pesquisas" },
  { id: "oracao", label: "Pedidos de oração" },
];



export const TAG_CORES = [
  { v: "olive", l: "Oliva" },
  { v: "wheat", l: "Trigo" },
  { v: "clay", l: "Argila" },
  { v: "terra", l: "Terracota" },
  { v: "sand", l: "Areia" },
  { v: "amber", l: "Âmbar" },
  { v: "rust", l: "Ferrugem" },
];
