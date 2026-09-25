import { themeCss, type BrandCfg, type ThemeMode } from "./lib/theme";

/* Tema da igreja em qualquer tela do Service: variáveis dos dois modos, com
   o modo desta pessoa já aplicado na primeira pintura. Uma linha por página:
   <ServiceTheme brand={brandCfgDaMatriz} mode={resolveMode(cookie, brand)} />.
   Ver app/service/lib/theme.ts. */
export default function ServiceTheme({ brand, mode }: { brand: BrandCfg | undefined; mode: ThemeMode }) {
  return <style dangerouslySetInnerHTML={{ __html: themeCss(brand, mode) }} />;
}
