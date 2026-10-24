import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../lib/supabase";
import { findOpenInvite } from "../../lib/service-invite";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import { getAuthChurchBySlug } from "../lib/auth-church";
import AuthShell from "../AuthShell";
import ConviteForm from "./ConviteForm";

import { botaoClasse } from "../ui/Botao";
import { getTexto } from "../lib/internacional/servidor";

export const dynamic = "force-dynamic";

/* Link do convite (WhatsApp do líder): a pessoa informa e-mail, senha e endereço
   e a conta nasce aqui. Com a cara da igreja (tema da matriz + logo).
   Lógica igual à anterior; só a casca mudou pra AuthShell. */
export default async function ServiceConvitePage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const traduzirUi = await getTexto();

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
  /* convite vencido: a marca e o login são os da igreja que este aparelho já conhece */
  const igrejaDoAparelho = invite ? null : await getAuthChurchBySlug(jar.get("cex_church_slug")?.value);
  if (igrejaDoAparelho) {
    churchName = igrejaDoAparelho.name;
    logoUrl = igrejaDoAparelho.logoUrl;
    brand = igrejaDoAparelho.brand;
  }
  const mode = resolveMode(jar.get(THEME_COOKIE)?.value, brand);
  const loginHref = igrejaDoAparelho ? `/${igrejaDoAparelho.slug}/entrar` : "/service/login";
  const firstName = invite?.member.name.split(" ")[0] ?? "";

  return (
    <>
      <ServiceTheme brand={brand} mode={mode} />
      {invite && t ? (
        <AuthShell
          churchName={churchName}
          logoUrl={logoUrl}
          eyebrow={traduzirUi("Convite")}
          title={firstName ? traduzirUi("Que bom ter você, {value0}", { value0: `${firstName}` }) : traduzirUi("Que bom ter você aqui")}
          subtitle={traduzirUi("Crie sua senha para entrar no app da igreja. Só você vai saber essa senha.")}
          footer={traduzirUi("O link é só seu e vale por 7 dias.")}
        >
          <ConviteForm t={t} churchName={churchName} />
        </AuthShell>
      ) : (
        <AuthShell
          churchName={churchName}
          logoUrl={logoUrl}
          eyebrow={traduzirUi("Convite")}
          title={traduzirUi("Este convite não vale mais")}
          subtitle={traduzirUi("O link já foi usado ou passou do prazo de 7 dias. Peça um novo ao líder da sua igreja. Se você já criou seu acesso, é só entrar.")}
        >
          <Link href={loginHref} className={botaoClasse({ tamanho: "entrada", variante: "principal" })}>{traduzirUi("Entrar no app →")}</Link>
        </AuthShell>
      )}
    </>
  );
}
