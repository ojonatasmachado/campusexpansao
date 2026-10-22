import { cookies } from "next/headers";
import ServiceTheme from "../../ServiceTheme";
import { resolveMode, THEME_COOKIE, type BrandCfg } from "../../lib/theme";
import Galeria from "./Galeria";

/* Galeria viva da biblioteca (BIBLIOTECA.md): as peças reais de app/service/ui,
   no tema da igreja. ?cor=, ?escuro=, ?claro= e ?modo= como na demo. */
export default async function BibliotecaPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const q = await searchParams;
  const brand: BrandCfg = {
    accent: q.cor,
    neutralDark: q.escuro,
    neutralLight: q.claro,
    defaultMode: q.modo === "light" ? "light" : q.modo === "dark" ? "dark" : undefined,
  };
  const modo = q.modo === "light" || q.modo === "dark" ? q.modo : resolveMode((await cookies()).get(THEME_COOKIE)?.value, brand);
  return (
    <>
      <ServiceTheme brand={brand} mode={modo} />
      <Galeria />
    </>
  );
}
