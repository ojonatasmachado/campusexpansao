import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import ServiceTheme from "../../service/ServiceTheme";
import { getAuthChurchBySlug } from "../../service/lib/auth-church";
import { resolveMode, THEME_COOKIE } from "../../service/lib/theme";
import ThemedLoginForm from "./ThemedLoginForm";

export const dynamic = "force-dynamic";

/* Login da igreja (o endereço que o membro guarda). Mesma autenticação do
   /service/login (useServiceLoginForm) e agora a mesma cara do app que ele
   abre em seguida: logo da igreja | Service, com os neutros e a cor do
   Service da igreja (brandCfg da matriz). Continua funcionando com a
   Página pública despublicada: entrar só depende de a igreja existir. */
export default async function EntrarPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const church = await getAuthChurchBySlug(slug);
  if (!church) redirect("/service/login");

  const mode = resolveMode((await cookies()).get(THEME_COOKIE)?.value, church.brand);

  return (
    <>
      <ServiceTheme brand={church.brand} mode={mode} />
      <ThemedLoginForm slug={church.slug} churchName={church.name} logoUrl={church.logoUrl} />
    </>
  );
}
