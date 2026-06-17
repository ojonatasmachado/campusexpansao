import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import Nav from "../../../../components/Nav";
import Footer from "../../../../components/Footer";
import { ACCENTS } from "../../../../lib/accents";
import { compraPorMaterialId, comprasComMaterial } from "../../../../lib/perfil-data";
import { CreativeEditor } from "../../../_components/CreativeEditor";

const TIPOS = ["artes", "slides"] as const;
type TipoEditor = (typeof TIPOS)[number];

function isTipoEditor(tipo: string): tipo is TipoEditor {
  return TIPOS.includes(tipo as TipoEditor);
}

export function generateStaticParams() {
  return comprasComMaterial().flatMap((compra) =>
    TIPOS.map((tipo) => ({
      slug: compra.material.id,
      tipo,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; tipo: string }>;
}) {
  const { slug, tipo } = await params;
  const compra = compraPorMaterialId(slug);
  if (!compra || !isTipoEditor(tipo)) return {};

  return {
    title: `${tipo === "slides" ? "Slides" : "Artes"} · ${compra.material.titulo} · CE.X`,
    description: `Editor visual de ${compra.material.titulo}.`,
  };
}

export default async function PerfilEditorVisualPage({
  params,
}: {
  params: Promise<{ slug: string; tipo: string }>;
}) {
  const { slug, tipo } = await params;
  const compra = compraPorMaterialId(slug);
  if (!compra || !isTipoEditor(tipo)) notFound();

  const accent = ACCENTS[compra.accent];

  return (
    <div className="pg" style={{ "--perfil-accent": accent.base, "--perfil-accent-deep": accent.deep } as CSSProperties}>
      <Nav />
      <CreativeEditor
        mode={tipo}
        material={compra.material}
        accent={accent}
        backHref={`/perfil/${compra.material.id}`}
      />
      <Footer />
    </div>
  );
}
