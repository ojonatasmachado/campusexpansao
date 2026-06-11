import Nav from "../components/Nav";
import Footer from "../components/Footer";
import MateriaisContent from "../components/MateriaisContent";
import { supabase } from "../lib/supabase";

export const revalidate = 60; // revalida a cada 60s em produção

export default async function Materiais() {
  const [{ data: estantes }, { data: materiais }] = await Promise.all([
    supabase.from('estantes').select('*').order('ord'),
    supabase.from('materiais').select('*').eq('status', 'Publicado').order('created_at'),
  ])

  return (
    <div className="pg">
      <Nav />
      <MateriaisContent
        showHero={true}
        showCrossLink={true}
        dbEstantes={estantes ?? undefined}
        dbMateriais={materiais ?? undefined}
      />
      <Footer />
    </div>
  );
}
