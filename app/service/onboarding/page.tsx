import Link from "next/link";
import { redirect } from "next/navigation";
import { createServiceSupabaseClient } from "../lib/supabase";
import BootstrapChurchForm from "./BootstrapChurchForm";
import Logo from "../../components/Logo";

async function getExistingChurchCount() {
  const supabase = await createServiceSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/service/login");

  const { count } = await supabase
    .schema("service")
    .from("churches")
    .select("id", { count: "exact", head: true });

  return count ?? 0;
}

/* Quem chega aqui sem igreja pode ser um membro que se cadastrou sozinho em
   vez de usar o convite. Criar igreja só com escolha explícita (?nova=1):
   sem isso, membro acabava abrindo uma igreja nova sem querer. */
export default async function ServiceOnboardingPage({ searchParams }: { searchParams: Promise<{ nova?: string }> }) {
  const churchCount = await getExistingChurchCount();
  if (churchCount > 0) redirect("/service");
  const { nova } = await searchParams;

  if (nova !== "1") {
    return (
      <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
        <div className="ld-wrap">
          <section className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
            <div className="card-body">
              <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
                <Logo />
              </Link>
              <p className="eyebrow" style={{ color: "var(--wheat)", marginTop: 28 }}>
                SERVICE · PRIMEIRO ACESSO
              </p>
              <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
                Sua conta ainda não está ligada a uma igreja
              </h1>
              <div className="banner banner-soft" style={{ marginTop: 24 }}>
                <strong style={{ color: "var(--cream)" }}>Você é membro de uma igreja que usa o Service?</strong>
                <p className="t-body" style={{ color: "var(--light)", marginTop: 8 }}>
                  Peça ao líder da sua igreja o link de convite. Ele chega pelo WhatsApp e já te coloca
                  dentro do app da sua igreja.
                </p>
              </div>
              <p className="t-body" style={{ color: "var(--light)", marginTop: 24 }}>
                Você é da liderança e quer cadastrar a sua igreja no Service?
              </p>
              <Link href="/service/onboarding?nova=1" className="btn btn-sec" style={{ marginTop: 12 }}>
                Cadastrar minha igreja →
              </Link>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
          <div className="card-body">
            <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
              <Logo />
            </Link>
            <p className="eyebrow" style={{ color: "var(--wheat)", marginTop: 28 }}>
              SERVICE · PRIMEIRA IGREJA
            </p>
            <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
              Crie a igreja matriz
            </h1>
            <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
              Esta etapa chama a função segura do banco e cria sua organização, seu papel master,
              o acesso ao Service e a primeira igreja.
            </p>
            <BootstrapChurchForm />
          </div>
        </section>
      </div>
    </main>
  );
}
