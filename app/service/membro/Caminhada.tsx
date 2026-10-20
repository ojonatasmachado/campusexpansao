"use client";

import { useContext, useState } from "react";
import { plural } from "../lib/plural";
import { Icon } from "../lib/icons";
import { joinDot } from "../lib/date";
import { useTermos } from "../lib/vocabulario-context";
import { porData, quandoFoi, tipoDoFato, type FatoView } from "../lib/historico";
import { listaFinalidades, type ContribuirCfg } from "../modules/contribuir/pix";
import { JourneyContext, M6Row, MemberUiContext, mensagemAcao, useFaltas } from "./comum";
import type { JourneyStep, M, Ministry, P, StepView } from "./tipos";

/* "Quero servir" (service.request_to_serve): times em que a pessoa ainda não
   está. A igreja define o que precisa antes (requisitos de "servir" e do
   time); com algo faltando, o app mostra o que falta. O pedido vai pra
   liderança aprovar no painel (Times). */
export function ServirSection({ person, member, ministries, members = [], people = [] }: { person: P; member: M | null; ministries: Ministry[]; members?: M[]; people?: P[] }) {
  const j = useContext(JourneyContext);
  const faltas = useFaltas();
  const [enviados, setEnviados] = useState<Record<string, string>>({});
  if (!member || !j.onRequestServe) return null;
  const fora = ministries.filter((m) => !m.people.some((mp) => mp.personId === person.id));
  if (fora.length === 0) return null;
  const faltasServir = faltas("serve", null);
  const pendente = (ministryId: string) =>
    enviados[ministryId] === "ok" || j.serveRequests.some((r) => r.member_id === member.id && r.ministry_id === ministryId && r.status === "pendente");

  return (
    <>
            {faltasServir.length > 0 ? (
        <div className="m-card">
          <div className="m-fn" style={{ marginBottom: 0 }}>
            <b>Antes de servir num time:</b> {faltasServir.join(" · ")}
          </div>
        </div>
      ) : (
        fora.map((m) => {
          const faltasTime = faltas("ministry", m.id);
          const resultado = enviados[m.id];
          return (
            <div className="m-card" key={m.id}>
              <div className="m-culto" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icon name={m.icon || "times"} size={18} /> {m.name}
              </div>
              {m.description && <p className="m6-txt" style={{ margin: "6px 0 0" }}>{m.description}</p>}
              {(() => {
                const lider = m.people.find((x) => x.isLeader);
                const nome = lider ? (people.find((pp) => pp.id === lider.personId)?.name ?? members.find((mm) => mm.volunteerId === lider.personId)?.name) : null;
                return nome ? <div className="m6-meta" style={{ marginTop: 4 }}>Líder · {nome}</div> : null;
              })()}
              {pendente(m.id) ? (
                <div className="m-confirmed" style={{ marginTop: 10 }}><Icon name="ok" size={15} /> Pedido enviado · o líder vai falar com você.</div>
              ) : faltasTime.length > 0 ? (
                <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginTop: 8, lineHeight: 1.5 }}>
                  <b style={{ color: "var(--light)" }}>Para entrar:</b> {faltasTime.join(" · ")}
                </div>
              ) : (
                <>
                  <button
                    className="m-btn m-btn-ok ghost"
                    style={{ width: "100%", marginTop: 10 }}
                    disabled={resultado === "enviando"}
                    onClick={async () => {
                      setEnviados((p) => ({ ...p, [m.id]: "enviando" }));
                      const r = await j.onRequestServe!(m.id);
                      setEnviados((p) => ({ ...p, [m.id]: r === "ok" ? "ok" : mensagemAcao(r) }));
                    }}
                  >
                    {resultado === "enviando" ? "Enviando..." : "Quero servir neste time"}
                  </button>
                  {resultado && resultado !== "enviando" && resultado !== "ok" && (
                    <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 6 }}>{resultado}</div>
                  )}
                </>
              )}
            </div>
          );
        })
      )}
    </>
  );
}

// ── Minha história (v7 4.8, lei 10) ───────────────────────────────────────────
/* Só os fatos, com data, do mais recente para o mais antigo. Sem contagem,
   sem pontos e sem comparação com outras pessoas. */
export function MinhaHistoria({ fatos }: { fatos: FatoView[] }) {
  const { comTermos: ct } = useTermos();
  const lista = porData(fatos);
  if (!lista.length) {
    return (
      <div className="m6-sec0">
        <div className="m6-card"><div className="m6-ct">Sua história começa aqui</div><div className="m6-meta">{ct("Quando você servir, concluir uma aula ou der um passo na {caminhada}, fica registrado aqui. Só você vê.")}</div></div>
      </div>
    );
  }
  return (
    <div className="m6-sec0">
      <div className="m6-meta m6-pad">Só você vê esta página.</div>
      <div className="m6-list">
        {lista.map((f) => {
          const t = tipoDoFato(f.event_type);
          return (
            <div className="m6-row" key={f.id}>
              <span className="m6-ic"><Icon name={t.icone} size={22} /></span>
              <span className="m6-rb">
                <span className="m6-rt">{f.title}</span>
                <span className="m6-rs">{joinDot(quandoFoi(f), f.body)}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
export const STW = { feito: "Concluída", andamento: "Em andamento", afazer: "A fazer" } as const;

export function SheetPedidoEtapa({ step, nome, member, onRequestJourneyStep }: { step: JourneyStep; nome: string; member: M | null; onRequestJourneyStep?: (memberId: string, step: JourneyStep, eventDate: string, note: string) => void }) {
  const { comTermos: ct } = useTermos();
  const ui = useContext(MemberUiContext);
  const [data, setData] = useState("");
  const [nota, setNota] = useState("");
  return (
    <div>
      <h2 className="m6-sh">{nome}</h2>
      <div className="m6-meta">Conte quando aconteceu. {ct("A liderança confirma e a etapa fica marcada na sua {caminhada}.")}</div>
      <div className="field" style={{ marginTop: 14 }}><label className="field-label">Quando foi?</label><input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
      <div className="field"><label className="field-label">Quer contar mais? (opcional)</label><input className="input" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ex.: aconteceu em outra igreja" /></div>
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!data || !member || !onRequestJourneyStep} onClick={() => {
          if (!member || !onRequestJourneyStep) return;
          onRequestJourneyStep(member.id, step, data, nota);
          ui.sheet(null);
          ui.toast("Pedido enviado · a liderança vai confirmar");
        }}>Enviar</button>
      </div>
    </div>
  );
}

export function SheetTimes({ person, member, ministries, members, people }: { person: P; member: M | null; ministries: Ministry[]; members: M[]; people: P[] }) {
  return (
    <div>
      <h2 className="m6-sh">Times que procuram pessoas</h2>
      <div className="m6-meta">Escolha um time. O líder recebe seu pedido e fala com você.</div>
      <ServirSection person={person} member={member} ministries={ministries} members={members} people={people} />
    </div>
  );
}

export function CaminhadaV6({ steps, courses, purpose, contribuir }: { steps: StepView[]; courses: React.ReactNode; purpose?: { kick?: string | null; title?: string | null; text?: string | null } | null; contribuir?: ContribuirCfg | null }) {
  const ui = useContext(MemberUiContext);
  const { comTermos: ct } = useTermos();
  const done = steps.filter((s) => s.st === "feito").length;
  const tudoFeito = steps.length > 0 && done === steps.length;
  /* tudo concluído: as etapas viram uma linha, que abre a lista com as datas */
  const [verEtapas, setVerEtapas] = useState(false);
  return (
    <>
      <div className="m6-sec0">
        <div className="m6-card">
          <div className="m6-ct">{steps.length > 0 && done === steps.length ? "Todas as etapas concluídas" : `${done} de ${steps.length} etapas concluídas`}</div>
          <div className="m6-segbar">{steps.map((s) => <i key={s.id} className={s.st} />)}</div>
          <div className="m6-meta">{steps.length > 0 && done === steps.length ? ct("Daqui pra frente, a {caminhada} segue nos cursos, no seu time e na leitura da Bíblia, logo abaixo.") : "Cada etapa acontece no seu tempo, em qualquer ordem."}</div>
        </div>
      </div>
      <div className="m6-sec">
        <div className="m6-lbl">Etapas</div>
        {tudoFeito && !verEtapas ? (
          <div className="m6-list"><M6Row ic="ok" t={plural(steps.length, "etapa concluída", "etapas concluídas")} s="Ver as datas de cada uma" onClick={() => setVerEtapas(true)} /></div>
        ) : (
        <div className="m6-steps">
          {steps.map((s) => (
            <div className="m6-step" key={s.id}>
              <span className={`m6-dot ${s.st}`}>{s.st === "feito" ? <Icon name="ok" size={18} /> : s.st === "andamento" ? <Icon name="pendente" size={18} /> : null}</span>
              <div className="m6-rb">
                <div className="m6-rt">{s.nome}</div>
                <div className="m6-stw"><b>{STW[s.st]}</b>{s.info ? ` · ${s.info}` : ""}</div>
                {s.acao && s.run && <div className="m6-mt"><button className={`m6-btn small ${s.st === "andamento" ? "pri" : "sec"}`} type="button" onClick={s.run}>{s.acao} →</button></div>}
              </div>
            </div>
          ))}
        </div>
        )}
      </div>
      <div className="m6-sec">
        <div className="m6-lbl">Cursos</div>
        {courses}
      </div>
      <div className="m6-sec">
        <div className="m6-lbl">Bíblia</div>
        <div className="m6-list"><M6Row ic="biblia" t="Ler a Bíblia" s="Marque versículos e faça anotações" onClick={() => ui.go("caminhada", "biblia")} /></div>
      </div>
      {contribuir && (
        <div className="m6-sec">
          <div className="m6-lbl">Generosidade</div>
          <div className="m6-list"><M6Row ic="semente" t="Contribuir" s={`Pix para ${listaFinalidades(contribuir.finalidades)}`} onClick={() => ui.go("caminhada", "contribuir")} /></div>
        </div>
      )}
      {purpose && (purpose.title || purpose.text) && (
        <div className="m6-sec">
          <div className="m6-lbl">Nossa igreja</div>
          <div className="m6-card">
            {purpose.kick && <div className="m6-kick">{purpose.kick}</div>}
            {purpose.title && <div className="m6-ct">{purpose.title}</div>}
            {purpose.text && <p className="m6-txt">{purpose.text}</p>}
          </div>
        </div>
      )}
    </>
  );
}
