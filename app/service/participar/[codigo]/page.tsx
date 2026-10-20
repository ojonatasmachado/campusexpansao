import Link from "next/link";
import { cookies } from "next/headers";
import { supabaseAdmin } from "../../../lib/supabase";
import { findEntryLink, normalizarCodigo } from "../../../lib/service-entrada";
import { getChurchBrandByOrg } from "../../lib/auth-church";
import { resolveMode, THEME_COOKIE } from "../../lib/theme";
import ServiceTheme from "../../ServiceTheme";
import AuthShell from "../../AuthShell";
import EntradaForm from "./EntradaForm";

export const dynamic = "force-dynamic";

/* Link (e QR) único da igreja: quem abre cria a conta e pede para fazer
   parte. Com a cara da igreja (tema e logo da matriz). A regra da igreja
   (aprovar ou direto) muda só o texto e o que acontece depois. Ver
   app/api/service/entrada e a migração 0071. */
export default async function ParticiparPage({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const code = normalizarCodigo(codigo);
  const link = await findEntryLink(supabaseAdmin(), code);
  const marca = link ? await getChurchBrandByOrg(link.organizationId) : null;
  const mode = resolveMode((await cookies()).get(THEME_COOKIE)?.value, marca?.brand);
  const igreja = marca?.name ?? "";

  return (
    <>
      <ServiceTheme brand={marca?.brand} mode={mode} />
      {link ? (
        <AuthShell
          churchName={igreja}
          logoUrl={marca?.logoUrl}
          eyebrow="Fazer parte"
          title="Que bom que você chegou"
          subtitle={
            link.rule === "direto"
              ? `Crie sua conta para entrar no app da ${igreja}.`
              : `Crie sua conta para entrar no app da ${igreja}. A liderança confere seu cadastro e libera seu acesso.`
          }
          footer={<>Já tem conta no Service? Use o mesmo e-mail e a mesma senha.</>}
        >
          <EntradaForm codigo={code} igreja={igreja} direto={link.rule === "direto"} />
        </AuthShell>
      ) : (
        <AuthShell
          eyebrow="Fazer parte"
          title="Este link não vale mais"
          subtitle="A igreja pode ter trocado o link. Peça o novo à liderança ou digite o código que ela passar."
        >
          <Link href="/service/participar" className="login-btn">
            Digitar o código →
          </Link>
        </AuthShell>
      )}
    </>
  );
}
