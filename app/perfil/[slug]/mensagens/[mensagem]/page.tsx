import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Nav from "../../../../components/Nav";
import Footer from "../../../../components/Footer";
import { ACCENTS } from "../../../../lib/accents";
import { compraDoUsuarioPorMaterialId } from "../../../../lib/compras";
import { createClient } from "../../../../lib/supabase-server";
import styles from "./page.module.css";
import type { CSSProperties } from "react";

export const dynamic = "force-dynamic";

export default async function MensagemEditorPage({
  params,
}: {
  params: Promise<{ slug: string; mensagem: string }>;
}) {
  const { slug, mensagem } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/perfil/${slug}/mensagens/${mensagem}`);

  const compra = await compraDoUsuarioPorMaterialId(user, slug);
  const mensagemAtual = compra?.mensagens.find((item) => item.id === mensagem) ?? null;

  if (!compra || !mensagemAtual) notFound();

  const accent = ACCENTS[compra.accent];

  return (
    <div className="pg">
      <Nav />
      <main
        className={styles.editor}
        style={{ "--perfil-accent": accent.base, "--perfil-accent-deep": accent.deep } as CSSProperties}
      >
        <section className={`pg-wrap ${styles.hero}`}>
          <div>
            <Link href={`/perfil/${compra.material.id}`} className={styles.backLink}>
              Voltar para {compra.material.titulo}
            </Link>
            <p className={styles.eyebrow}>◆ Editor de mensagem</p>
            <h1 className={styles.title}>{mensagemAtual.titulo}</h1>
          </div>
          <div className={styles.docMeta} aria-label="Dados da mensagem">
            <span>{mensagemAtual.meta}</span>
            <strong>{compra.material.titulo}</strong>
          </div>
        </section>

        <section className={`pg-wrap ${styles.workspace}`} aria-label="Editor de texto">
          <aside className={styles.messageList} aria-label="Mensagens do material">
            <p className={styles.panelLabel}>Mensagens</p>
            {compra.mensagens.map((item) => (
              <Link
                key={item.id}
                href={`/perfil/${compra.material.id}/mensagens/${item.id}`}
                className={item.id === mensagemAtual.id ? styles.messageActive : styles.messageLink}
              >
                <span>{item.meta}</span>
                <strong>{item.titulo}</strong>
              </Link>
            ))}
          </aside>

          <iframe
            className={styles.studioFrame}
            src={`/studio/documentos?material=${encodeURIComponent(compra.material.id)}&mensagem=${encodeURIComponent(mensagemAtual.id)}&context=comprador`}
            title={`CE.X Studio Documentos · ${mensagemAtual.titulo}`}
          />
        </section>
      </main>
      <Footer />
    </div>
  );
}
