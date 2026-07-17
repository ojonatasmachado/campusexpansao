import { LOGO_FONTS } from "../lib/church-page";
import type { ChurchPageData } from "../lib/church-page";

/* Logo do cabeçalho : imagem enviada (padrão) ou o nome em texto, numa das
   fontes curadas, pra igreja que ainda não tem uma logo pronta. Fonte única
   pros 3 templates, igual LinkThumb pros links. */
export default function LogoMark({ data }: { data: ChurchPageData }) {
  if (data.pagina.logoMode === "texto") {
    const font = LOGO_FONTS[data.pagina.logoFont] ?? LOGO_FONTS.inter;
    return (
      <div
        className="cx-logo-text"
        style={{ fontFamily: font.family, fontWeight: font.weight, textAlign: data.pagina.logoAlign ?? "center" }}
      >
        {data.pagina.logoText || data.name}
      </div>
    );
  }

  if (data.logoUrl) {
    return <img src={data.logoUrl} alt={data.name} className="cx-logo" />;
  }

  return null;
}
