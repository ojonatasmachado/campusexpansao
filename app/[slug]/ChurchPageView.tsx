import type { CSSProperties } from "react";
import type { ChurchPageData } from "../lib/church-page";
import { accentInk, resolveBackground } from "../lib/church-page";
import TemplateSimples from "./templates/TemplateSimples";
import TemplateVitrine from "./templates/TemplateVitrine";
import TemplateEditorial from "./templates/TemplateEditorial";
import SocialRow from "./SocialRow";
import ViewPing from "./ViewPing";

const TEMPLATES = {
  simples: TemplateSimples,
  vitrine: TemplateVitrine,
  editorial: TemplateEditorial,
};

export default function ChurchPageView({ data, preview }: { data: ChurchPageData; preview?: boolean }) {
  const Template = TEMPLATES[data.pagina.template] ?? TemplateSimples;

  const vars = {
    "--cx-bg": resolveBackground(data.pagina),
    "--cx-text": data.pagina.textColor,
    "--cx-accent": data.pagina.accentColor,
    "--cx-accent-ink": accentInk(data.pagina.accentColor),
    "--cx-box": data.pagina.boxColor,
  } as CSSProperties;

  return (
    <div className={`cx-page tpl-${data.pagina.template}`} style={vars}>
      {!preview && <ViewPing churchId={data.id} />}
      <div className="cx-shell">
        <Template data={data} preview={preview} />
        <SocialRow social={data.pagina.social} />
        <footer className="cx-footer">
          <a href="https://campusexpansao.com" target="_blank" rel="noopener noreferrer">
            Página criada com CE.X Service
          </a>
        </footer>
      </div>
    </div>
  );
}
