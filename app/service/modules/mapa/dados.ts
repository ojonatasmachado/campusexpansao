import { createServiceBrowserClient } from "../../lib/supabase-browser";

/* Tudo que o mapa da liderança lê passa por funções do servidor (0090, 0091):
   recorte da área, consentimento e arredondamento são aplicados lá. */

export type Acesso = { pode: boolean; total: boolean; area_id: string | null; detalhe: "pessoas" | "numeros" | null; pode_mesa: boolean; pode_csv: boolean; pode_editar: boolean };
export type PessoaMapa = { id: string | null; nome: string | null; situacao: string; grupo_id: string | null; grupo: string | null; latitude: number; longitude: number; anonimo: boolean; desde: string | null };
export type LocalMapa = {
  tipo: "sede" | "congregacao" | "grupo"; id: string; nome: string; dia: string | null; hora: string | null;
  rua: string | null; numero: string | null; complemento: string | null; bairro: string | null; cidade: string | null;
  latitude: number | null; longitude: number | null; lider_nome: string | null; lider_member_id: string | null; lugares: number | null; ocupados: number | null;
};
export type Leitura = "falta" | "forte" | "media";
export type Regiao = { codigo: string; nome: string; moradores: number; area_km2: number; pessoas: number; grupos: number; um_a_cada: number | null; leitura: Leitura; vezes: number | null; geojson: GeoJSON.Geometry };
export type Cidade = { municipios: string[]; tem_ibge: boolean; tem_bairros: boolean; moradores: number; pessoas: number; um_a_cada: number | null };
export type Totais = { pessoas: number; com_ponto: number; com_nome: number; sem_grupo: number };
export type CorArea = "sand" | "wheat" | "amber" | "clay" | "terra" | "rust" | "cocoa" | "olive";
export type Area = { id: string; nome: string; tipo: "setor" | "regiao" | "alcance"; cor: CorArea; responsavel_id: string | null; responsavel: string | null; bairros: string[]; geojson: GeoJSON.Geometry };

const db = () => createServiceBrowserClient().schema("service");

async function rpc<T>(nome: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(nome, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export const carregarAcesso = async (org: string) => (await rpc<Acesso[]>("mapa_acesso", { p_org: org }))[0];
export const carregarPessoas = (org: string) => rpc<PessoaMapa[]>("mapa_pessoas", { p_org: org });
export const carregarLocais = (org: string) => rpc<LocalMapa[]>("mapa_locais_publicos", { p_org: org });
export const carregarTotais = async (org: string) => (await rpc<Totais[]>("mapa_totais", { p_org: org }))[0];
export const carregarCidade = async (org: string) => (await rpc<Cidade[]>("mapa_cidade", { p_org: org }))[0];
export const carregarRegioes = (org: string, nivel: "bairro" | "setor" | "area") => rpc<Regiao[]>("mapa_regioes", { p_org: org, p_nivel: nivel });
export const carregarAreas = (org: string) => rpc<Area[]>("mapa_areas", { p_org: org });
export const previaArea = async (org: string, bairros: string[], geojson: GeoJSON.Geometry | null) =>
  (await rpc<{ pessoas: number; moradores: number; grupos: number }[]>("mapa_area_previa", { p_org: org, p_bairros: bairros, p_geojson: geojson }))[0];
export const salvarArea = (org: string, a: { id?: string | null; nome: string; tipo: Area["tipo"]; cor: CorArea; responsavel_id: string | null; bairros: string[]; geojson: GeoJSON.Geometry | null }) =>
  rpc<string>("mapa_salvar_area", { p_org: org, p_id: a.id ?? null, p_nome: a.nome, p_tipo: a.tipo, p_cor: a.cor, p_responsavel: a.responsavel_id, p_bairros: a.bairros, p_geojson: a.geojson });
export const apagarArea = async (id: string) => { const { error } = await db().from("map_areas").delete().eq("id", id); if (error) throw new Error(error.message); };

export const CORES_AREA: CorArea[] = ["sand", "wheat", "amber", "clay", "terra", "rust", "cocoa", "olive"];
export const NOME_COR: Record<CorArea, string> = { sand: "Areia", wheat: "Trigo", amber: "Âmbar", clay: "Barro", terra: "Terracota", rust: "Ferrugem", cocoa: "Cacau", olive: "Oliva" };
