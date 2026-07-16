import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChurchPageBySlug } from "../../lib/church-page";
import ChurchPageView from "./ChurchPageView";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getChurchPageBySlug(slug);
  if (!data) return { title: "Página não encontrada" };

  const image = data.logoUrl ?? data.pagina.coverUrl ?? undefined;
  const description = data.pagina.bio || `Links e novidades da ${data.name}.`;

  return {
    title: data.name,
    description,
    openGraph: {
      title: data.name,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary",
      title: data.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function IgrejaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getChurchPageBySlug(slug);

  if (!data) notFound();

  if (!data.published) {
    return (
      <div className="cx-notpublished">
        <div className="cx-notpublished-card">
          <h1>{data.name}</h1>
          <p>Esta página ainda não foi publicada. Volte em breve.</p>
        </div>
      </div>
    );
  }

  return <ChurchPageView data={data} />;
}
