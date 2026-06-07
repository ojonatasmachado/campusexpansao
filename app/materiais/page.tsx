"use client";
import Nav from "../components/Nav";
import Footer from "../components/Footer";

const materiais = [
  { num: "01", title: <>A igreja que <em>discipula</em></>, meta: "Manual prático · 64 páginas", type: "PDF" },
  { num: "02", title: <>5 sinais de uma equipe sem sistema</>, meta: "E-book diagnóstico · 32 páginas", type: "PDF" },
  { num: "03", title: <>Checklist de <em>revisão de culto</em></>, meta: "Ferramenta imprimível · 2 páginas", type: "PDF" },
  { num: "04", title: <>Planilha de estrutura de equipe</>, meta: "Template editável", type: "Sheets" },
  { num: "05", title: <>Roteiro de <em>reunião de líderes</em></>, meta: "Guia + template · 8 páginas", type: "PDF" },
];

export default function Materiais() {
  return (
    <div className="pg">
      <Nav />

      <div className="pg-wrap pg-section">
        <div className="hero-eyebrow" style={{ display: "flex" }}>— Biblioteca gratuita</div>
        <h1 className="t-display" style={{ marginBottom: 16 }}>Materiais <em>CE.X</em></h1>
        <p className="t-body-lg" style={{ maxWidth: 560 }}>
          Apostilas, checklists e ferramentas pra estruturar seu ministério. Tudo gratuito — só pedimos seu e-mail.
        </p>
      </div>

      <div className="pg-wrap pg-section tight">
        <div className="mat-list">
          {materiais.map((m) => (
            <a href="/landing" className="mat-item" key={m.num}>
              <div className="mat-num">{m.num}</div>
              <div className="mat-body">
                <div className="mat-title">{m.title}</div>
                <div className="mat-meta">{m.meta}</div>
              </div>
              <div className="mat-type">{m.type}</div>
            </a>
          ))}
        </div>
      </div>

      <div className="pg-wrap pg-section">
        <div className="capture">
          <div className="capture-x">X</div>
          <div className="capture-eyebrow">— Acesso completo</div>
          <h3 className="capture-title">Receba <em>todos os materiais</em></h3>
          <p className="capture-desc">Cadastre-se uma vez e tenha acesso a tudo, incluindo lançamentos futuros.</p>
          <form className="capture-form" onSubmit={(e) => e.preventDefault()}>
            <input className="input" type="email" placeholder="Seu melhor e-mail" />
            <button type="submit" className="capture-btn">Liberar acesso</button>
          </form>
        </div>
      </div>

      <Footer minimal />
    </div>
  );
}
