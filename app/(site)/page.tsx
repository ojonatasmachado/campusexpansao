import Nav from "../components/Nav";
import Footer from "../components/Footer";
import MateriaisContent from "../components/MateriaisContent";
import { CursosNiveis } from "../components/CursoCard";
import FaqAccordion from "../components/FaqAccordion";
import ScrollTop from "../components/ScrollTop";
import styles from "./page.module.css";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { requestLocale } from "../lib/i18n";
import { applyMaterialTranslations } from "../lib/material-translations";

export const revalidate = 60;

const FAQ_ITEMS = [
  { q: "Para quem é a CE.X?", a: "Para líderes de igrejas locais que querem preparar sua equipe com estrutura, independente de denominação ou tamanho da igreja." },
  { q: "Como funciona a compra dos materiais?", a: "Cada material é adquirido individualmente pelo checkout da CE.X. Após a compra, você recebe o arquivo editável diretamente, pronto para aplicar na sua igreja." },
  { q: "Os cursos têm acompanhamento?", a: "Sim. As turmas ao vivo têm mentoria e acompanhamento direto. O conteúdo gravado fica disponível para assistir no seu ritmo." },
  { q: "Como funciona o método CE.X?", a: "Estrutura ministerial aplicada: diagnóstico, princípios bíblicos e ferramentas práticas que você implementa na mesma semana." },
];

export default async function Home() {
  const locale = await requestLocale();
  const [{ data: estantes }, { data: materiais }, { data: cursos }, { data: mentorias }] = await Promise.all([
    supabase.from('estantes').select('*').order('ord'),
    supabase.from('materiais').select('*').eq('status', 'Publicado').order('created_at'),
    supabase.from('cursos').select('*').eq('status', 'Publicado').order('num'),
    supabase.from('mentorias').select('*').eq('status', 'Publicado').order('created_at'),
  ]);
  const translatedMateriais = await applyMaterialTranslations(materiais ?? [], locale);
  const hasMateriais = (materiais?.length ?? 0) > 0;
  const hasCursos = ((cursos?.length ?? 0) + (mentorias?.length ?? 0)) > 0;

  return (
    <div className={`pg ${styles.homePage}`}>
      <Nav />

      {/* HERO */}
      <div className="home-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-x" aria-hidden="true">X</div>
        <div className="pg-wrap">
          <div className="hero-inner">
            <div className="hero-eyebrow">Campus Expansão</div>
            <h1 className="hero-title">
              Nós preparamos.<br /><em>Deus multiplica.</em>
            </h1>
            <p className="hero-desc">
              Estrutura ministerial para líderes de igreja locais. Materiais, formação e ferramentas pra preparar trabalhadores fiéis.
            </p>
            {(hasMateriais || hasCursos) && (
              <div className="hero-actions">
                {hasMateriais && (
                  <Link href="/materiais" className="btn btn-primary btn-lg btn-arrow">Conhecer materiais</Link>
                )}
                {hasCursos && (
                  <Link href="/cursos" className="btn btn-secondary btn-lg">Conhecer cursos</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* O QUE É A CE.X */}
      <div id="sobre" className={`pg-wrap pg-section ${styles.aboutSection}`}>
        <div className="psec-eyebrow">◆ O que é a CE.X</div>
        <p className="about-lead" style={{ marginBottom: 40 }}>
          A maioria das igrejas não tem problema de fé. Tem problema de <em>estrutura.</em>
        </p>
        <div className="about-cols" style={{ marginTop: 0 }}>
          <div className="about-col">
            <p>A CE.X existe para preparar trabalhadores, porque a colheita é grande e o preparo não pode ser negligente.</p>
            <p>Não substituímos o agir de Deus. Preparamos o que cabe a nós.</p>
          </div>
          <div className="about-col">
            <p>Começamos formando líderes dentro de uma única igreja local. O método funcionou, multiplicou, e virou Campus Expansão: um sistema replicável de preparo ministerial.</p>
            <p>Hoje servimos centenas de equipes que querem crescer com saúde, sem depender de uma pessoa só.</p>
          </div>
        </div>
        <div className="about-values" style={{ marginTop: 40 }}>
          <div className="value">
            <div className="value-letter value-letter-ce">CE</div>
            <div className="value-title">Campus Expansão</div>
            <div className="value-desc">A parte que cabe a nós: ensino, estrutura, preparo, formação.</div>
          </div>
          <div className="value">
            <div className="value-letter">.</div>
            <div className="value-title">Multiplicação</div>
            <div className="value-desc">O ponto que une o trabalho humano ao agir divino.</div>
          </div>
          <div className="value">
            <div className="value-letter">X</div>
            <div className="value-title">Variável divina</div>
            <div className="value-desc">O crescimento que só Deus dá e que nos mantém em dependência.</div>
          </div>
        </div>
      </div>

      {/* MATERIAIS : dados do banco */}
      <div id="materiais">
        <div className={`pg-wrap pg-section ${styles.materialsIntro}`}>
          <div className="psec-title">Materiais</div>
        </div>
        <MateriaisContent
          showHero={false}
          showCrossLink={false}
          dbEstantes={estantes ?? undefined}
          dbMateriais={translatedMateriais}
        />
      </div>

      {/* CURSOS : dados do banco */}
      <div id="cursos" className="pg-wrap pg-section" style={{ paddingBottom: 0 }}>
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">◆ Formação ao vivo</div>
            <div className="psec-title">Cursos &amp; <em>Mentorias</em></div>
          </div>
          <Link href="/cursos" className="btn btn-ghost btn-arrow">Conhecer formação ao vivo</Link>
        </div>
      </div>
      <div className="pg-wrap" style={{ paddingBottom: 64 }}>
        <CursosNiveis dbCursos={cursos ?? undefined} dbMentorias={mentorias ?? undefined} />
      </div>

      {/* FAQ */}
      <div className={`pg-wrap pg-section ${styles.faqSection}`}>
        <div className="psec-head">
          <div className="psec-head-left">
            <div className="psec-eyebrow">◆ Dúvidas frequentes</div>
            <div className="psec-title">Perguntas</div>
          </div>
        </div>
        <FaqAccordion items={FAQ_ITEMS} />
      </div>

      {/* CTA FINAL */}
      <div className={`pg-wrap pg-section ${styles.finalCtaSection}`}>
        <div className="cta-block">
          <div className="cta-x">X</div>
          <div className="cta-eyebrow">◆ Comece hoje</div>
          <h2 className="cta-title">Prepare sua <em>equipe.</em></h2>
          <p className="cta-desc">Escolha o material certo para o seu momento e comece a aplicar esta semana.</p>
          <div className="cta-actions">
            <Link href="/materiais" className="btn btn-ink btn-lg btn-arrow">Ver materiais</Link>
          </div>
        </div>
      </div>

      {/* QUIZ */}
      <div className={`pg-wrap pg-section ${styles.quizSection}`}>
        <div className="capture">
          <div className="capture-x">X</div>
          <div className="capture-eyebrow">◆ Descubra seu chamado</div>
          <h3 className="capture-title">Sua <em>Vocação</em></h3>
          <p className="capture-desc">
            Qual dos cinco ministérios de Efésios 4:11 representa o seu chamado? Responda 12 perguntas e descubra onde sua liderança tem mais impacto.
          </p>
          <a href="/quiz" className="capture-btn">Fazer o quiz →</a>
        </div>
      </div>

      <Footer />
      <ScrollTop />
    </div>
  );
}
