"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { formatDateBR, joinDot } from "../../lib/date";

import { useTermos } from "../../lib/vocabulario-context";
import { Av } from "../ui";
import { DrawerSection, DrawerShell } from "../campos";
import { PersonTimeline } from "./FichaPessoa";
import { BAT_ST_MAP, timelineEventPayload } from "../comum";
import type { BaptismCandidateView, BaptismClassView, ChurchView, DecisionView, MemberView, PersonView, TimelineEventView } from "../tipos";

import { Botao, botaoClasse, BotaoIcone } from "../../ui/Botao";
import { Selo, tomDaClasse } from "../../ui/Selo";
export function DecisaoDrawer({
  decision, people, members, church, timelineEvents, onClose, onOpenMember,
}: {
  decision: DecisionView; people: PersonView[]; members: MemberView[]; church: ChurchView | undefined;
  timelineEvents: TimelineEventView[];
  onClose: () => void; onOpenMember: (id: string) => void;
}) {
  const { termo, comTermos: ct } = useTermos();
  const router = useRouter();
  const responsible = decision.responsible_id ? people.find((p) => p.id === decision.responsible_id) : null;
  const linkedMember = decision.member_id ? members.find((m) => m.id === decision.member_id) : null;
  const [loading, setLoading] = useState(false);

  const encaminhar = async () => {
    setLoading(true);
    const sb = createServiceBrowserClient().schema("service");
    if (church?.organizationId && church.id) {
      await sb.from("visitors").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: decision.name,
        phone: decision.phone || null,
        origin: "Decisão no culto",
        visited_on: decision.happened_on || null,
        responsible_id: decision.responsible_id || null,
        stage: "novo",
        due: "1º contato",
        due_status: "soon",
      });
    }
    await sb.from("decisions").update({ status: "acompanhando" }).eq("id", decision.id);
    router.refresh();
    setLoading(false);
    onClose();
  };

  const DEC_CHIP: Record<string, { label: string; cls: string }> = {
    novo: { label: "A contatar", cls: "chip-wait" },
    acompanhando: { label: "Acompanhando", cls: "chip-ok" },
    encaminhado: { label: "Encaminhado", cls: "chip-neutral" },
  };
  const chip = DEC_CHIP[decision.status] ?? DEC_CHIP.novo;

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={onClose}>✕</BotaoIcone>
        <div className="profile-top">
          <Av name={decision.name} size="lg" />
          <div>
            <div className="profile-name">{decision.name}</div>
            <div className="profile-role">{decision.kind === "reconciliacao" ? "Reconciliação" : "Decisão"} · {formatDateBR(decision.happened_on) || "sem data"}{decision.age ? ` · ${decision.age} anos` : ""}</div>
            <div style={{ marginTop: 10 }}><Selo tom={tomDaClasse(chip.cls)}>{chip.label}</Selo></div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Registro da decisão">
          <dl className="kv">
            <dt>Telefone</dt><dd>{decision.phone || "-"}</dd>
            <dt>{ct("{Culto}")}</dt><dd>{decision.service_name || "-"}</dd>
            <dt>Responsável</dt><dd>{responsible?.name || "a definir"}</dd>
          </dl>
          {decision.notes && (
            <div style={{ marginTop: 14, fontSize: "var(--fs-pn-14)", color: "var(--light)", lineHeight: 1.6, padding: "14px 16px", background: "var(--ink)", borderRadius: "var(--r-md)", border: "0.5px solid var(--border-2)" }}>
              <span style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)", display: "block", marginBottom: 6 }}>Observação</span>
              {decision.notes}
            </div>
          )}
        </DrawerSection>
        {linkedMember && (
          <DrawerSection title={ct("{Caminhada} do membro")}>
            <PersonTimeline member={linkedMember} events={timelineEvents.filter((e) => e.member_id === linkedMember.id)} compact />
          </DrawerSection>
        )}
        <DrawerSection title="Próximos passos">
          <div className="step-stack">
            <div className="step-do"><span className="step-ic">→</span> Fazer o primeiro contato (ligar · WhatsApp)</div>
            <div className="step-do"><span className="step-ic">→</span> Iniciar acompanhamento 1-a-1</div>
            <div className="step-do"><span className="step-ic">→</span> Matricular em Novos Convertidos</div>
            {(church?.settings?.gruposCfg?.ativo ?? true) && <div className="step-do"><span className="step-ic">→</span> Inserir num {termo("grupo")}</div>}
          </div>
        </DrawerSection>
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          {linkedMember
            ? <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => { onClose(); onOpenMember(linkedMember.id); }}>Ver ficha</Botao>
            : <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={encaminhar} desativado={loading}>{loading ? "Salvando…" : "Encaminhar"}</Botao>
          }
        </div>
      </div>
    </DrawerShell>
  );
}

export function AddCandidatoModal({
  classData, existingIds, members, church, onClose, onRefresh,
}: {
  classData: BaptismClassView; existingIds: string[]; members: MemberView[];
  church: ChurchView; onClose: () => void; onRefresh: () => void;
}) {
  const [q, setQ] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const available = members.filter((m) => !existingIds.includes(m.id) && (!q || m.name.toLowerCase().includes(q.toLowerCase())));

  const addCandidate = async (memberId: string) => {
    setSaving(memberId);
    await createServiceBrowserClient().schema("service").from("baptism_candidates").insert({ organization_id: church.organizationId, class_id: classData.id, member_id: memberId });
    onRefresh();
    setSaving(null);
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Adicionar candidato</div>
          <div className="modal-title">{classData.label}</div>
          <div className="modal-sub">Escolha quem será batizado nesta turma.</div>
        </div>
        <div className="modal-body" style={{ display: "block", maxHeight: 360, overflowY: "auto" }}>
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder="Buscar membro…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {available.map((m) => (
            <div className="flag-row" key={m.id} style={{ cursor: "pointer" }} onClick={() => addCandidate(m.id)}>
              <Av name={m.name} size="sm" />
              <div className="flag-main">
                <div className="flag-nome">{m.name}</div>
                <div className="flag-meta">{m.neighborhood || "Membro"}</div>
              </div>
              <span className={botaoClasse({ variante: "discreto", compacto: true })}>{saving === m.id ? "…" : "Adicionar"}</span>
            </div>
          ))}
          {available.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)", padding: "16px 0" }}>Nenhum membro disponível.</div>}
        </div>
        <div className="modal-foot">
          <Botao variante="principal" onClick={onClose}>Concluído</Botao>
        </div>
      </div>
    </div>
  );
}

export function BatismoDrawer({
  classData, candidates, members, decisions, church, onClose, onOpenMember, onRefresh,
}: {
  classData: BaptismClassView; candidates: BaptismCandidateView[]; members: MemberView[];
  decisions: DecisionView[]; church: ChurchView | undefined;
  onClose: () => void; onOpenMember: (id: string) => void; onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [concluindo, setConcluindo] = useState(false);
  const classCandidates = candidates.filter((c) => c.class_id === classData.id);
  const memberById = new Map(members.map((m) => [m.id, m]));
  const decisionById = new Map(decisions.map((d) => [d.id, d]));
  const existingMemberIds = classCandidates.map((c) => c.member_id).filter(Boolean) as string[];
  const st = BAT_ST_MAP[classData.status ?? "aberta"];
  const concluida = classData.status === "concluida";

  const dispararAcao = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(""), 2500);
  };

  const concluirTurma = async () => {
    if (!church?.organizationId) return;
    setConcluindo(true);
    const sb = createServiceBrowserClient().schema("service");
    await sb.from("baptism_classes").update({ status: "concluida" }).eq("id", classData.id);
    for (const cand of classCandidates) {
      if (!cand.member_id) continue;
      const member = memberById.get(cand.member_id);
      if (!member) continue;
      await sb.from("timeline_events").insert(
        timelineEventPayload(church.organizationId, member.id, "batismo", "Batismo nas águas", classData.baptism_date),
      );
      const journey = [...member.journey];
      journey[1] = 1;
      await sb.from("members").update({ journey }).eq("id", member.id);
    }
    setConcluindo(false);
    onRefresh();
  };

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo="Fechar" onClick={onClose}>✕</BotaoIcone>
        <div className="profile-top">
          <div className="bat-mark"><Icon name="batismos" size={22} /></div>
          <div>
            <div className="profile-name">{classData.label}</div>
            <div className="profile-role">{joinDot(formatDateBR(classData.baptism_date), classData.location)}</div>
            <div style={{ marginTop: 10 }}><Selo tom={tomDaClasse(st?.cls ?? "chip-wait")}>{st?.label ?? classData.status}</Selo></div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title="Detalhes">
          <dl className="kv">
            <dt>Data</dt><dd>{formatDateBR(classData.baptism_date) || "-"}</dd>
            <dt>Local</dt><dd>{classData.location || "-"}</dd>
            <dt>Pastor</dt><dd>{classData.pastor || "-"}</dd>
            {classData.notes ? <><dt>Observação</dt><dd>{classData.notes}</dd></> : null}
          </dl>
        </DrawerSection>
        <DrawerSection title={`Candidatos · ${classCandidates.length}`}>
          {classCandidates.map((cand) => {
            const member = cand.member_id ? memberById.get(cand.member_id) : null;
            const decision = cand.decision_id ? decisionById.get(cand.decision_id) : null;
            const name = member?.name ?? decision?.name ?? "Candidato";
            return (
              <div key={cand.id} className="cand" style={member ? { cursor: "pointer" } : {}} onClick={() => member && onOpenMember(member.id)}>
                <Av name={name} size="sm" />
                <div className="cand-main">
                  <div className="cand-name">{name}</div>
                  <div className="cand-meta">{member ? "Membro" : "Nova decisão"}</div>
                </div>
                {member ? <span className="cand-fit good">ver →</span> : <span className="cand-fit busy">decisão</span>}
              </div>
            );
          })}
          {classCandidates.length === 0 && <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum candidato ainda.</div>}
        </DrawerSection>
        <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
          <Botao variante="principal" style={{ flex: 1, justifyContent: "center" }} onClick={() => setShowAdd(true)}>+ Adicionar candidato</Botao>
          {concluida
            ? <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => dispararAcao("Certificados gerados para os batizados.")}>Emitir certificados</Botao>
            : <Botao style={{ flex: 1, justifyContent: "center" }} onClick={() => dispararAcao("Aviso enviado aos candidatos.")}>Avisar candidatos</Botao>}
        </div>
        {!concluida && (
          <Botao variante="principal" style={{ width: "100%", justifyContent: "center", marginTop: 10 }} desativado={concluindo} onClick={concluirTurma}>
            {concluindo ? "Concluindo…" : "Marcar turma como realizada →"}
          </Botao>
        )}
        {actionMsg && <div style={{ marginTop: 12, fontSize: "var(--fs-pn-13)", color: "var(--olive-soft)", textAlign: "right" }}><Icon name="ok" size={14} /> {actionMsg}</div>}
      </div>
      {showAdd && church && (
        <AddCandidatoModal
          classData={classData}
          existingIds={existingMemberIds}
          members={members}
          church={church}
          onClose={() => setShowAdd(false)}
          onRefresh={onRefresh}
        />
      )}
    </DrawerShell>
  );
}
