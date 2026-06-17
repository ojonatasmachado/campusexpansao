import { HEX_TO_ACCENT } from "./accents";
import type { AccentKey } from "./accents";
import { MATERIAIS } from "./materiais-data";
import type { Colecao, Estante, Familia, Material } from "./materiais-data";
import type { Modelo } from "../components/ProdCard";
import type { DbEstante, DbMaterial } from "./types";

const CARD_MODELS = ["A", "C", "B"] as const;

export function dbEstanteToEstante(e: DbEstante): Estante {
  return {
    key: e.key,
    label: e.label,
    familia: e.familia as Familia,
    accent: HEX_TO_ACCENT[e.accent] ?? "olive",
    faixaEtaria: e.faixa_etaria,
  };
}

export function dbMaterialToMaterial(m: DbMaterial): Material {
  return {
    id: m.id,
    familia: m.familia as Familia,
    estante: m.estante,
    model: m.model as Modelo,
    etiqueta: m.etiqueta,
    titulo: m.titulo,
    code: m.code ?? undefined,
    big: m.big ?? undefined,
    bigLabel: m.big_label ?? undefined,
    promessa: m.promessa,
    meta: {
      mensagens: m.mensagens ?? undefined,
      paginas: m.paginas,
      formatos: m.formatos ?? [],
    },
    preco: m.preco,
    hotmartUrl: m.hotmart_url,
    colecoes: (m.colecoes ?? []) as Colecao[],
    praQuem: m.pra_quem,
    conteudo: m.conteudo ?? [],
    comoUsar: m.como_usar,
    faq: m.faq ?? [],
  };
}

export function materialComVisualDoCatalogo(
  material: Material,
  materialPool: Material[] = MATERIAIS,
): Material {
  const shelfMaterials = materialPool.filter((item) => item.estante === material.estante);
  const shelfIndex = Math.max(0, shelfMaterials.findIndex((item) => item.id === material.id));
  const model = CARD_MODELS[shelfIndex % CARD_MODELS.length] as Modelo;
  const big = String(material.meta.mensagens ?? material.meta.paginas);
  const bigLabel = material.meta.mensagens != null ? "mensagens" : "páginas";

  return { ...material, model, big, bigLabel };
}

export function accentFromDbEstante(estante?: DbEstante | null): AccentKey {
  if (!estante) return "olive";
  return HEX_TO_ACCENT[estante.accent] ?? "olive";
}
