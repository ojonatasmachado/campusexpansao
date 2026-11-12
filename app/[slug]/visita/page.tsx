import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ServiceTheme from "../../service/ServiceTheme";
import AuthShell from "../../service/AuthShell";
import { getAuthChurchBySlug } from "../../service/lib/auth-church";
import { resolveMode, THEME_COOKIE } from "../../service/lib/theme";
import { supabaseAdmin } from "../../lib/supabase";
import { normalizarVocabulario } from "../../service/lib/vocabulario";
import { interessesDe, lerAutocadastro, lerCodigoConvite } from "../../service/modules/visitantes/autocadastro";
import AutocadastroForm from "../../service/modules/visitantes/AutocadastroForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const church = await getAuthChurchBySlug((await params).slug);
  return { title: church ? `Primeira visita · ${church.name}` : "Primeira visita", robots: { index: false } };
}

/* Visitante se cadastra sozinho (QR ou link que a gestão divulga em
   Visitantes › QR e link). Sem login. O servidor lê só se o autocadastro
   está ligado e os nomes da igreja; o envio vai pela RPC pública
   service.visitante_autocadastro (0070), que valida de novo. Com ?convite=
   (O9), "Quem te convidou?" já chega preenchido. */
export default async function VisitaPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ convite?: string | string[] }> }) {
  const { slug } = await params;
  const codigo = lerCodigoConvite((await searchParams).convite);
  const church = await getAuthChurchBySlug(slug);
  if (!church) redirect("/service/login");

  const db = supabaseAdmin().schema("service");
  const { data: row } = await db.from("churches").select("settings, organization_id").eq("slug", church.slug).maybeSingle();
  const { data: sede } = row
    ? await db.from("churches").select("vocabulario, settings").eq("organization_id", row.organization_id).eq("is_headquarters", true).maybeSingle()
    : { data: null };
  const vocab = normalizarVocabulario(sede?.vocabulario, (sede?.settings as { gruposCfg?: { termoP?: string } } | null)?.gruposCfg?.termoP);
  const aberto = lerAutocadastro(row?.settings).ativo;
  /* O9: link "Convidar um amigo". Só o nome de quem convidou, e só desta organização */
  const { data: quem } = aberto && codigo && row
    ? await db.from("people").select("name").eq("invite_code", codigo).eq("organization_id", row.organization_id).maybeSingle()
    : { data: null };
  const convite = quem?.name ? { codigo: codigo!, nome: quem.name as string } : null;

  const mode = resolveMode((await cookies()).get(THEME_COOKIE)?.value, church.brand);

  return (
    <>
      <ServiceTheme brand={church.brand} mode={mode} />
      {aberto ? (
        <AutocadastroForm slug={church.slug} churchName={church.name} logoUrl={church.logoUrl} interesses={interessesDe(vocab)} convite={convite} />
      ) : (
        <AuthShell
          logoUrl={church.logoUrl}
          churchName={church.name}
          title="Cadastro fechado agora"
          subtitle={`Este link não está recebendo cadastros no momento. Procure alguém da recepção da ${church.name} e a gente te recebe por lá.`}
        />
      )}
    </>
  );
}
