import { cookies } from "next/headers";
import { getAuthChurchBySlug } from "../lib/auth-church";
import { resolveMode, THEME_COOKIE } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import AuthShell from "../AuthShell";
import CodigoForm from "./CodigoForm";

export const dynamic = "force-dynamic";

/* Para quem recebeu o código em vez do link (ditado no culto, no boletim):
   digita aqui e segue pro /service/participar/<código>. */
export default async function DigitarCodigoPage() {
  const jar = await cookies();
  const igreja = await getAuthChurchBySlug(jar.get("cex_church_slug")?.value);
  const mode = resolveMode(jar.get(THEME_COOKIE)?.value, igreja?.brand);
  return (
    <>
      <ServiceTheme brand={igreja?.brand} mode={mode} />
      <AuthShell
        churchName={igreja?.name}
        logoUrl={igreja?.logoUrl}
        eyebrow="Fazer parte"
        title="Digite o código da igreja"
        subtitle="São 8 letras e números. A liderança da igreja passa o código ou o link."
      >
        <CodigoForm />
      </AuthShell>
    </>
  );
}
