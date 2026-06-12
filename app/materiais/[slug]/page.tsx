import { notFound } from "next/navigation";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import MaterialLanding from "../../components/MaterialLanding";
import { supabase } from "../../lib/supabase";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase.from("materiais").select("titulo,promessa").eq("id", slug).single();
  if (!data) return {};
  return {
    title: `${data.titulo} · CE.X Materiais`,
    description: data.promessa,
  };
}

export default async function MaterialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [{ data: material }, { data: estantes }, { data: todosOsMateriais }] = await Promise.all([
    supabase.from("materiais").select("*").eq("id", slug).eq("status", "Publicado").single(),
    supabase.from("estantes").select("*").order("ord"),
    supabase.from("materiais").select("*").eq("status", "Publicado").order("created_at"),
  ]);

  if (!material) notFound();

  return (
    <div className="pg">
      <Nav />
      <MaterialLanding
        material={material}
        dbEstantes={estantes ?? undefined}
        allDbMateriais={todosOsMateriais ?? undefined}
      />
      <Footer />
    </div>
  );
}
