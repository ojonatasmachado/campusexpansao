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

export default async function ServiceOnboardingPage() {
  const churchCount = await getExistingChurchCount();
  if (churchCount > 0) redirect("/service");

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 620, margin: "0 auto" }}>
          <div className="card-body">
            <Link href="/" className="nav-logo" style={{ textDecoration: "none" }}>
              <Logo />
            </Link>
            <p className="eyebrow" style={{ color: "var(--wheat)", marginTop: 28 }}>
              ◆ SERVICE · PRIMEIRA IGREJA
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
