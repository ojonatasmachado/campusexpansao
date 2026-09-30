import { cookies } from "next/headers";
import { getChurchPageBySlug } from "../../lib/church-page";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "../lib/theme";
import ServiceTheme from "../ServiceTheme";
import NovaSenhaForm from "./NovaSenhaForm";

export const dynamic = "force-dynamic";

/* Destino do link de "Esqueci minha senha". A autorização vem no próprio
   link (depois do #, que só o navegador enxerga), então quem decide o que
   mostrar é o NovaSenhaForm. O servidor só veste a página com a marca da
   igreja lembrada no aparelho (cookie cex_church_slug), quando houver. */
export default async function NovaSenhaPage() {
  const jar = await cookies();
  const slug = jar.get("cex_church_slug")?.value;
  const church = slug && /^[a-z0-9-]{3,40}$/.test(slug) ? await getChurchPageBySlug(slug) : null;
  const brand: BrandCfg | undefined = church ? { accent: church.serviceAccent } : undefined;
  const mode = resolveMode(jar.get(THEME_COOKIE)?.value, brand);

  return (
    <main className="ld-sec" style={{ minHeight: "100dvh", background: "var(--ink)" }}>
      <ServiceTheme brand={brand} mode={mode} />
      <div className="ld-wrap">
        <section className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
          <div className="card-body">
            <p className="eyebrow" style={{ color: "var(--olive)" }}>{church?.name ? `${church.name} · Service` : "Service"}</p>
            <NovaSenhaForm loginHref={church ? `/${church.slug}/entrar` : "/service/login"} />
          </div>
        </section>
      </div>
    </main>
  );
}
