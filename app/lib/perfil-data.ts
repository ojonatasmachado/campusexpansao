import type { AccentKey } from "./accents";
import { ESTANTE_MAP, MATERIAIS } from "./materiais-data";
import type { Material } from "./materiais-data";
import { materialComVisualDoCatalogo as materialComVisualDoCatalogoBase } from "./material-mappers";

export type CompraStatus = "Liberado" | "Pendente";

export type Compra = {
  id: string;
  materialId: string;
  data: string;
  status: CompraStatus;
};

export type MensagemCompra = {
  id: string;
  numero: string;
  titulo: string;
  meta: string;
  desc: string;
};

export type RecursoCompra = {
  id: string;
  titulo: string;
  meta: string;
  desc: string;
  tipo: "social" | "slides";
  status: CompraStatus;
};

export type CompraComMaterial = Compra & {
  material: Material;
  accent: AccentKey;
  materialVisual: Material;
  mensagens: MensagemCompra[];
  recursos: RecursoCompra[];
};

export const COMPRAS_PERFIL: Compra[] = [
  { id: "CX-1026", materialId: "firmes", data: "16 jun 2026", status: "Liberado" },
  { id: "CX-1027", materialId: "conferencia-lideranca", data: "16 jun 2026", status: "Liberado" },
  { id: "CX-1028", materialId: "vocacao", data: "15 jun 2026", status: "Liberado" },
];

export function materialPorId(id: string) {
  return MATERIAIS.find((material) => material.id === id);
}

export function materialComVisualDoCatalogo(material: Material): Material {
  return materialComVisualDoCatalogoBase(material, MATERIAIS);
}

function hasFormato(material: Material, formato: string) {
  return material.meta.formatos.some((item) => item.toLowerCase() === formato.toLowerCase());
}

export function formatMetaMaterial(material: Material) {
  return [
    material.meta.mensagens ? `${material.meta.mensagens} mensagens` : null,
    `${material.meta.paginas} páginas`,
    material.meta.formatos.join(" · "),
  ].filter(Boolean).join(" · ");
}

export function mensagensDaCompra(material: Material): MensagemCompra[] {
  return material.conteudo.map((item, index) => {
    const numero = String(index + 1).padStart(2, "0");
    const label = material.meta.mensagens ? "Mensagem" : "Parte";

    return {
      id: numero,
      numero,
      titulo: item,
      meta: `${label} ${numero}`,
      desc: "Abra para adaptar o roteiro, ajustar aplicações e preparar a ministração.",
    };
  });
}

export function recursosDaCompra(material: Material): RecursoCompra[] {
  const slidesLiberados = hasFormato(material, "Slides");

  return [
    {
      id: "artes-redes",
      titulo: "Artes para redes sociais",
      meta: "Feed 4:5 · Stories 9:16",
      desc: "Peças no ID visual CE.X para divulgar este material na igreja e nas redes.",
      tipo: "social",
      status: "Liberado",
    },
    {
      id: "apresentacao-slides",
      titulo: "Apresentação em slides",
      meta: slidesLiberados ? "Slides 16:9 · base do material" : "Slides 16:9 · preparar pelo roteiro",
      desc: "Base visual para projetar, ensinar e conduzir o encontro com a mesma identidade.",
      tipo: "slides",
      status: "Liberado",
    },
  ];
}

export function compraComMaterial(compra: Compra): CompraComMaterial | null {
  const material = materialPorId(compra.materialId);
  if (!material) return null;

  const accent = ESTANTE_MAP[material.estante]?.accent ?? "olive";
  return {
    ...compra,
    material,
    accent,
    materialVisual: materialComVisualDoCatalogo(material),
    mensagens: mensagensDaCompra(material),
    recursos: recursosDaCompra(material),
  };
}

export function comprasComMaterial() {
  return COMPRAS_PERFIL.map(compraComMaterial).filter(Boolean) as CompraComMaterial[];
}

export function compraPorMaterialId(materialId: string) {
  return comprasComMaterial().find((compra) => compra.material.id === materialId);
}

export function mensagemPorId(materialId: string, mensagemId: string) {
  const compra = compraPorMaterialId(materialId);
  if (!compra) return null;

  return compra.mensagens.find((mensagem) => mensagem.id === mensagemId) ?? null;
}
