import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { ProdCard } from "../../components/ProdCard";
import { compraDoUsuarioPorMaterialId } from "../../lib/compras";
import { createClient } from "../../lib/supabase-server";
import { formatMetaMaterial } from "../../lib/perfil-data";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function PerfilCompraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect(`/login?redirect=/perfil/${slug}`);

  const compra = await compraDoUsuarioPorMaterialId(user, slug);
  if (!compra) notFound();

  const totalMensagens = compra.mensagens.length;
  const formatos = compra.material.meta.formatos.join(" · ");

  return (
    <div className="pg">
      <Nav />
      <main className={styles.access}>
        <section className={`pg-wrap ${styles.hero}`}>
          <div className={styles.copy}>
            <Link href="/perfil" className={styles.backLink}>Voltar para minhas compras</Link>
            <p className={styles.eyebrow}>◆ Compra liberada</p>
            <h1 className={styles.title}>{compra.material.titulo}</h1>
            <p className={styles.desc}>{compra.material.promessa}</p>

            <div className={styles.metaGrid} aria-label="Resumo da compra">
              <div>
                <span>{compra.id}</span>
                <strong>pedido</strong>
              </div>
              <div>
                <span>{compra.data}</span>
                <strong>compra</strong>
              </div>
              <div>
                <span>{totalMensagens}</span>
                <strong>mensagens</strong>
              </div>
            </div>
          </div>

          <aside className={styles.preview} aria-label={`Banner de ${compra.material.titulo}`}>
            <ProdCard material={compra.materialVisual} accentKey="olive" />
          </aside>
        </section>

        <section className={`pg-wrap ${styles.summarySection}`} aria-labelledby="resumo-title">
          <article className={styles.summaryPanel}>
            <div className={styles.summaryBrand} aria-hidden="true">
              <span>CE</span><strong>.X</strong>
            </div>
            <div className={styles.summaryCopy}>
              <p className={styles.sectionKicker}>§ 01 · Resumo</p>
              <h2 id="resumo-title" className={styles.sectionTitle}>O que este material entrega</h2>
              <p>{compra.material.praQuem}</p>
            </div>
            <div className={styles.summaryFacts} aria-label="Dados do material">
              <div>
                <span>{formatMetaMaterial(compra.material)}</span>
                <strong>pacote</strong>
              </div>
              <div>
                <span>{compra.material.etiqueta}</span>
                <strong>estante</strong>
              </div>
              <div>
                <span>{formatos}</span>
                <strong>formatos</strong>
              </div>
            </div>
          </article>
        </section>

        <section className={`pg-wrap ${styles.contents}`} aria-labelledby="mensagens-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>§ 02 · Mensagens</p>
              <h2 id="mensagens-title" className={styles.sectionTitle}>Roteiros para abrir e editar</h2>
            </div>
            <span className={styles.statusBadge}>◆ {compra.status}</span>
          </div>

          <div className={styles.messageGrid}>
            {compra.mensagens.map((mensagem) => (
              <Link
                key={mensagem.id}
                href={`/perfil/${compra.material.id}/mensagens/${mensagem.id}`}
                className={styles.messageCard}
              >
                <div className={styles.messageTop}>
                  <span>{mensagem.meta}</span>
                  <strong>{mensagem.numero}</strong>
                </div>
                <h3>{mensagem.titulo}</h3>
                <p>{mensagem.desc}</p>
                <span className={styles.messageAction}>Abrir no editor →</span>
              </Link>
            ))}
          </div>
        </section>

        <section className={`pg-wrap ${styles.resources}`} aria-labelledby="recursos-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>§ 03 · Saídas</p>
              <h2 id="recursos-title" className={styles.sectionTitle}>Transformar em divulgação</h2>
            </div>
          </div>

          <div className={styles.resourceGrid}>
            {compra.recursos.map((recurso) => {
              const editorTipo = recurso.tipo === "social" ? "artes" : "slides";

              return (
                <Link
                  key={recurso.id}
                  href={`/perfil/${compra.material.id}/editores/${editorTipo}`}
                  className={styles.resourceCard}
                >
                  <div className={styles.resourceIcon} data-kind={recurso.tipo} aria-hidden="true">
                    {recurso.tipo === "social" ? "IG" : "16:9"}
                  </div>
                  <div>
                    <div className={styles.resourceMeta}>
                      <span>{recurso.meta}</span>
                      <strong data-state="ready">{recurso.status}</strong>
                    </div>
                    <h3>{recurso.titulo}</h3>
                    <p>{recurso.desc}</p>
                    <span className={styles.resourceAction}>Abrir editor →</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
