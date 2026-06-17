"use client";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "../lib/supabase-browser";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

export default function ContaClient({ user }: { user: User }) {
  const router = useRouter();
  const name = user.user_metadata?.full_name || user.email?.split("@")[0] || "Usuário";

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <>
      <Nav />
      <main style={{ minHeight: "80vh", background: "var(--ink)", padding: "60px 24px" }}>
        <div className="ld-wrap">

          {/* Cabeçalho */}
          <div style={{ marginBottom: 48 }}>
            <p style={{ color: "var(--olive)", fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
              ◆ Minha Conta
            </p>
            <h1 style={{ color: "var(--cream)", fontSize: 32, fontWeight: 700, margin: 0 }}>
              Olá, {name}
            </h1>
            <p style={{ color: "var(--muted)", fontSize: 14, marginTop: 8 }}>{user.email}</p>
          </div>

          {/* Minhas compras */}
          <section style={{ marginBottom: 48 }}>
            <h2 style={{
              color: "var(--cream)",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 24,
              paddingBottom: 12,
              borderBottom: "1px solid var(--border)",
            }}>
              Minhas compras
            </h2>

            {/* Placeholder — lista de compras vai aqui após integrar Stripe */}
            <div style={{
              background: "var(--graphite)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "40px 24px",
              textAlign: "center",
            }}>
              <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>
                Suas compras aparecerão aqui.
              </p>
              <a
                href="/materiais"
                style={{
                  display: "inline-block",
                  marginTop: 16,
                  color: "var(--olive)",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Ver materiais →
              </a>
            </div>
          </section>

          {/* Sair */}
          <button
            onClick={handleLogout}
            style={{
              background: "none",
              border: "1px solid var(--border-2)",
              borderRadius: 8,
              padding: "10px 20px",
              color: "var(--muted)",
              fontFamily: "inherit",
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            Sair da conta
          </button>

        </div>
      </main>
      <Footer />
    </>
  );
}
