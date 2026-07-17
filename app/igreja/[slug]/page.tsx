import { redirect } from "next/navigation";

/* Rota antiga preservada só pra não quebrar link já compartilhado (bio do
   Instagram, WhatsApp etc). A página pública de verdade agora vive na raiz
   do domínio, em app/[slug]/. */

export default async function IgrejaSlugRedirect({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/${slug}`);
}
