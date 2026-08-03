import Link from "next/link";
import { createServiceSupabaseClient } from "../lib/supabase";

type ProductRow = {
  code: string;
  name: string;
};

type ConnectionState =
  | { kind: "ok"; products: ProductRow[] }
  | { kind: "blocked"; message: string }
  | { kind: "error"; message: string };

async function checkConnection(): Promise<ConnectionState> {
  try {
    const supabase = await createServiceSupabaseClient();
    const { data, error } = await supabase
      .schema("core")
      .from("products")
      .select("code,name")
      .eq("code", "service");

    if (error) {
      const message = error.message.toLowerCase();
      const isAuthBlock =
        error.code === "42501" ||
        message.includes("permission") ||
        message.includes("row-level security") ||
        message.includes("rls");

      if (isAuthBlock) {
        return {
          kind: "blocked",
          message: "A conexao chegou ao Supabase, mas core.products exige usuario logado.",
        };
      }

      if (message.includes("invalid schema")) {
        return {
          kind: "blocked",
          message: "A conexao chegou ao Supabase, mas o schema core ainda nao esta exposto na API.",
        };
      }

      return { kind: "error", message: error.message };
    }

    return { kind: "ok", products: data ?? [] };
  } catch (error) {
    return {
      kind: "error",
      message: error instanceof Error ? error.message : "Erro inesperado ao conectar.",
    };
  }
}

export default async function ServiceConnectionPage() {
  const state = await checkConnection();
  const foundService = state.kind === "ok" && state.products.some((product) => product.code === "service");

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 760 }}>
          <div className="card-body">
            <p className="eyebrow" style={{ color: "var(--wheat)" }}>
              SERVICE · FASE 1
            </p>
            <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
              Teste de conexao Supabase
            </h1>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 12 }}>
              Esta tela usa somente a chave anon e a sessao do usuario. Ela consulta{" "}
              <code>core.products</code> procurando o produto <code>service</code>.
            </p>

            <div className="banner banner-soft" style={{ marginTop: 24 }}>
              {state.kind === "ok" ? (
                <>
                  <strong style={{ color: foundService ? "var(--olive-soft)" : "var(--wheat)" }}>
                    {foundService ? "Conectado. Produto service encontrado." : "Conectado. Produto service nao encontrado."}
                  </strong>
                  <p className="t-small" style={{ color: "var(--light)", marginTop: 8 }}>
                    Retorno recebido:{" "}
                    {state.products.length
                      ? state.products.map((product) => `${product.code}: ${product.name}`).join(", ")
                      : "nenhuma linha retornada"}
                  </p>
                </>
              ) : state.kind === "blocked" ? (
                <>
                  <strong style={{ color: "var(--wheat)" }}>Conexao configurada. Falta login para ler os dados.</strong>
                  <p className="t-small" style={{ color: "var(--light)", marginTop: 8 }}>
                    {state.message} Se a mensagem falar de schema, habilite core e service em Project Settings,
                    API, Data API, Exposed schemas.
                  </p>
                </>
              ) : (
                <>
                  <strong style={{ color: "var(--terra)" }}>A conexao falhou.</strong>
                  <p className="t-small" style={{ color: "var(--light)", marginTop: 8 }}>
                    {state.message}
                  </p>
                </>
              )}
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              <Link className="btn btn-secondary" href="/">
                Voltar ao site
              </Link>
              <Link className="btn btn-ghost" href="/login">
                Ir para login
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
