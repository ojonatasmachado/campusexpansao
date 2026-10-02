import { Suspense } from "react";
import { cookies } from "next/headers";
import ServiceTheme from "../ServiceTheme";
import { getAuthChurchBySlug } from "../lib/auth-church";
import { resolveMode, THEME_COOKIE } from "../lib/theme";
import ServiceLoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

/* Login da gestão. Se este aparelho já entrou por uma igreja (cookie
   cex_church_slug, gravado no login da igreja e no convite), a tela abre
   com a marca e as cores dela e oferece o caminho do app do membro. */
export default async function ServiceLoginPage() {
  const jar = await cookies();
  const church = await getAuthChurchBySlug(jar.get("cex_church_slug")?.value);
  const mode = resolveMode(jar.get(THEME_COOKIE)?.value, church?.brand);

  return (
    <>
      <ServiceTheme brand={church?.brand} mode={mode} />
      <Suspense fallback={null}>
        <ServiceLoginForm churchName={church?.name ?? null} logoUrl={church?.logoUrl ?? null} churchSlug={church?.slug ?? null} />
      </Suspense>
    </>
  );
}
