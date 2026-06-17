import { notFound } from "next/navigation";
import Link from "next/link";
import Nav from "../../../../components/Nav";
import Footer from "../../../../components/Footer";
import { ACCENTS } from "../../../../lib/accents";
import { compraPorMaterialId, comprasComMaterial, mensagemPorId } from "../../../../lib/perfil-data";
import { DocumentEditor } from "../../../_components/DocumentEditor";
import styles from "./page.module.css";
import type { CSSProperties } from "react";

export function generateStaticParams() {
  return comprasComMaterial().flatMap((compra) =>
    compra.mensagens.map((mensagem) => ({
      slug: compra.material.id,
      mensagem: mensagem.id,
    })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; mensagem: string }>;
}) {
  const { slug, mensagem } = await params;
  const compra = compraPorMaterialId(slug);
  const mensagemAtual = mensagemPorId(slug, mensagem);
  if (!compra || !mensagemAtual) return {};

  return {
    title: `${mensagemAtual.meta} · ${compra.material.titulo} · CE.X`,
    description: `Editor de texto para ${mensagemAtual.meta.toLowerCase()} de ${compra.material.titulo}.`,
  };
}

export default async function MensagemEditorPage({
  params,
}: {
  params: Promise<{ slug: string; mensagem: string }>;
}) {
  const { slug, mensagem } = await params;
  const compra = compraPorMaterialId(slug);
  const mensagemAtual = mensagemPorId(slug, mensagem);

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

          <DocumentEditor material={compra.material} mensagem={mensagemAtual} status={compra.status} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
