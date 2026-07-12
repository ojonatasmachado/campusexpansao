import { notFound, redirect } from "next/navigation";
import Nav from "../../../../../components/Nav";
import Footer from "../../../../../components/Footer";
import { compraDoUsuarioPorMaterialId } from "../../../../../lib/compras";
import { createClient } from "../../../../../lib/supabase-server";
import { StudioVisualFrame } from "./StudioVisualFrame";

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

  const module = tipo === "slides" ? "slides" : "design";
  const recurso = compra.recursos.find((item) => item.tipo === (tipo === "slides" ? "slides" : "social"));
  const seedKey = tipo === "slides" ? "cex_studio_slides_seed" : "cex_studio_art_seed";

  return (
    <div className="pg">
      <Nav />
      <StudioVisualFrame
        src={`/studio/${module}?material=${encodeURIComponent(compra.material.id)}&context=comprador`}
        title={tipo === "slides" ? "CE.X Studio Slides" : "CE.X Studio Design"}
        seedKey={seedKey}
        payload={recurso?.payload}
        style={{
          width: "100%",
          minHeight: "calc(100vh - 96px)",
          border: 0,
          display: "block",
          background: "#0E110D",
        }}
      />
      <Footer />
    </div>
  );
}
