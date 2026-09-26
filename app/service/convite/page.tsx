import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../lib/supabase";
import { findOpenInvite } from "../../lib/service-invite";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import ConviteForm from "./ConviteForm";

export const dynamic = "force-dynamic";

/* Link do convite (WhatsApp do líder): a pessoa informa e-mail, senha e CEP
   e a conta nasce aqui. Com a cara da igreja (tema da matriz + logo). */
export default async function ServiceConvitePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  const db = supabaseAdmin();
  const invite = t ? await findOpenInvite(db, t) : null;

  let churchName = "";
  let logoUrl: string | null = null;
  let brand: BrandCfg | undefined;
  if (invite) {
    const { data: churches } = await db
      .schema("service")
      .from("churches")
      .select("id,name,logo_url,is_headquarters,settings")
      .eq("organization_id", invite.organization_id);
    const own = churches?.find((c) => c.id === invite.member.church_id);
    const sede = churches?.find((c) => c.is_headquarters) ?? own;
    churchName = (own?.name ?? sede?.name ?? "") as string;
    logoUrl = (sede?.logo_url ?? own?.logo_url ?? null) as string | null;
    brand = (sede?.settings as { brandCfg?: BrandCfg } | null)?.brandCfg;
  }
  const mode = resolveMode((await cookies()).get(THEME_COOKIE)?.value, brand);
  const firstName = invite?.member.name.split(" ")[0] ?? "";

  return (
    <main className="ld-sec" style={{ minHeight: "100vh", background: "var(--ink)" }}>
      <ServiceTheme brand={brand} mode={mode} />
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="card-body">
            <div className="brand-church">
              {logoUrl ? (
                <img className="brand-church-logo" src={logoUrl} alt="" />
              ) : (
                <span className="brand-church-mark" aria-hidden="true">{(churchName || "IG").slice(0, 2).toUpperCase()}</span>
              )}
              <span className="brand-church-text">
                <span className="brand-church-name">{churchName || "Sua igreja"}</span>
                <span className="brand-church-suffix">Service</span>
              </span>
            </div>
            {invite && t ? (
              <>
                <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 28 }}>
                  {firstName ? `Bem-vindo(a), ${firstName}` : "Bem-vindo(a)"}
                </h1>
                <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
                  Crie seu acesso ao app da {churchName || "sua igreja"}. Só você vai saber essa senha.
                </p>
                <ConviteForm t={t} />
              </>
            ) : (
              <>
                <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 28 }}>
                  Este convite não vale mais
                </h1>
                <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
                  O link já foi usado ou passou do prazo de 7 dias. Peça um novo link ao líder da sua igreja.
                  Se você já criou seu acesso, é só entrar.
                </p>
                <Link href="/service/login" className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>
                  Entrar no app →
                </Link>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
