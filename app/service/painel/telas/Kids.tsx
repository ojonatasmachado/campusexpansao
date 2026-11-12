"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { Icon } from "../../lib/icons";
import { ageInMonths, suggestKidsClassId, imageAuthorizationCopy } from "../../lib/kids";
import { PhotoPicker } from "../../PhotoPicker";

import { useTermos } from "../../lib/vocabulario-context";
import { HelpDot } from "../../HelpSystem";
import { Av, EmptyState, PageHead } from "../ui";
import { FormScreen, FormSection, type FormScreenHandle } from "../form/FormScreen";
import { friendlyWriteError } from "../erros";
import { OUTRO_LOCAL, findPersonByName } from "../comum";
import { ServiceModal } from "./ServiceModal";
import type { ChildGuardianView, ChildView, ChurchView, KidsClassView, KidsEventView, ModalState, PersonView, RoomView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Etiqueta } from "../../ui/Selo";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Cartao } from "../../ui/Cartao";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada, Marcar, TextoLongo } from "../../ui/Campo";
import { SeletorData } from "../../ui/Data";
import { Vazio } from "../../ui/Estados";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";

export function TurmasKids({ kidsClasses, rooms, setModal }: { kidsClasses: KidsClassView[]; rooms: RoomView[]; setModal: (modal: ModalState) => void }) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const roomById = new Map(rooms.map((room) => [room.id, room]));
  const openForm = (existing?: KidsClassView) => setModal({
    eyebrow: existing ? traduzirUi("Editar") : traduzirUi("Criar"),
    title: existing ? traduzirUi("Editar {nome}", { nome: existing.name }) : traduzirUi("Nova turma Kids"),
    subtitle: traduzirUi("A faixa etária sugere a turma no cadastro da criança, sempre dá pra ajustar na mão."),
    saveLabel: existing ? traduzirUi("Salvar") : traduzirUi("Criar turma"),
    formFields: [
      { k: "nome", label: traduzirUi("Nome da turma"), type: "text", req: true, ph: traduzirUi("ex: Berçário"), value: existing?.name },
      { k: "min", label: traduzirUi("Idade mínima (meses)"), type: "text", half: true, ph: traduzirUi("ex: 0"), value: existing?.min_age_months != null ? String(existing.min_age_months) : undefined },
      { k: "max", label: traduzirUi("Idade máxima (meses)"), type: "text", half: true, ph: traduzirUi("ex: 23"), value: existing?.max_age_months != null ? String(existing.max_age_months) : undefined },
      { k: "capacidade", label: traduzirUi("Capacidade"), type: "text", half: true, ph: traduzirUi("ex: 15"), value: existing?.capacity != null ? String(existing.capacity) : undefined },
      { k: "sala", label: traduzirUi("Sala vinculada"), type: "select", half: true, ph: traduzirUi("Sem sala fixa"), options: rooms.map((room) => ({ v: room.name, l: room.name })) },
    ],
    action: { kind: "kidsClass", id: existing?.id },
  });

  return (
    <>
      <div className="cfg-card-head-row">
        <div>
          <div className="cfg-card-t">{traduzirUi("Turmas Kids")}</div>
          <div className="cfg-card-s">{ct(traduzirUi("Berçário, Maternal, Primários... cada turma abre a própria sessão de check-in no dia do {culto}."))}</div>
        </div>
        <Botao variante="principal" compacto onClick={() => openForm()}>{traduzirUi("+ Nova turma")}</Botao>
      </div>
      <div className="sala-grid" style={{ marginTop: 16 }}>
        {kidsClasses.map((kc) => (
          <Acao key={kc.id} className="sala-card" onClick={() => openForm(kc)}>
            <div className="sala-card-top"><span className="sala-mark"><Icon name="kids" size={18} /></span><span className="sala-cap">{traduzirUi.rich("{capacidade} <small>vagas</small>", { capacidade: String(kc.capacity ?? 0), small: (c) => <small>{c}</small> })}</span></div>
            <div className="sala-nome">{kc.name}</div>
            <div className="sala-local">{kc.min_age_months != null || kc.max_age_months != null ? traduzirUi("{min} a {max} meses", { min: String(kc.min_age_months ?? 0), max: kc.max_age_months != null ? String(kc.max_age_months) : "?" }) : traduzirUi("Faixa etária não definida")}</div>
            {kc.room_id ? <div className="sala-rec"><Etiqueta>{roomById.get(kc.room_id)?.name ?? traduzirUi("Sala")}</Etiqueta></div> : null}
          </Acao>
        ))}
        {kidsClasses.length === 0 ? <Vazio titulo={traduzirUi("Nenhuma turma cadastrada ainda.")} /> : null}
      </div>
    </>
  );
}

export function childAgeLabel(birth: string | null, t: Text): string {
  const months = ageInMonths(birth);
  if (months === null) return "";
  if (months < 24) return t("{n} meses", { n: String(months) });
  return t("{n} anos", { n: String(Math.floor(months / 12)) });
}

export function Criancas({
  kidsChildren,
  kidsClasses,
  childGuardians,
  people,
  kidsEvents,
  rooms,
  church,
}: {
  kidsChildren: ChildView[];
  kidsClasses: KidsClassView[];
  childGuardians: ChildGuardianView[];
  people: PersonView[];
  kidsEvents: KidsEventView[];
  rooms: RoomView[];
  church?: ChurchView;
}) {
  const traduzirUi = useTexto();

  const [q, setQ] = useState("");
  const [classFilter, setClassFilter] = useState("todas");
  const [form, setForm] = useState<{ open: boolean; child?: ChildView }>({ open: false });
  const [eventModal, setEventModal] = useState(false);
  const classById = new Map(kidsClasses.map((kc) => [kc.id, kc]));
  const personById = new Map(people.map((person) => [person.id, person]));
  const kidsLocalOptions = [...rooms.map((room) => ({ v: room.name, l: room.capacity ? traduzirUi("{sala} · {capacidade} lug.", { sala: room.name, capacidade: String(room.capacity) }) : room.name })), { v: OUTRO_LOCAL, l: traduzirUi("Outro espaço (fora da igreja)") }];

  const visible = kidsChildren.filter((child) => {
    const okQ = !q || child.name.toLowerCase().includes(q.toLowerCase());
    const okClass = classFilter === "todas" || child.class_id === classFilter;
    return okQ && okClass;
  });

  return (
    <div className="content wide">
      <PageHead
        title={traduzirUi("Crianças")}
        eyebrow={traduzirUi("Pessoas")}
        subtitle={traduzirUi("{count, plural, =1 {# criança} other {# crianças}}", { count: kidsChildren.length })}
        help={traduzirUi("Ficha de cada criança, turma sugerida pela idade, responsáveis autorizados a retirar e check-in do Kids, separado do restante da congregação.")}
        action={<Botao variante="principal" onClick={() => setForm({ open: true })}>{traduzirUi("+ Nova criança")}</Botao>}
      />
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder={traduzirUi("Buscar criança...")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Segmentado>
          <Opcao marcada={classFilter === "todas"} onClick={() => setClassFilter("todas")}>{traduzirUi("Todas")}</Opcao>
          {kidsClasses.map((kc) => (
            <Opcao key={kc.id} marcada={classFilter === kc.id} onClick={() => setClassFilter(kc.id)}>{kc.name}</Opcao>
          ))}
        </Segmentado>
        <div className="tb-spacer" />
        <span className="panel-meta">{traduzirUi("{count, plural, =1 {# criança} other {# crianças}}", { count: visible.length })}</span>
      </div>
      <div className="tbl">
        <Linha estilo="tabela" className="head" style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr" }}><span>{traduzirUi("Criança")}</span><span>{traduzirUi("Idade")}</span><span>{traduzirUi("Turma")}</span><span>{traduzirUi("Responsáveis")}</span></Linha>
        {visible.map((child) => {
          const guardians = childGuardians.filter((g) => g.child_id === child.id);
          return (
            <Acao className={`${linhaClasse({ estilo: "tabela" })} click`} key={child.id} style={{ gridTemplateColumns: "1.6fr 1fr 1fr 1.4fr" }} onClick={() => setForm({ open: true, child })}>
              <div className="cell-person"><Av name={child.name} size="md" photoUrl={child.photo_url} /><div><div className="cell-name">{child.name}</div>{child.allergies ? <div className="cell-sub">{traduzirUi("Alergia: {alergias}", { alergias: child.allergies })}</div> : null}</div></div>
              <div className="cell-sub">{childAgeLabel(child.birth, traduzirUi)}</div>
              <div>{child.class_id ? <Etiqueta>{classById.get(child.class_id)?.name ?? traduzirUi("Turma")}</Etiqueta> : <span className="cell-sub">{traduzirUi("sem turma")}</span>}</div>
              <div className="cell-sub">{guardians.length ? guardians.map((g) => personById.get(g.guardian_person_id)?.name.split(" ")[0]).filter(Boolean).join(", ") : traduzirUi("sem responsável")}</div>
            </Acao>
          );
        })}
        {visible.length === 0 ? <Vazio titulo={traduzirUi("Nenhuma criança encontrada.")} /> : null}
      </div>

      <Cartao style={{ marginTop: 28 }}>
        <div className="panel-head">
          <span className="panel-title"><Icon name="presente" size={14} /> {traduzirUi("Eventos Kids")} <HelpDot text={traduzirUi("Eventos extras do Kids, com inscrição própria e aviso pros responsáveis.")} /></span>
          <Botao compacto onClick={() => setEventModal(true)}>{traduzirUi("+ Criar evento")}</Botao>
        </div>
        <div className="panel-body flush">
          {kidsEvents.map((ev) => (
            <Linha key={ev.id}>
              <div className="mini-main">
                <div className="mini-title">{ev.title}</div>
                <div className="mini-sub">{[ev.event_date, ev.time, ev.location].filter(Boolean).join(" · ") || traduzirUi("sem data definida")}</div>
              </div>
            </Linha>
          ))}
          {kidsEvents.length === 0 ? <EmptyState title={traduzirUi("Nenhum evento Kids")} text={traduzirUi("Encontros extras com inscrição própria aparecem aqui. Use Criar evento quando houver uma programação para publicar.")} /> : null}
        </div>
      </Cartao>

      {form.open && church && (
        <ChildFormModal
          child={form.child}
          kidsClasses={kidsClasses}
          people={people}
          childGuardians={form.child ? childGuardians.filter((g) => g.child_id === form.child!.id) : []}
          church={church}
          onClose={() => setForm({ open: false })}
        />
      )}
      {eventModal && church && (
        <ServiceModal
          modal={{ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo evento Kids"), subtitle: traduzirUi("Evento infantil com inscrição aberta pelos responsáveis no app."), saveLabel: traduzirUi("Criar evento"), formFields: [{ k: "titulo", label: traduzirUi("Título"), type: "text", req: true, ph: traduzirUi("ex: Páscoa Kids") }, { k: "data", label: traduzirUi("Data"), type: "date", half: true }, { k: "hora", label: traduzirUi("Horário"), type: "text", half: true, ph: traduzirUi("ex: 10h") }, { k: "local", label: traduzirUi("Local"), type: "select", req: true, half: true, ph: traduzirUi("Selecione um espaço cadastrado"), options: kidsLocalOptions }, { k: "endereco", label: traduzirUi("Endereço do espaço"), type: "text", half: true, ph: traduzirUi("Rua, número, bairro..."), showIf: { field: "local", equals: OUTRO_LOCAL } }, { k: "capacidade", label: traduzirUi("Vagas"), type: "text", half: true, ph: traduzirUi("ex: 30") }, { k: "desc", label: traduzirUi("Descrição"), type: "area", ph: traduzirUi("O que vai acontecer") }], action: { kind: "kidsEvent" } }}
          church={church}
          people={people}
          ministries={[]}
          onClose={() => setEventModal(false)}
        />
      )}
    </div>
  );
}

export function ChildFormModal({
  child,
  kidsClasses,
  people,
  childGuardians,
  church,
  onClose,
}: {
  child?: ChildView;
  kidsClasses: KidsClassView[];
  people: PersonView[];
  childGuardians: ChildGuardianView[];
  church: ChurchView;
  onClose: () => void;
}) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [name, setName] = useState(child?.name ?? "");
  const [birth, setBirth] = useState(child?.birth ?? "");
  const [allergies, setAllergies] = useState(child?.allergies ?? "");
  const [notes, setNotes] = useState(child?.notes ?? "");
  const [gender, setGender] = useState(child?.gender ?? "");
  const [emergencyName, setEmergencyName] = useState(child?.emergency_contact_name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(child?.emergency_contact_phone ?? "");
  const [imageAuthorized, setImageAuthorized] = useState(child?.image_authorized ?? false);
  const [dietaryRestrictions, setDietaryRestrictions] = useState(child?.dietary_restrictions ?? "");
  const [healthInsurance, setHealthInsurance] = useState(child?.health_insurance ?? "");
  const [medication, setMedication] = useState(child?.medication ?? "");
  const [photoUrl, setPhotoUrl] = useState(child?.photo_url ?? null);
  const childId = useMemo(() => child?.id ?? crypto.randomUUID(), [child?.id]);
  const suggestedClassId = useMemo(() => suggestKidsClassId(birth, kidsClasses), [birth, kidsClasses]);
  const classId = suggestedClassId ?? child?.class_id ?? null;
  const classLabel = kidsClasses.find((kc) => kc.id === classId)?.name;
  const [guardians, setGuardians] = useState<{ name: string; relationship: string; canPickup: boolean; photoUrl: string | null }[]>(
    childGuardians.length
      ? childGuardians.map((g) => {
          const p = people.find((person) => person.id === g.guardian_person_id);
          return { name: p?.name ?? "", relationship: g.relationship ?? "", canPickup: g.can_pickup, photoUrl: p?.photoUrl ?? null };
        })
      : [{ name: "", relationship: "", canPickup: true, photoUrl: null }],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);

  const addGuardian = () => setGuardians((prev) => [...prev, { name: "", relationship: "", canPickup: true, photoUrl: null }]);
  const removeGuardian = (index: number) => setGuardians((prev) => prev.filter((_, i) => i !== index));
  const updateGuardian = (index: number, patch: Partial<{ name: string; relationship: string; canPickup: boolean; photoUrl: string | null }>) =>
    setGuardians((prev) => prev.map((g, i) => (i === index ? { ...g, ...patch } : g)));

  const uploadGuardianPhoto = async (index: number, url: string) => {
    const matched = findPersonByName(people, guardians[index].name);
    if (matched) await createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", matched.id);
    updateGuardian(index, { photoUrl: url });
  };

  const salvar = async () => {
    if (!name.trim()) { setError(traduzirUi("Digite o nome da criança.")); return; }
    if (!photoUrl) { setError(traduzirUi("A foto da criança é obrigatória.")); return; }
    const matchedGuardians = guardians.map((g) => ({ ...g, person: findPersonByName(people, g.name) }));
    if (matchedGuardians.some((g) => g.name.trim() && !g.person)) { setError(traduzirUi("Um dos responsáveis não foi encontrado. Confira o nome ou cadastre a pessoa antes.")); return; }
    const withPerson = matchedGuardians.filter((g) => g.person);
    if (withPerson.some((g) => !g.photoUrl)) { setError(traduzirUi("Todo responsável precisa ter uma foto (pra o professor confirmar na retirada).")); return; }

    setSaving(true);
    setError("");
    const supabase = createServiceBrowserClient();
    const payload = {
      organization_id: church.organizationId,
      church_id: church.id,
      class_id: classId || null,
      name: name.trim(),
      birth: birth || null,
      photo_url: photoUrl,
      allergies: allergies.trim() || null,
      notes: notes.trim() || null,
      gender: gender || null,
      emergency_contact_name: emergencyName.trim() || null,
      emergency_contact_phone: emergencyPhone.trim() || null,
      image_authorized: imageAuthorized,
      dietary_restrictions: dietaryRestrictions.trim() || null,
      health_insurance: healthInsurance.trim() || null,
      medication: medication.trim() || null,
    };
    const { error: childError } = child
      ? await supabase.schema("service").from("children").update(payload).eq("id", child.id)
      : await supabase.schema("service").from("children").insert({ id: childId, ...payload });

    if (childError) {
      setSaving(false);
      setError(friendlyWriteError(childError.message ?? "Não foi possível salvar a criança.", traduzirUi));
      return;
    }

    /* principal = o primeiro responsável preenchido (linha vazia no topo não conta) */
    const primaryPersonId = withPerson[0]?.person?.id;
    const guardianRows = withPerson.map((g) => ({
      organization_id: church.organizationId,
      child_id: childId,
      guardian_person_id: g.person!.id,
      relationship: g.relationship.trim() || null,
      can_pickup: g.canPickup,
      is_primary: g.person!.id === primaryPersonId,
    }));
    /* grava os responsáveis da ficha antes de tirar os que saíram: a criança nunca
       fica sem responsável no meio (0079 só aceita o primeiro vínculo da própria pessoa) */
    if (guardianRows.length) {
      const { error: insError } = await supabase.schema("service").from("child_guardians").upsert(guardianRows, { onConflict: "child_id,guardian_person_id" });
      if (insError) { setSaving(false); setError(friendlyWriteError(insError.message ?? "Não foi possível salvar os responsáveis.", traduzirUi)); return; }
    }
    const ficam = guardianRows.map((g) => g.guardian_person_id);
    let saem = supabase.schema("service").from("child_guardians").delete().eq("child_id", childId);
    if (ficam.length) saem = saem.not("guardian_person_id", "in", `(${ficam.join(",")})`);
    const { error: delError } = await saem;
    if (delError) { setSaving(false); setError(friendlyWriteError(delError.message ?? "Não foi possível salvar os responsáveis.", traduzirUi)); return; }

    /* saving continua ligado até a tela fechar: um segundo toque não salva de novo.
       Fecha antes do refresh (o voltar do histórico restaura a árvore anterior). */
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    router.refresh();
  };

  /* a foto do responsável já é gravada na hora do envio, então não conta como mudança */
  const retrato = JSON.stringify({ name, birth, allergies, notes, gender, emergencyName, emergencyPhone, imageAuthorized, dietaryRestrictions, healthInsurance, medication, photoUrl, guardians: guardians.map((g) => [g.name, g.relationship, g.canPickup]) });
  const fid = useId();
  const [retratoInicial] = useState(retrato);
  const falta = [!name.trim() && traduzirUi("nome"), !photoUrl && traduzirUi("foto")].filter(Boolean) as string[];

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={child ? traduzirUi("Editar") : traduzirUi("Criar")}
      title={child ? child.name : traduzirUi("Nova criança")}
      saveLabel={child ? traduzirUi("Salvar") : traduzirUi("Criar criança")}
      saving={saving}
      missing={falta}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      <FormSection title={traduzirUi("Criança")}>
        <div className="fs-grid">
          <div className="field">
            <PhotoPicker label={traduzirUi("Foto da criança (obrigatória)")} photoUrl={photoUrl} path={`${church.organizationId}/kids/children/${childId}`} onUploaded={setPhotoUrl} />
          </div>
          <Campo rotulo={traduzirUi("Nome da criança")} obrigatorio><Entrada id={`${fid}-nome`} placeholder={traduzirUi("Nome completo")} value={name} onChange={(e) => setName(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Nascimento")} className="half"><SeletorData id={`${fid}-nasc`} valor={birth} aoMudar={setBirth} limpavel /></Campo>
          <div className="field half">
            <div className="field-label" id={`${fid}-turma`}>{traduzirUi("Turma")}</div>
            <div className={`fs-calc${classLabel ? " ok" : ""}`} role="status" aria-labelledby={`${fid}-turma`}>{classLabel ?? (birth ? traduzirUi("Nenhuma turma cobre essa idade ainda") : traduzirUi("Calculada pelo nascimento"))}</div>
          </div>
          <Campo rotulo={traduzirUi("Gênero")} grupo>
            <div className="fs-chips" role="group">
              {([["menina", traduzirUi("Menina")], ["menino", traduzirUi("Menino")]] as const).map(([v, l]) => (
                <Opcao key={v} marcada={gender === v} estilo="seg-chip" aria-pressed={gender === v} onClick={() => setGender(gender === v ? "" : v)}>{l}</Opcao>
              ))}
            </div>
          </Campo>
        </div>
      </FormSection>

      <FormSection title={traduzirUi("Saúde")}>
        <div className="fs-grid">
          <Campo rotulo={traduzirUi("Alergias")}><Entrada id={`${fid}-alerg`} placeholder={traduzirUi("ex: alergia a amendoim")} value={allergies} onChange={(e) => setAllergies(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Restrições alimentares")} className="half"><Entrada id={`${fid}-restr`} placeholder={traduzirUi("ex: vegetariano, sem lactose")} value={dietaryRestrictions} onChange={(e) => setDietaryRestrictions(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Medicamento contínuo")} className="half"><Entrada id={`${fid}-med`} placeholder={traduzirUi("ex: nenhum")} value={medication} onChange={(e) => setMedication(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Plano de saúde")} className="half"><Entrada id={`${fid}-plano`} placeholder={traduzirUi("ex: Amil, SUS")} value={healthInsurance} onChange={(e) => setHealthInsurance(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Notas")}><TextoLongo id={`${fid}-notas`} placeholder={traduzirUi("Observações gerais")} value={notes} onChange={(e) => setNotes(e.target.value)} /></Campo>
        </div>
      </FormSection>

      <FormSection title={traduzirUi("Contato de emergência")}>
        <div className="fs-grid">
          <Campo rotulo={traduzirUi("Nome")} className="half"><Entrada id={`${fid}-emnome`} placeholder={traduzirUi("Quem chamar")} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Telefone")} className="half"><Entrada id={`${fid}-emtel`} type="tel" placeholder="(11) 9..." value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} /></Campo>
        </div>
      </FormSection>

      <FormSection title={traduzirUi("Quem pode retirar")}>
        <div className="fs-cards">
          {guardians.map((g, index) => {
            const matched = findPersonByName(people, g.name);
            return (
              <div key={index} className="fs-card">
                <div className="fs-card-top">
                  {index === 0 ? <span className="fs-card-tag">{traduzirUi("Responsável principal")}</span> : <span />}
                  <Botao variante="discreto" compacto onClick={() => removeGuardian(index)}>{traduzirUi("Remover")}</Botao>
                </div>
                {matched ? (
                  <PhotoPicker photoUrl={g.photoUrl} path={`${church.organizationId}/kids/guardians/${matched.id}`} onUploaded={(url) => uploadGuardianPhoto(index, url)} placeholder={traduzirUi("Foto obrigatória")} />
                ) : (
                  <div className="ob-foto-area" style={{ cursor: "default" }}>
                    <div className="ob-foto-placeholder"><span>?</span><small>{traduzirUi("Digite um nome já cadastrado")}</small></div>
                  </div>
                )}
                <input className="input" list="service-people-names" placeholder={traduzirUi("Nome do responsável")} aria-label={traduzirUi("Nome do responsável")} value={g.name} onChange={(e) => updateGuardian(index, { name: e.target.value, photoUrl: findPersonByName(people, e.target.value)?.photoUrl ?? null })} />
                <input className="input" placeholder={traduzirUi("Parentesco (mãe, avó...)")} aria-label={traduzirUi("Parentesco")} value={g.relationship} onChange={(e) => updateGuardian(index, { relationship: e.target.value })} />
                <Marcar className="fs-check" checked={g.canPickup} onChange={(e) => updateGuardian(index, { canPickup: e.target.checked })}>{traduzirUi("Pode retirar")}</Marcar>
              </div>
            );
          })}
        </div>
        <datalist id="service-people-names">
          {people.map((person) => <option key={person.id} value={person.name} />)}
        </datalist>
        <Botao compacto style={{ marginTop: 12 }} onClick={addGuardian}>{traduzirUi("+ Responsável")}</Botao>
        <p className="fs-note">{ct(traduzirUi("O responsável precisa já ter cadastro de {voluntario} ou membro no Service."))}</p>
      </FormSection>

      <FormSection title={traduzirUi("Uso de imagem")}>
        <Marcar className="fs-check" checked={imageAuthorized} onChange={(e) => setImageAuthorized(e.target.checked)}>{imageAuthorizationCopy(name)}</Marcar>
      </FormSection>
    </FormScreen>
  );
}
