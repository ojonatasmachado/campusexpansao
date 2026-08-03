import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { ProdCard } from "../../components/ProdCard";
import { comprasDoUsuario } from "../../lib/compras";
import { createClient } from "../../lib/supabase-server";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Perfil · CE.X",
  description: "Área de perfil da CE.X com as compras do aluno.",
};

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirect=/perfil");

  const compras = await comprasDoUsuario(user);

  return (
    <div className="pg">
      <Nav />
      <main className={styles.profile}>
        <section className={`pg-wrap ${styles.hero}`}>
          <div>
            <p className={styles.eyebrow}>Perfil</p>
            <h1 className={styles.title}>Minhas compras</h1>
            <p className={styles.desc}>
              Seus materiais comprados ficam organizados em um só lugar para abrir, retomar e continuar usando no ministério.
            </p>
          </div>
          <div className={styles.summary} aria-label="Resumo das compras">
            <span className={styles.summaryNumber}>{compras.length}</span>
            <span className={styles.summaryLabel}>{compras.length === 1 ? "item liberado" : "itens liberados"}</span>
          </div>
        </section>

        <section className={`pg-wrap ${styles.purchases}`} aria-labelledby="compras-title">
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>§ 01 · Conteúdo</p>
              <h2 id="compras-title" className={styles.sectionTitle}>Compras disponíveis</h2>
            </div>
            <Link href="/materiais" className={styles.catalogLink}>Ver catálogo →</Link>
          </div>

          {compras.length > 0 ? (
            <div className={`loja-shelf-grid ${styles.purchaseGrid}`}>
              {compras.map(({ id, material, materialVisual, accent }) => (
                <Link
                  key={id}
                  href={`/perfil/${material.id}`}
                  className={styles.purchaseLink}
                  aria-label={`Abrir compra ${material.titulo}`}
                >
                  <ProdCard material={materialVisual} accentKey={accent} />
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p className={styles.emptyKicker}>Nenhuma compra liberada</p>
              <h3>Quando você comprar um material, ele aparece aqui.</h3>
              <p>
                Entre, escolha um material no catálogo e use o botão Comprar para liberar o acesso
                durante os testes controlados.
              </p>
              <Link href="/materiais" className={styles.emptyAction}>Ver materiais →</Link>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
