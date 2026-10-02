import { cookies } from "next/headers";
import { getAuthChurchBySlug } from "../lib/auth-church";
import { resolveMode, THEME_COOKIE } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import NovaSenhaForm from "./NovaSenhaForm";

export const dynamic = "force-dynamic";

/* Destino do link de "Esqueci minha senha". A autorização vem no próprio
   link (depois do #, que só o navegador enxerga), então quem decide o que
   mostrar é o NovaSenhaForm. O servidor só veste a página com a marca da
   igreja lembrada no aparelho (cookie cex_church_slug), quando houver. */
export default async function NovaSenhaPage() {
  const jar = await cookies();
  const church = await getAuthChurchBySlug(jar.get("cex_church_slug")?.value);
  const mode = resolveMode(jar.get(THEME_COOKIE)?.value, church?.brand);

  return (
    <>
      <ServiceTheme brand={church?.brand} mode={mode} />
      <NovaSenhaForm
        loginHref={church ? `/${church.slug}/entrar` : "/service/login"}
        churchName={church?.name ?? null}
        logoUrl={church?.logoUrl ?? null}
      />
    </>
  );
}
