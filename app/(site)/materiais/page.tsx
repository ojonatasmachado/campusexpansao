import Nav from "../../components/Nav";
import Footer from "../../components/Footer";
import MateriaisContent from "../../components/MateriaisContent";
import { supabase } from "../../lib/supabase";
import { requestLocale } from "../../lib/i18n";
import { applyMaterialTranslations } from "../../lib/material-translations";

export const revalidate = 60; // revalida a cada 60s em produção

export default async function Materiais() {
  const locale = await requestLocale();
  const [{ data: estantes }, { data: materiais }] = await Promise.all([
    supabase.from('estantes').select('*').order('ord'),
    supabase.from('materiais').select('*').eq('status', 'Publicado').order('created_at'),
  ])
  const translatedMateriais = await applyMaterialTranslations(materiais ?? [], locale);

  return (
    <div className="pg">
      <Nav />
      <MateriaisContent
        showHero={true}
        showCrossLink={true}
        dbEstantes={estantes ?? undefined}
        dbMateriais={translatedMateriais}
      />
      <Footer />
    </div>
  );
}
