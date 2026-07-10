import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import Nav from "../../../components/Nav";
import Footer from "../../../components/Footer";
import { compraDoUsuarioPorMaterialId } from "../../../lib/compras";
import { createClient } from "../../../lib/supabase-server";
import { formatMetaMaterial } from "../../../lib/perfil-data";
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
  const primeiraMensagem = compra.mensagens[0] ?? null;
  const primeiraMensagemHref = primeiraMensagem
    ? `/perfil/${compra.material.id}/mensagens/${primeiraMensagem.id}`
    : null;

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

            <div className={styles.heroActions}>
              {primeiraMensagemHref && (
                <Link href={primeiraMensagemHref} className="btn btn-primary btn-lg btn-arrow">
                  Abrir primeira mensagem
                </Link>
              )}
              <a href="#recursos" className="btn btn-secondary btn-lg">Abrir recursos</a>
            </div>
          </div>

          <aside className={styles.accessPanel} aria-label="Resumo do acesso">
            <div className={styles.panelLogo} aria-hidden="true">
              <span>CE</span><strong>.X</strong>
            </div>
            <span className="badge badge-olive badge-dot">{compra.status}</span>
            <dl className={styles.panelFacts}>
              <div>
                <dt>Pedido</dt>
                <dd>{compra.id}</dd>
              </div>
              <div>
                <dt>Compra</dt>
                <dd>{compra.data}</dd>
              </div>
              <div>
                <dt>Conteúdo</dt>
                <dd>{totalMensagens} mensagens</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className={`pg-wrap ${styles.summarySection}`} aria-labelledby="resumo-title">
          <article className={styles.summaryBand}>
            <span className={styles.summaryMark} aria-hidden="true">◆</span>
            <div>
              <p className="psec-eyebrow">§ 01 · Resumo</p>
              <h2 id="resumo-title" className={styles.sectionTitle}>O que este material entrega</h2>
              <p>{compra.material.praQuem}</p>
            </div>
            <dl className={styles.summaryFacts} aria-label="Dados do material">
              <div>
                <dt>Pacote</dt>
                <dd>{formatMetaMaterial(compra.material)}</dd>
              </div>
              <div>
                <dt>Área</dt>
                <dd>{compra.material.etiqueta}</dd>
              </div>
              <div>
                <dt>Formatos</dt>
                <dd>{formatos}</dd>
              </div>
            </dl>
          </article>
        </section>

        <section className={`pg-wrap ${styles.contents}`} aria-labelledby="mensagens-title">
          <div className="psec-head">
            <div className="psec-head-left">
              <p className="psec-eyebrow">§ 02 · Mensagens</p>
              <h2 id="mensagens-title" className="psec-title">Roteiros para abrir e editar</h2>
              <p className="psec-desc">Cada mensagem abre no Studio para você adaptar, revisar e preparar a ministração.</p>
            </div>
            <span className="badge badge-olive">{totalMensagens} liberadas</span>
          </div>

          <div className={styles.messageList}>
            {compra.mensagens.map((mensagem) => {
              const conteudo = (
                <>
                  <span className={styles.messageNum}>{mensagem.numero}</span>
                  <div className={styles.messageBody}>
                    <span>{mensagem.meta}</span>
                    <h3>{mensagem.titulo}</h3>
                    <p>{mensagem.desc}</p>
                  </div>
                  {mensagem.delivery === "pdf" ? (
                    <span className={styles.messageAction}>PDF</span>
                  ) : (
                    <span className={styles.messageAction}>Abrir →</span>
                  )}
                </>
              );

              if (mensagem.delivery === "pdf") {
                return (
                  <div key={mensagem.id} className={styles.messageItem}>
                    {conteudo}
                  </div>
                );
              }

              return (
                <Link
                  key={mensagem.id}
                  href={`/perfil/${compra.material.id}/mensagens/${mensagem.id}`}
                  className={styles.messageItem}
                >
                  {conteudo}
                </Link>
              );
            })}
          </div>
        </section>

        <section id="recursos" className={`pg-wrap ${styles.resources}`} aria-labelledby="recursos-title">
          <div className="psec-head">
            <div className="psec-head-left">
              <p className="psec-eyebrow">§ 03 · Recursos</p>
              <h2 id="recursos-title" className="psec-title">Transformar em divulgação</h2>
              <p className="psec-desc">Abra os módulos do Studio para preparar slides, artes e materiais de apoio.</p>
            </div>
          </div>

          <div className={styles.resourceGrid}>
            {compra.recursos.map((recurso) => {
              const editorTipo = recurso.tipo === "social" ? "artes" : "slides";

              return (
                <Link
                  key={recurso.id}
                  href={`/perfil/${compra.material.id}/editores/${editorTipo}`}
                  className={`card ${styles.resourceCard}`}
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
