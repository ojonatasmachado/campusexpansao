import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../lib/supabase";
import { findOpenInvite } from "../../lib/service-invite";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import AuthShell from "../AuthShell";
import ConviteForm from "./ConviteForm";

export const dynamic = "force-dynamic";

/* Link do convite (WhatsApp do líder): a pessoa informa e-mail, senha e CEP
   e a conta nasce aqui. Com a cara da igreja (tema da matriz + logo).
   Lógica igual à anterior; só a casca mudou pra AuthShell. */
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
  const jar = await cookies();
  const mode = resolveMode(jar.get(THEME_COOKIE)?.value, brand);
  /* convite vencido: quem já criou o acesso entra pelo app da igreja do aparelho */
  const slug = jar.get("cex_church_slug")?.value;
  const loginHref = slug && /^[a-z0-9-]{3,40}$/.test(slug) ? `/${slug}/entrar` : "/service/login";
  const firstName = invite?.member.name.split(" ")[0] ?? "";

  return (
    <>
      <ServiceTheme brand={brand} mode={mode} />
      {invite && t ? (
        <AuthShell
          churchName={churchName}
          logoUrl={logoUrl}
          eyebrow="Convite"
          title={firstName ? `Bem-vindo(a), ${firstName}` : "Bem-vindo(a)"}
          subtitle="Crie sua senha para entrar no app da igreja. Só você vai saber essa senha."
          footer={<>O link é só seu e vale por 7 dias.</>}
        >
          <ConviteForm t={t} />
        </AuthShell>
      ) : (
        <AuthShell
          churchName={churchName}
          logoUrl={logoUrl}
          eyebrow="Convite"
          title="Este convite não vale mais"
          subtitle="O link já foi usado ou passou do prazo de 7 dias. Peça um novo ao líder da sua igreja. Se você já criou seu acesso, é só entrar."
        >
          <Link href={loginHref} className="login-btn">
            Entrar no app →
          </Link>
        </AuthShell>
      )}
    </>
  );
}
