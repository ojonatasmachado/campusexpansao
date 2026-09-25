"use client";

import { JOURNEY_REQ_STEPS, requirementLabel, type Requirement } from "./lib/requirements";

/* subtítulo em cinza médio (texto secundário do Brand Book 3.2): o título da
   seção fica com quem usa o editor, estes só agrupam as opções */
const SUBLABEL = { color: "var(--muted)", fontWeight: 500 } as const;

/* Editor único de pré-requisitos (curso, time e "Quero servir"). A igreja
   escolhe etapas da jornada, cursos concluídos e eventos com presença
   registrada; a pessoa precisa cumprir todos. Ver app/service/lib/requirements.ts. */
export default function RequisitosEditor({
  value,
  onChange,
  courses,
  events,
  groupsLabel,
}: {
  value: Requirement[];
  onChange: (next: Requirement[]) => void;
  courses: { id: string; name: string }[];
  events: { id: string; name: string; eventDate?: string }[];
  groupsLabel?: string;
}) {
  const has = (kind: Requirement["kind"], ref: string) => value.some((r) => r.kind === kind && r.ref === ref);
  const toggle = (kind: Requirement["kind"], ref: string) =>
    onChange(has(kind, ref) ? value.filter((r) => !(r.kind === kind && r.ref === ref)) : [...value, { kind, ref }]);
  const chosenEvents = value.filter((r) => r.kind === "event");
  const openEvents = events.filter((e) => !has("event", e.id));

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div>
        <div className="field-label" style={SUBLABEL}>Etapas da jornada</div>
        <div className="seg-check">
          {JOURNEY_REQ_STEPS.map((s) => (
            <button key={s.ref} type="button" className={`seg-chip${has("journey", s.ref) ? " on" : ""}`} onClick={() => toggle("journey", s.ref)}>
              {s.ref === "integracao" && groupsLabel ? groupsLabel : s.label}
            </button>
          ))}
        </div>
      </div>

      {courses.length > 0 && (
        <div>
          <div className="field-label" style={SUBLABEL}>Cursos concluídos</div>
          <div className="seg-check">
            {courses.map((c) => (
              <button key={c.id} type="button" className={`seg-chip${has("course", c.id) ? " on" : ""}`} onClick={() => toggle("course", c.id)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {events.length > 0 && (
        <div>
          <div className="field-label" style={SUBLABEL}>Participou do evento (pelo check-in)</div>
          {chosenEvents.length > 0 && (
            <div className="seg-check" style={{ marginBottom: 8 }}>
              {chosenEvents.map((r) => (
                <button key={r.ref} type="button" className="seg-chip on" onClick={() => toggle("event", r.ref)} title="Remover">
                  {requirementLabel(r, { courses, events }).replace(/^Participou: /, "")} ×
                </button>
              ))}
            </div>
          )}
          {openEvents.length > 0 && (
            <select className="select" value="" onChange={(e) => e.target.value && toggle("event", e.target.value)}>
              <option value="">Adicionar evento...</option>
              {openEvents.map((e) => (
                <option key={e.id} value={e.id}>{e.eventDate ? `${e.name} · ${e.eventDate}` : e.name}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {value.length === 0 && <div style={{ fontSize: 12, color: "var(--subtle)" }}>Sem pré-requisito: qualquer membro pode.</div>}
    </div>
  );
}
