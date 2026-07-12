import { notFound } from "next/navigation";
import Nav from "../../../components/Nav";
import Footer from "../../../components/Footer";
import CursoLanding from "../../../components/CursoLanding";
import { dbCursoToCursoDado } from "../../../lib/cursos-data";
import { supabase } from "../../../lib/supabase";
import "../landing.css";

export const revalidate = 60;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data } = await supabase.from("cursos").select("title,promessa").eq("slug", slug).single();
  if (!data) return {};
  return { title: `${data.title} · CE.X`, description: data.promessa };
}

export default async function CursoDetalhe({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const [{ data: cursoDb }, { data: cursosDb }] = await Promise.all([
    supabase.from("cursos").select("*").eq("slug", slug).eq("status", "Publicado").single(),
    supabase.from("cursos").select("*").eq("status", "Publicado").order("num"),
  ]);

  if (!cursoDb) notFound();

  const allCursos = (cursosDb ?? []).map(dbCursoToCursoDado);
  const curso = dbCursoToCursoDado(cursoDb);
  const relacionados = allCursos.filter(c => c.nivel === curso.nivel && c.slug !== curso.slug);

  return (
    <div className="pg">
      <Nav />
      <CursoLanding curso={curso} relacionados={relacionados} allCursos={allCursos} />
      <Footer />
    </div>
  );
}
