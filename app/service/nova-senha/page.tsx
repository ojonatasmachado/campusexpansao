import { cookies } from "next/headers";
import { createServiceSupabaseClient } from "../lib/supabase";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import NovaSenhaForm from "./NovaSenhaForm";

export const dynamic = "force-dynamic";

/* Destino do link de "Esqueci minha senha" (via /auth/callback, que já
   deixou a pessoa logada). Com a marca da igreja dela quando der. */
export default async function NovaSenhaPage() {
  const supabase = await createServiceSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  let brand: BrandCfg | undefined;
  let churchName = "";
  if (user) {
    const { data: churches } = await supabase.schema("service").from("churches").select("name,is_headquarters,settings");
    const sede = churches?.find((c) => c.is_headquarters) ?? churches?.[0];
    brand = (sede?.settings as { brandCfg?: BrandCfg } | null)?.brandCfg;
    churchName = (sede?.name as string | undefined) ?? "";
  }
  const mode = resolveMode((await cookies()).get(THEME_COOKIE)?.value, brand);

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <ServiceTheme brand={brand} mode={mode} />
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
          <div className="card-body">
            <p className="eyebrow" style={{ color: "var(--olive)" }}>{churchName ? `${churchName} · Service` : "Service"}</p>
            <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>
              {user ? "Crie uma senha nova" : "Este link não vale mais"}
            </h1>
            {user ? (
              <NovaSenhaForm />
            ) : (
              <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
                O link de troca de senha expirou ou já foi usado. Volte ao login da sua igreja e toque de novo em
                Esqueci minha senha.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
