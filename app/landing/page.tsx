"use client";
import Link from "next/link";
import { trackMetricEvent } from "../lib/metrics-client";

export default function Landing() {
  return (
    <div className="pg landing">
      <div className="pg-wrap" style={{ paddingTop: 28 }}>
        <Link href="/" className="nav-logo" style={{ display: "inline-block" }}>
          CE<span className="dot">.</span><span className="x">X</span>
        </Link>
      </div>

      <div className="landing-hero">
        <div className="hero-grid-bg" aria-hidden="true" />
        <div className="hero-x" style={{ right: -100 }} aria-hidden="true">X</div>
        <div className="pg-wrap">
          <div className="landing-inner">
            <div className="landing-badge">Material editável · PDF</div>
            <h1 className="landing-title">A igreja que <em>discipula</em></h1>
            <p className="landing-desc">
              64 páginas com os princípios e checklists pra estruturar o discipulado da sua igreja. Do encontro inicial à formação de líderes.
            </p>
            <form className="landing-form" onSubmit={(e) => {
              e.preventDefault();
              trackMetricEvent({ eventName: "lead_capture", metadata: { form: "landing_manual" } });
            }}>
              <input className="input" type="email" placeholder="Seu melhor e-mail" />
              <button type="submit" className="capture-btn">Quero o manual</button>
            </form>
            <div className="landing-trust">Sem spam · cancele quando quiser · +2.000 líderes já usaram</div>

            <div className="landing-bullets">
              <div className="lbullet">
                <div className="lbullet-icon">01</div>
                <div className="lbullet-title">Diagnóstico</div>
                <div className="lbullet-desc">Identifique onde sua equipe está no esforço, não no sistema.</div>
              </div>
              <div className="lbullet">
                <div className="lbullet-icon">02</div>
                <div className="lbullet-title">Princípios</div>
                <div className="lbullet-desc">A base bíblica que sustenta toda estrutura ministerial saudável.</div>
              </div>
              <div className="lbullet">
                <div className="lbullet-icon">03</div>
                <div className="lbullet-title">Checklists</div>
                <div className="lbullet-desc">Ferramentas prontas pra aplicar já na próxima reunião.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
