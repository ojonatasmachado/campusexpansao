import type { CSSProperties } from "react";
import { notFound, redirect } from "next/navigation";
import Nav from "../../../../components/Nav";
import Footer from "../../../../components/Footer";
import { ACCENTS } from "../../../../lib/accents";
import { compraDoUsuarioPorMaterialId } from "../../../../lib/compras";
import { createClient } from "../../../../lib/supabase-server";
import { CreativeEditor } from "../../../_components/CreativeEditor";

const TIPOS = ["artes", "slides"] as const;
type TipoEditor = (typeof TIPOS)[number];

function isTipoEditor(tipo: string): tipo is TipoEditor {
  return TIPOS.includes(tipo as TipoEditor);
}

export const dynamic = "force-dynamic";

export default async function PerfilEditorVisualPage({
  params,
}: {
  params: Promise<{ slug: string; tipo: string }>;
}) {
  const { slug, tipo } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/perfil/${slug}/editores/${tipo}`);

  const compra = await compraDoUsuarioPorMaterialId(user, slug);
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
