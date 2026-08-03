import type { CSSProperties } from "react";
import Link from "next/link";
import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import { createClient } from "../../lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function CompraConcluidaPage({
  searchParams,
}: {
  searchParams: Promise<{ material?: string }>;
}) {
  const { material } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const redirect = material ? `/perfil/${material}` : "/perfil";

  return (
    <div className="pg">
      <Nav />
      <main
        style={{
          minHeight: "72vh",
          padding: "94px 0 128px",
          background:
            "radial-gradient(circle at 80% 16%, color-mix(in srgb, var(--olive) 10%, transparent), transparent 30%), var(--ink)",
        }}
      >
        <section
          className="pg-wrap"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
            gap: 42,
            alignItems: "end",
          }}
        >
          <div>
            <p
              style={{
                margin: "0 0 18px",
                color: "var(--olive)",
                fontFamily: "var(--mono)",
                fontSize: 12,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
              }}
            >
              Compra liberada
            </p>
            <h1
              style={{
                margin: 0,
                maxWidth: 760,
                color: "var(--cream)",
                fontSize: "clamp(52px, 8vw, 112px)",
                fontWeight: 800,
                lineHeight: 0.9,
                letterSpacing: 0,
              }}
            >
              Seu material já pode ser acessado.
            </h1>
            <p
              style={{
                width: "min(100%, 620px)",
                margin: "30px 0 0",
                color: "var(--muted)",
                fontSize: 18,
                lineHeight: 1.6,
              }}
            >
              Nesta fase de testes, o CE.X libera a compra direto no seu perfil. Entre com sua conta
              para ver o material em Minhas compras.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 34 }}>
              <Link
                href={user ? redirect : `/login?redirect=${encodeURIComponent(redirect)}`}
                style={buttonStyle}
              >
                {user ? "Abrir minhas compras →" : "Entrar para acessar →"}
              </Link>
              <Link
                href="/materiais"
                style={{ ...buttonStyle, background: "transparent", color: "var(--cream)", borderColor: "var(--border-2)" }}
              >
                Voltar ao catálogo
              </Link>
            </div>
          </div>

          <aside
            style={{
              border: "0.5px solid var(--border-2)",
              borderRadius: "var(--r-lg)",
              background: "var(--graphite)",
              padding: 28,
            }}
          >
            <p
              style={{
                margin: 0,
                color: "var(--olive)",
                fontFamily: "var(--mono)",
                fontSize: 11,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Próximo passo
            </p>
            <ol
              style={{
                margin: "22px 0 0",
                padding: 0,
                listStyle: "none",
                display: "grid",
                gap: 18,
              }}
            >
              {[
                "Entre com sua conta CE.X.",
                "Abra o material em Minhas compras.",
                "Teste os arquivos e editores liberados.",
              ].map((item, index) => (
                <li key={item} style={{ display: "grid", gridTemplateColumns: "34px 1fr", gap: 14, color: "var(--light)", lineHeight: 1.45 }}>
                  <strong style={{ color: "var(--olive)", fontFamily: "var(--mono)", fontSize: 13 }}>
                    {String(index + 1).padStart(2, "0")}
                  </strong>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </main>
      <Footer />
    </div>
  );
}

const buttonStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "0 18px",
  border: "0.5px solid var(--olive)",
  borderRadius: "var(--r-sm)",
  background: "var(--olive)",
  color: "var(--accent-ink, #0E110D)",
  fontSize: 13,
  fontWeight: 800,
  textDecoration: "none",
};
