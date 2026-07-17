import { redirect } from "next/navigation";
import { getChurchPageBySlug } from "../../lib/church-page";
import ThemedLoginForm from "./ThemedLoginForm";

/* Login temático da igreja : mesmo login do Service por baixo (mesma
   autenticação genérica, ver useServiceLoginForm), só com a cara da igreja
   (logo + cor de destaque do Service) em vez do verde CE.X. Funciona mesmo
   com a Página pública despublicada : entrar não depende de published,
   só de a igreja existir. */

export const dynamic = "force-dynamic";

export default async function EntrarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getChurchPageBySlug(slug);

  if (!data) redirect("/service/login");

  return <ThemedLoginForm data={data} />;
}
