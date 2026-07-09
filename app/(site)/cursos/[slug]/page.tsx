import { notFound } from "next/navigation";
import Nav from "../../../components/Nav";
import Footer from "../../../components/Footer";
import CursoLanding from "../../../components/CursoLanding";
import { CURSOS_DATA } from "../../../lib/cursos-data";
import "../landing.css";

export function generateStaticParams() {
  return CURSOS_DATA.map(c => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const curso = CURSOS_DATA.find(c => c.slug === slug);
  if (!curso) return {};
  return { title: `${curso.title} · CE.X`, description: curso.promessa };
}

export default async function CursoDetalhe({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const curso = CURSOS_DATA.find(c => c.slug === slug);
  if (!curso) notFound();

  const relacionados = CURSOS_DATA.filter(c => c.nivel === curso.nivel && c.slug !== curso.slug);

  return (
    <div className="pg">
      <Nav />
      <CursoLanding curso={curso} relacionados={relacionados} />
      <Footer />
    </div>
  );
}
