"use client";

import { avisar } from "../lib/avisar";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Icon } from "../lib/icons";
import { useRelogioDaIgreja } from "../lib/relogio-context";
import { horaAgoraBR, formatDateBR, joinDot, todayISO } from "../lib/date";
import { suggestKidsClassId, imageAuthorizationCopy } from "../lib/kids";
import { PhotoPicker } from "../PhotoPicker";
import { useTermos } from "../lib/vocabulario-context";
import { checkinAberto, horaQueAbre, sessaoDoCulto, statusDaCrianca, useKidsCheckin } from "../lib/kids-checkin";
import { Av } from "./comum";
import type { Child, ChildGuardian, Ev, KidsAttendance, KidsClass, KidsEvent, KidsEventEnrollment, KidsSession, M, P, WallPost } from "./tipos";

import { Botao } from "../ui/Botao";
import { Acao } from "../ui/Acao";
import { Cartao, cartaoClasse } from "../ui/Cartao";
import { seloClasse } from "../ui/Selo";
// ── aba: Kids (professor) ───────────────────────────────────────────────────────

export function TabKids({
  person,
  people,
  members,
  events,
  kidsClasses,
  kidsChildren,
  childGuardians,
  kidsSessions,
  kidsAttendance,
  organizationId,
  churchId,
}: {
  person: P;
  people: P[];
  members: M[];
  events: Ev[];
  kidsClasses: KidsClass[];
  kidsChildren: Child[];
  childGuardians: ChildGuardian[];
  kidsSessions: KidsSession[];
  kidsAttendance: KidsAttendance[];
  organizationId?: string;
  churchId?: string;
}) {
  const { comTermos: ct } = useTermos();
  const [attendance, setAttendance] = useState(kidsAttendance);
  const [sessionId, setSessionId] = useState<string | null>(kidsSessions.find((s) => s.checkin_active)?.id ?? null);
  const [q, setQ] = useState("");
  const [novaFicha, setNovaFicha] = useState(false);
  const [form, setForm] = useState({ nome: "", nascimento: "", genero: "", respNome: "", respTel: "", respParentesco: "", emergenciaNome: "", emergenciaTel: "", autorizaImagem: false });
  const [fotoCrianca, setFotoCrianca] = useState<string | null>(null);
  const [fotoResp, setFotoResp] = useState<string | null>(null);
  const [fichaIds, setFichaIds] = useState(() => ({ childId: crypto.randomUUID(), personId: crypto.randomUUID() }));
  const sugestaoTurmaId = suggestKidsClassId(form.nascimento, kidsClasses);
  const sugestaoTurma = kidsClasses.find((kc) => kc.id === sugestaoTurmaId);

  const activeSessions = kidsSessions.filter((s) => s.checkin_active);
  const session = activeSessions.find((s) => s.id === sessionId) ?? activeSessions[0] ?? null;
  const event = session ? events.find((e) => e.id === session.event_id) : null;
  const kidsClass = session ? kidsClasses.find((c) => c.id === session.class_id) : null;
  const childById = new Map(kidsChildren.map((c) => [c.id, c]));
  const guardianOf = (childId: string) => childGuardians.filter((g) => g.child_id === childId);
  const memberByPersonId = new Map(members.filter((m) => m.volunteerId).map((m) => [m.volunteerId as string, m]));

  const sessionAttendance = session ? attendance.filter((a) => a.session_id === session.id) : [];
  const present = sessionAttendance.filter((a) => a.status === "presente");
  const pending = sessionAttendance.filter((a) => a.status === "retirada_pendente");
  const notYetIn = kidsChildren.filter(
    (c) => q && !sessionAttendance.some((a) => a.child_id === c.id && a.status !== "retirado") && c.name.toLowerCase().includes(q.toLowerCase()),
  );

  const avisarResponsavel = async (childId: string) => {
    const guardians = guardianOf(childId);
    const targetMember = guardians.map((g) => memberByPersonId.get(g.guardian_person_id)).find(Boolean);
    if (!targetMember || !organizationId) { avisar("Não encontrei um contato no app para esse responsável.", "warn"); return; }
    const child = childById.get(childId);
    await fetch("/api/service/push/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationId, recipientMemberIds: [targetMember.id], title: "Aviso da sala Kids", body: `${child?.name ?? "Sua criança"} precisa de você na sala Kids.` }),
    }).catch(() => {});
    avisar("Aviso enviado.");
  };

  const confirmarRetirada = async (att: KidsAttendance) => {
    setAttendance((prev) => prev.map((a) => (a.id === att.id ? { ...a, status: "retirado" } : a)));
    await createServiceBrowserClient().schema("service").from("kids_attendance").update({ status: "retirado", picked_up_at: new Date().toISOString(), picked_up_via: "manual" }).eq("id", att.id);
  };

  const checkinManual = async (childId: string) => {
    if (!session || !organizationId) return;
    const { data } = await createServiceBrowserClient()
      .schema("service")
      .from("kids_attendance")
      .insert({ organization_id: organizationId, session_id: session.id, child_id: childId, dropped_off_via: "manual" })
      .select("id,session_id,child_id,status,dropped_off_at,dropped_off_via")
      .single();
    if (data) setAttendance((prev) => [...prev, data as KidsAttendance]);
    setQ("");
  };

  const [fichaError, setFichaError] = useState("");
  const respMatch = form.respNome.trim() ? people.find((p) => p.name.toLowerCase().trim() === form.respNome.toLowerCase().trim()) : null;
  const fotoRespEfetiva = respMatch?.photoUrl ?? fotoResp;

  const criarFicha = async () => {
    if (!form.nome.trim() || !organizationId || !churchId) return;
    if (!fotoCrianca) { setFichaError("A foto da criança é obrigatória."); return; }
    if (!fotoRespEfetiva) { setFichaError("A foto do responsável é obrigatória."); return; }
    setFichaError("");
    const supabase = createServiceBrowserClient();
    const guardianPersonId = respMatch?.id ?? fichaIds.personId;
    let personError = null;
    if (!respMatch) {
      const { error } = await supabase.schema("service").from("people").insert({ id: fichaIds.personId, organization_id: organizationId, church_id: churchId, name: form.respNome.trim() || "Responsavel", phone: form.respTel.trim() || null, status: "ativo", photo_url: fotoResp });
      personError = error;
    } else if (fotoResp) {
      await supabase.schema("service").from("people").update({ photo_url: fotoResp }).eq("id", respMatch.id);
    }
    const { error: childError } = await supabase.schema("service").from("children").insert({ id: fichaIds.childId, organization_id: organizationId, church_id: churchId, class_id: sugestaoTurmaId ?? session?.class_id ?? null, name: form.nome.trim(), birth: form.nascimento || null, photo_url: fotoCrianca, gender: form.genero || null, emergency_contact_name: form.emergenciaNome.trim() || null, emergency_contact_phone: form.emergenciaTel.trim() || null, image_authorized: form.autorizaImagem });
    if (!personError && !childError) {
      await supabase.schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: fichaIds.childId, guardian_person_id: guardianPersonId, relationship: form.respParentesco.trim() || null, can_pickup: true, is_primary: true });
      if (session) {
        const { data } = await supabase.schema("service").from("kids_attendance").insert({ organization_id: organizationId, session_id: session.id, child_id: fichaIds.childId, dropped_off_via: "manual" }).select("id,session_id,child_id,status,dropped_off_at,dropped_off_via").single();
        if (data) setAttendance((prev) => [...prev, data as KidsAttendance]);
      }
      if (form.respNome.trim()) {
        await supabase.schema("service").from("visitors").insert({ organization_id: organizationId, church_id: churchId, name: form.respNome.trim(), phone: form.respTel.trim() || null, stage: "novo", origin: "Kids", due: "1o contato", due_status: "soon" });
      }
      setForm({ nome: "", nascimento: "", genero: "", respNome: "", respTel: "", respParentesco: "", emergenciaNome: "", emergenciaTel: "", autorizaImagem: false });
      setFotoCrianca(null);
      setFotoResp(null);
      setFichaIds({ childId: crypto.randomUUID(), personId: crypto.randomUUID() });
      setNovaFicha(false);
    } else {
      setFichaError("Não foi possível salvar a ficha agora.");
    }
  };

  if (!session) {
    return (
      <>
        <div className="m-section-t">Kids</div>
        <div className="empty" style={{ marginTop: 12 }}>Nenhuma sessão Kids aberta agora. Peça para a liderança abrir o QR do {ct("{culto}")} de hoje em {ct("{Cultos} e eventos")}.</div>
      </>
    );
  }

  return (
    <>
      <div className="m-section-t">Kids · {kidsClass?.name ?? "Turma"}</div>
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginBottom: 12 }}>{joinDot(event?.name, `${event?.weekday ?? ""} ${formatDateBR(event?.eventDate)}`.trim())}</div>

      {activeSessions.length > 1 && (
        <select className="select" style={{ marginBottom: 12 }} value={session.id} onChange={(e) => setSessionId(e.target.value)}>
          {activeSessions.map((s) => <option key={s.id} value={s.id}>{kidsClasses.find((c) => c.id === s.class_id)?.name ?? "Turma"}</option>)}
        </select>
      )}

      {pending.length > 0 && (
        <>
          <div className="m-when" style={{ marginBottom: 8 }}>Retirada pendente</div>
          {pending.map((att) => {
            const child = childById.get(att.child_id);
            return (
              <Cartao estilo="app-solto" key={att.id} style={{ borderColor: "var(--amber-line)" }}>
                <div className="m-culto">{child?.name ?? "Crianca"}</div>
                <div className="m-fn">Compare o responsável na porta antes de confirmar.</div>
                <Botao tamanho="toque" variante="principal" largo style={{ width: "100%", marginTop: 8 }} onClick={() => confirmarRetirada(att)}>Confirmar retirada</Botao>
              </Cartao>
            );
          })}
        </>
      )}

      <div className="m-when" style={{ marginBottom: 8, marginTop: pending.length ? 14 : 0 }}>Na sala · {present.length}</div>
      {present.length === 0 && <div className="empty">Nenhuma criança na sala ainda.</div>}
      {present.map((att) => {
        const child = childById.get(att.child_id);
        return (
          <Cartao estilo="app-solto" key={att.id}>
            <div className="m-vis-head">
              <Av name={child?.name ?? "?"} size="sm" photoUrl={child?.photo_url} />
              <div className="m-vis-main">
                <div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{child?.name ?? "Crianca"}</div>
                <div className="m-fn">{child?.allergies ? `Alergia: ${child.allergies}` : (att.dropped_off_via === "manual" ? "manual" : "QR")}</div>
              </div>
              <Botao tamanho="toque" variante="secundario" compacto style={{ padding: "6px 10px" }} onClick={() => avisarResponsavel(att.child_id)}>Avisar</Botao>
            </div>
          </Cartao>
        );
      })}

      <input className="input" placeholder="Buscar criança para check-in manual..." value={q} onChange={(e) => setQ(e.target.value)} style={{ marginTop: 16, marginBottom: 8 }} />
      {notYetIn.slice(0, 5).map((child) => (
        <div className="m-vis-head" key={child.id} style={{ cursor: "pointer" }} onClick={() => checkinManual(child.id)}>
          <Av name={child.name} size="sm" photoUrl={child.photo_url} />
          <div className="m-vis-main"><div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{child.name}</div></div>
          <span style={{ color: "var(--olive)", fontSize: "var(--fs-app-13)" }}>+ check-in</span>
        </div>
      ))}

      <Botao tamanho="toque" variante="secundario" largo style={{ width: "100%", marginTop: 16 }} onClick={() => setNovaFicha((v) => !v)}>
        {novaFicha ? "Cancelar" : "+ Criar ficha na hora"}
      </Botao>
      {novaFicha && (
        <Cartao estilo="app-solto" style={{ borderColor: "var(--olive-line)", marginTop: 10 }}>
          <PhotoPicker label="Foto da criança (obrigatória)" photoUrl={fotoCrianca} path={`${organizationId}/kids/children/${fichaIds.childId}`} onUploaded={setFotoCrianca} />
          <input className="input" placeholder="Nome da criança" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
          <input className="input" type="date" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} style={{ marginBottom: 8 }} />
          <select className="select" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} style={{ marginBottom: 8 }}>
            <option value="">Gênero (opcional)</option>
            <option value="menino">Menino</option>
            <option value="menina">Menina</option>
          </select>
          <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (session ? kidsClasses.find((kc) => kc.id === session.class_id)?.name ?? "nenhuma turma cobre essa idade" : "informe o nascimento")}</div>

          <input className="input" list="service-kids-people-names" placeholder="Nome do responsável" value={form.respNome} onChange={(e) => setForm((f) => ({ ...f, respNome: e.target.value }))} style={{ marginBottom: 8 }} />
          <datalist id="service-kids-people-names">
            {people.map((p) => <option key={p.id} value={p.name} />)}
          </datalist>
          {respMatch ? (
            <div className="cell-sub" style={{ marginBottom: 8 }}>Ja tem cadastro no Service{fotoRespEfetiva ? ", foto reaproveitada do perfil" : ""}.</div>
          ) : (
            <PhotoPicker label="Foto do responsável (obrigatória)" photoUrl={fotoResp} path={`${organizationId}/kids/guardians/${fichaIds.personId}`} onUploaded={setFotoResp} />
          )}
          <input className="input" placeholder="Telefone do responsável" value={form.respTel} onChange={(e) => setForm((f) => ({ ...f, respTel: e.target.value }))} style={{ marginTop: 8, marginBottom: 8 }} />
          <input className="input" placeholder="Parentesco (mãe, avó...)" value={form.respParentesco} onChange={(e) => setForm((f) => ({ ...f, respParentesco: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Contato de emergência: nome" aria-label="Contato de emergência: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
          <input className="input" placeholder="Contato de emergência: telefone" aria-label="Contato de emergência: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 12 }} />

          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: "var(--fs-app-13)", lineHeight: 1.4 }}>
            <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} style={{ marginTop: 3 }} />
            <span>{imageAuthorizationCopy(form.nome)}</span>
          </label>
          {fichaError && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 8 }}>{fichaError}</div>}
          <Botao tamanho="toque" variante="principal" largo style={{ width: "100%" }} onClick={criarFicha}>Salvar e fazer check-in</Botao>
        </Cartao>
      )}
    </>
  );
}

// ── aba: Kids (area do responsavel, drill-down do Perfil) ────────────────────────

export function TabKidsArea({
  checkinHoje,
  person,
  people,
  kidsClasses,
  kidsChildren,
  childGuardians,
  kidsAttendance,
  kidsEvents,
  kidsEventEnrollments,
  wallPosts,
  organizationId,
  churchId,
}: {
  person: P;
  people: P[];
  kidsClasses: KidsClass[];
  kidsChildren: Child[];
  childGuardians: ChildGuardian[];
  kidsAttendance: KidsAttendance[];
  kidsEvents: KidsEvent[];
  kidsEventEnrollments: KidsEventEnrollment[];
  wallPosts: WallPost[];
  organizationId?: string;
  churchId?: string;
  setTab?: (tab: string) => void;
  /* check-in de hoje (v7 2.3), o mesmo bloco do Início */
  checkinHoje?: React.ReactNode;
}) {
  const emptyForm = { nome: "", nascimento: "", genero: "", autorizaImagem: false, alergias: "", restricoes: "", saude: "", medicamento: "", emergenciaNome: "", emergenciaTel: "", notas: "" };
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [fotoFilho, setFotoFilho] = useState<string | null>(null);
  const [novoFilhoId, setNovoFilhoId] = useState(() => crypto.randomUUID());
  const [ficarError, setFicarError] = useState("");
  const [enrollments, setEnrollments] = useState(kidsEventEnrollments);
  const [myChildren, setMyChildren] = useState(kidsChildren);
  const [myGuardians, setMyGuardians] = useState(childGuardians);
  const [minhaFoto, setMinhaFoto] = useState(person.photoUrl ?? null);
  const sugestaoTurmaId = suggestKidsClassId(form.nascimento, kidsClasses);
  const sugestaoTurma = kidsClasses.find((kc) => kc.id === sugestaoTurmaId);

  const meusFilhos = myChildren.filter((c) => myGuardians.some((g) => g.child_id === c.id && g.guardian_person_id === person.id));
  const kidsWall = wallPosts.filter((w) => (w.audience ?? "").toLowerCase().includes("kids")).slice(0, 5);

  const salvarMinhaFoto = (url: string) => {
    setMinhaFoto(url);
    createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
  };

  const abrirNovo = () => {
    setEditingId((v) => (v === "novo" ? null : "novo"));
    setForm(emptyForm);
    setFotoFilho(null);
    setNovoFilhoId(crypto.randomUUID());
    setFicarError("");
  };

  const abrirEdicao = (child: Child) => {
    setEditingId(child.id);
    setForm({
      nome: child.name,
      nascimento: child.birth ?? "",
      genero: child.gender ?? "",
      autorizaImagem: child.image_authorized ?? false,
      alergias: child.allergies ?? "",
      restricoes: child.dietary_restrictions ?? "",
      saude: child.health_insurance ?? "",
      medicamento: child.medication ?? "",
      emergenciaNome: child.emergency_contact_name ?? "",
      emergenciaTel: child.emergency_contact_phone ?? "",
      notas: "",
    });
    setFotoFilho(child.photo_url ?? null);
    setFicarError("");
  };

  const fotoFilhoTargetId = editingId && editingId !== "novo" ? editingId : novoFilhoId;

  const salvarFilho = async () => {
    if (!form.nome.trim() || !organizationId || !churchId) return;
    if (!fotoFilho) { setFicarError("A foto da criança é obrigatória."); return; }
    setFicarError("");
    const supabase = createServiceBrowserClient();
    const payload = {
      class_id: sugestaoTurmaId,
      name: form.nome.trim(),
      birth: form.nascimento || null,
      photo_url: fotoFilho,
      gender: (form.genero || null) as "menino" | "menina" | null,
      allergies: form.alergias.trim() || null,
      dietary_restrictions: form.restricoes.trim() || null,
      health_insurance: form.saude.trim() || null,
      medication: form.medicamento.trim() || null,
      emergency_contact_name: form.emergenciaNome.trim() || null,
      emergency_contact_phone: form.emergenciaTel.trim() || null,
      image_authorized: form.autorizaImagem,
    };
    if (editingId && editingId !== "novo") {
      const { error } = await supabase.schema("service").from("children").update(payload).eq("id", editingId);
      if (!error) setMyChildren((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
      else { setFicarError("Não consegui salvar agora."); return; }
    } else {
      const { error } = await supabase.schema("service").from("children").insert({ id: novoFilhoId, organization_id: organizationId, church_id: churchId, ...payload });
      if (!error) {
        await supabase.schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: novoFilhoId, guardian_person_id: person.id, relationship: "responsavel", can_pickup: true, is_primary: true });
        setMyChildren((prev) => [...prev, { id: novoFilhoId, church_id: churchId, ...payload } as Child]);
        setMyGuardians((prev) => [...prev, { id: `local-${novoFilhoId}`, child_id: novoFilhoId, guardian_person_id: person.id, relationship: "responsavel", can_pickup: true, is_primary: true }]);
      } else { setFicarError("Não consegui salvar agora."); return; }
    }
    setEditingId(null);
    setForm(emptyForm);
    setFotoFilho(null);
  };

  const inscrever = async (eventId: string, childId: string) => {
    if (!organizationId) return;
    const { data } = await createServiceBrowserClient().schema("service").from("kids_event_enrollments").insert({ organization_id: organizationId, kids_event_id: eventId, child_id: childId, enrolled_by: person.id }).select("id,kids_event_id,child_id,enrolled_by").single();
    if (data) setEnrollments((prev) => [...prev, data as KidsEventEnrollment]);
  };

  const isPrimaryFor = (childId: string) => myGuardians.some((g) => g.child_id === childId && g.guardian_person_id === person.id && g.is_primary);
  const guardiansOf = (childId: string) => myGuardians.filter((g) => g.child_id === childId);

  const [coForm, setCoForm] = useState({ nome: "", relationship: "", canPickup: true, photoUrl: null as string | null });
  const [coError, setCoError] = useState("");

  const adicionarCoResponsavel = async (childId: string) => {
    if (!organizationId) return;
    setCoError("");
    const matched = people.find((p) => p.name.toLowerCase().trim() === coForm.nome.toLowerCase().trim());
    if (!matched) { setCoError("Pessoa não encontrada. Ela precisa já ter cadastro no Service."); return; }
    if (matched.id === person.id) { setCoError("Você já é responsável."); return; }
    if (guardiansOf(childId).some((g) => g.guardian_person_id === matched.id)) { setCoError("Essa pessoa já é responsável."); return; }
    const photo = coForm.photoUrl ?? matched.photoUrl ?? null;
    if (!photo) { setCoError("O corresponsável precisa ter uma foto (envie abaixo)."); return; }
    const { data } = await createServiceBrowserClient().schema("service").from("child_guardians").insert({ organization_id: organizationId, child_id: childId, guardian_person_id: matched.id, relationship: coForm.relationship.trim() || null, can_pickup: coForm.canPickup, is_primary: false }).select("id,child_id,guardian_person_id,relationship,can_pickup,is_primary").single();
    if (data) {
      setMyGuardians((prev) => [...prev, data as ChildGuardian]);
      setCoForm({ nome: "", relationship: "", canPickup: true, photoUrl: null });
    } else {
      setCoError("Não consegui adicionar agora.");
    }
  };

  const removerCoResponsavel = async (guardianRowId: string) => {
    await createServiceBrowserClient().schema("service").from("child_guardians").delete().eq("id", guardianRowId);
    setMyGuardians((prev) => prev.filter((g) => g.id !== guardianRowId));
  };

  const fichaForm = (
    <Cartao estilo="app-solto" style={{ borderColor: "var(--olive-line)", marginTop: 10 }}>
      <PhotoPicker label="Foto da criança (obrigatória)" photoUrl={fotoFilho} path={`${organizationId}/kids/children/${fotoFilhoTargetId}`} onUploaded={setFotoFilho} />
      <input className="input" placeholder="Nome da criança" value={form.nome} onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))} style={{ marginTop: 10, marginBottom: 8 }} />
      <input className="input" type="date" value={form.nascimento} onChange={(e) => setForm((f) => ({ ...f, nascimento: e.target.value }))} style={{ marginBottom: 8 }} />
      <select className="select" value={form.genero} onChange={(e) => setForm((f) => ({ ...f, genero: e.target.value }))} style={{ marginBottom: 8 }}>
        <option value="">Gênero (opcional)</option>
        <option value="menino">Menino</option>
        <option value="menina">Menina</option>
      </select>
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", marginBottom: 10 }}>Turma: {sugestaoTurma?.name ?? (form.nascimento ? "nenhuma turma cobre essa idade ainda" : "calculada pelo nascimento")}</div>
      <input className="input" placeholder="Alergias" value={form.alergias} onChange={(e) => setForm((f) => ({ ...f, alergias: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Restrições alimentares" value={form.restricoes} onChange={(e) => setForm((f) => ({ ...f, restricoes: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Plano de saúde ou convênio" value={form.saude} onChange={(e) => setForm((f) => ({ ...f, saude: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Medicamento em uso contínuo" aria-label="Medicamento em uso contínuo" value={form.medicamento} onChange={(e) => setForm((f) => ({ ...f, medicamento: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergência: nome" aria-label="Contato de emergência: nome" value={form.emergenciaNome} onChange={(e) => setForm((f) => ({ ...f, emergenciaNome: e.target.value }))} style={{ marginBottom: 8 }} />
      <input className="input" placeholder="Contato de emergência: telefone" aria-label="Contato de emergência: telefone" value={form.emergenciaTel} onChange={(e) => setForm((f) => ({ ...f, emergenciaTel: e.target.value }))} style={{ marginBottom: 12 }} />
      <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 12, fontSize: "var(--fs-app-13)", lineHeight: 1.4 }}>
        <input type="checkbox" checked={form.autorizaImagem} onChange={(e) => setForm((f) => ({ ...f, autorizaImagem: e.target.checked }))} style={{ marginTop: 3 }} />
        <span>{imageAuthorizationCopy(form.nome)}</span>
      </label>
      {ficarError && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 8 }}>{ficarError}</div>}
      <div className="m6-fixo m6-fixo-mcard"><Botao tamanho="toque" variante="principal" largo style={{ width: "100%" }} onClick={salvarFilho}>Salvar</Botao></div>
    </Cartao>
  );

  return (
    <>
      {checkinHoje}
      <div className="m-section-t">Sua foto de responsável</div>
      <PhotoPicker label="Foto do responsável" photoUrl={minhaFoto} path={`${organizationId}/kids/guardians/${person.id}`} onUploaded={salvarMinhaFoto} />

      <div className="m-section-t">Minhas crianças</div>
      {meusFilhos.map((child) => {
        const turma = kidsClasses.find((kc) => kc.id === child.class_id);
        const historico = kidsAttendance.filter((a) => a.child_id === child.id).sort((a, b) => b.dropped_off_at.localeCompare(a.dropped_off_at)).slice(0, 3);
        return (
          <div key={child.id}>
            <Acao className={cartaoClasse({ estilo: "app-solto" })} style={{ width: "100%", textAlign: "left", cursor: "pointer" }} onClick={() => abrirEdicao(child)}>
              <div className="m-vis-head">
                <Av name={child.name} size="sm" photoUrl={child.photo_url} />
                <div className="m-vis-main">
                  <div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{child.name}</div>
                  <div className="m-fn">{turma?.name ?? "sem turma"}{child.allergies ? ` · alergia: ${child.allergies}` : ""}</div>
                </div>
                <span className="m-task-caret" aria-hidden="true"><Icon name="editar" size={16} /></span>
              </div>
              {historico.length > 0 && (
                <div style={{ marginTop: 10, fontSize: "var(--fs-app-13)", color: "var(--muted)" }}>
                  {historico.map((h) => <div key={h.id}>{formatDateBR(h.dropped_off_at.slice(0, 10))} · {h.status === "retirado" ? "retirado" : "na sala"}</div>)}
                </div>
              )}
            </Acao>
            {editingId === child.id && (
              <>
                {fichaForm}
                <Cartao estilo="app-solto" style={{ marginTop: 8 }}>
                  <div className="m-when" style={{ marginBottom: 8 }}>Responsaveis autorizados a retirar</div>
                  {guardiansOf(child.id).map((g) => {
                    const p = people.find((pp) => pp.id === g.guardian_person_id);
                    return (
                      <div className="m-vis-head" key={g.id} style={{ marginBottom: 8 }}>
                        <Av name={p?.name ?? "?"} size="sm" photoUrl={p?.photoUrl} />
                        <div className="m-vis-main">
                          <div className="m-culto" style={{ fontSize: "var(--fs-app-13)" }}>{p?.name ?? "Responsavel"}{g.is_primary ? " · principal" : ""}</div>
                          <div className="m-fn">{g.relationship || "sem parentesco informado"}</div>
                        </div>
                        {isPrimaryFor(child.id) && !g.is_primary && (
                          <Acao className="ob-foto-remover" onClick={() => removerCoResponsavel(g.id)}>Remover</Acao>
                        )}
                      </div>
                    );
                  })}
                  {isPrimaryFor(child.id) ? (
                    <>
                      <div className="cell-sub" style={{ margin: "10px 0" }}>Só você, como responsável principal, pode adicionar corresponsáveis.</div>
                      <input className="input" list="service-mobile-people-names" placeholder="Nome (já precisa ter cadastro)" value={coForm.nome} onChange={(e) => setCoForm((f) => ({ ...f, nome: e.target.value, photoUrl: people.find((p) => p.name === e.target.value)?.photoUrl ?? null }))} style={{ marginBottom: 8 }} />
                      <datalist id="service-mobile-people-names">
                        {people.map((p) => <option key={p.id} value={p.name} />)}
                      </datalist>
                      <input className="input" placeholder="Parentesco (mãe, avó, tio...)" value={coForm.relationship} onChange={(e) => setCoForm((f) => ({ ...f, relationship: e.target.value }))} style={{ marginBottom: 8 }} />
                      {coForm.nome && !coForm.photoUrl && (
                        <div style={{ marginBottom: 8 }}>
                          <PhotoPicker label="Foto do corresponsável (obrigatória)" photoUrl={coForm.photoUrl} path={`${organizationId}/kids/guardians/${people.find((p) => p.name === coForm.nome)?.id ?? "novo"}`} onUploaded={(url) => setCoForm((f) => ({ ...f, photoUrl: url }))} />
                        </div>
                      )}
                      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: "var(--fs-app-13)" }}>
                        <input type="checkbox" checked={coForm.canPickup} onChange={(e) => setCoForm((f) => ({ ...f, canPickup: e.target.checked }))} /> Pode retirar
                      </label>
                      {coError && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 8 }}>{coError}</div>}
                      <Botao tamanho="toque" variante="secundario" largo style={{ width: "100%" }} onClick={() => adicionarCoResponsavel(child.id)}>+ Adicionar corresponsável</Botao>
                    </>
                  ) : (
                    <div className="cell-sub">Só o responsável principal pode adicionar outros corresponsáveis.</div>
                  )}
                </Cartao>
              </>
            )}
          </div>
        );
      })}
      {meusFilhos.length === 0 && <div className="cell-sub" style={{ marginBottom: 4 }}>Você ainda não tem nenhuma criança vinculada por aqui.</div>}

      <Botao tamanho="toque" variante="secundario" largo style={{ width: "100%", marginTop: 10 }} onClick={abrirNovo}>
        {editingId === "novo" ? "Cancelar" : "+ Adicionar criança"}
      </Botao>
      {editingId === "novo" && fichaForm}

      {kidsWall.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Mural dos professores</div>
          {kidsWall.map((post) => (
            <Cartao estilo="app-solto" key={post.id}>
              <div className="m-fn">{post.author ?? "Kids"}</div>
              <div style={{ fontSize: "var(--fs-app-13)", marginTop: 4 }}>{post.body}</div>
            </Cartao>
          ))}
        </>
      )}

      {kidsEvents.length > 0 && meusFilhos.length > 0 && (
        <>
          <div className="m-section-t" style={{ marginTop: 22 }}>Eventos de crianças</div>
          {kidsEvents.map((event) => (
            <Cartao estilo="app-solto" key={event.id}>
              <div className="m-culto">{event.title}</div>
              <div className="m-fn">{[event.event_date, event.time, event.location].filter(Boolean).join(" · ") || "sem data definida"}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {meusFilhos.map((child) => {
                  const inscrito = enrollments.some((e) => e.kids_event_id === event.id && e.child_id === child.id);
                  return (
                    <Acao key={child.id} className={`${seloClasse({ tom: "neutro" })}${inscrito ? "chip-ok" : "chip-neutral"}`} desativado={inscrito} onClick={() => inscrever(event.id, child.id)}>
                      {child.name.split(" ")[0]}{inscrito ? <> <Icon name="ok" size={13} /></> : " + inscrever"}
                    </Acao>
                  );
                })}
              </div>
            </Cartao>
          ))}
        </>
      )}
    </>
  );
}

// ── check-in Kids pelo app (v7 2.3) ───────────────────────────────────────────
/* No dia do culto, um bloco por filho com o check-in. Abre 60 minutos antes
   do culto; a mesma lógica da rota do QR (lib/kids-checkin.ts). Aparece no
   Início e em Minha família. */
export function cultoDeHoje(events: Ev[], hoje = todayISO(), agora = horaAgoraBR()): Ev | null {
  const doDia = events.filter((e) => e.eventDate === hoje).sort((a, b) => (a.time ?? "").localeCompare(b.time ?? ""));
  if (!doDia.length) return null;
  /* o próximo que ainda não terminou (2h depois do início), senão o último */
  const fim = (t: string) => { const m = (t ?? "").match(/^(\d{1,2}):(\d{2})/); return m ? `${String(Math.min(23, Number(m[1]) + 2)).padStart(2, "0")}:${m[2]}` : "23:59"; };
  return doDia.find((e) => fim(e.time) >= agora) ?? doDia[doDia.length - 1];
}

export function CheckinKidsHoje({ person, events, kidsChildren, childGuardians, kidsClasses, kidsSessions, kidsAttendance, organizationId, destaque = true }: {
  person: P; events: Ev[]; kidsChildren: Child[]; childGuardians: ChildGuardian[]; kidsClasses: KidsClass[];
  kidsSessions: KidsSession[]; kidsAttendance: KidsAttendance[]; organizationId?: string;
  /* botão cheio só no primeiro cartão da fila do Início (lei 5) */
  destaque?: boolean;
}) {
  const { comTermos: ct } = useTermos();
  const { todayISO, horaAgoraBR, fuso } = useRelogioDaIgreja();
  const culto = cultoDeHoje(events, todayISO(), horaAgoraBR());
  const vinculos = childGuardians.filter((g) => g.guardian_person_id === person.id);
  const filhos = vinculos.map((g) => kidsChildren.find((c) => c.id === g.child_id)).filter(Boolean) as Child[];
  const inicial: Record<string, { id: string; status: string }> = {};
  if (culto) {
    for (const c of filhos) {
      const sessao = kidsSessions.find((ks) => ks.event_id === culto.id && ks.class_id === c.class_id);
      const att = sessao ? kidsAttendance.find((a) => a.session_id === sessao.id && a.child_id === c.id && a.status !== "retirado") : undefined;
      if (att) inicial[c.id] = { id: att.id, status: att.status };
    }
  }
  const router = useRouter();
  const ck = useKidsCheckin({
    organizationId, personId: person.id, inicial,
    sessionFor: (childId) => (culto ? sessaoDoCulto(culto.id, childId) : Promise.resolve(null)),
    aoMudar: () => router.refresh(),
  });
  /* a hora de abrir passa com a tela aberta */
  const [, setTick] = useState(0);
  useEffect(() => { const h = setInterval(() => setTick((t) => t + 1), 60000); return () => clearInterval(h); }, []);
  if (!culto || !filhos.length) return null;
  const abre = horaQueAbre(culto.time);
  const aberto = checkinAberto(culto.time, new Date(), fuso);
  return (
    <Cartao estilo="app">
      <div className="m6-kick">Kids hoje</div>
      <div className="m6-ct">{joinDot(culto.name, culto.time)}</div>
      {!aberto && abre && <div className="m6-meta">O check-in abre às {abre}, 1 hora antes do {ct("{culto}")}.</div>}
      {filhos.map((c, i) => {
        const att = ck.attendance[c.id];
        const turma = kidsClasses.find((kc) => kc.id === c.class_id);
        const podeRetirar = vinculos.find((g) => g.child_id === c.id)?.can_pickup;
        const busy = ck.loadingChild === c.id;
        return (
          <div key={c.id} style={{ marginTop: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Av name={c.name} photoUrl={c.photo_url} />
              <div className="m6-rb">
                <div className="m6-rt">{c.name.split(" ")[0]}</div>
                <div className="m6-rs">{turma ? joinDot(turma.name, statusDaCrianca(att)) : "Sem turma: fale com a recepção do Kids"}</div>
              </div>
            </div>
            {turma && !att && aberto && (
              <div className="m6-btns"><Botao tamanho="toque" variante={destaque && i === 0 ? "principal" : "secundario"} desativado={busy} onClick={() => ck.checkin(c.id)}>{busy ? "Aguarde..." : `Fazer check-in de ${c.name.split(" ")[0]}`}</Botao></div>
            )}
            {att?.status === "presente" && podeRetirar && (
              <div className="m6-btns"><Botao tamanho="toque" desativado={busy} onClick={() => ck.pedirRetirada(c.id)}>{busy ? "Aguarde..." : "Solicitar retirada"}</Botao></div>
            )}
          </div>
        );
      })}
      {ck.error && <div className="m6-meta" style={{ color: "var(--danger)", marginTop: 8 }}>{ck.error}</div>}
    </Cartao>
  );
}
