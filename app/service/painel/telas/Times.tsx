"use client";

import { recebimentoAberto } from "../../modules/times/recebimento";
import { plural } from "../../lib/plural";
import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { DEFAULT_ICON, IconPicker } from "../../lib/icons";
import { type ServeRequest } from "../../MobileApp";

import { useTermos } from "../../lib/vocabulario-context";
import { useServiceAccess } from "../../AccessContext";
import RequisitosEditor from "../../RequisitosEditor";
import { requirementsFor, saveRequirements, type Requirement } from "../../lib/requirements";
import { Av, PageHead } from "../ui";
import { FormScreen, FormSection, type FormScreenHandle } from "../form/FormScreen";
import { TeamMark } from "../comum";
import type { CourseView, DrawerState, MemberView, MinistryView, ModalState, PersonView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Interruptor } from "../../ui/Interruptor";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha } from "../../ui/Linha";
import { Etiqueta } from "../../ui/Selo";
/* Pessoas e Voluntários : módulo em modules/pessoas/ (4.1) */

/* Pedidos do app ("Quero servir", 0046): o membro já passou pelos
   requisitos da igreja e do time; aqui a liderança aprova (entra no time) ou
   recusa. service.review_serve_request confere o papel no servidor. */
export function PedidosParaServir({ serveRequests, members, ministries }: { serveRequests: ServeRequest[]; members: MemberView[]; ministries: MinistryView[] }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const pendentes = serveRequests.filter((r) => r.status === "pendente");
  if (pendentes.length === 0) return null;
  const revisar = async (id: string, aprovar: boolean) => {
    setOcupado(id);
    setErro("");
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("review_serve_request", { p_request: id, p_approve: aprovar });
    setOcupado(null);
    if (error || data !== "ok") {
      setErro(data === "sem_acesso_ao_app" ? "Essa pessoa ainda não aceitou o convite do app: mande o acesso pela ficha dela antes de aprovar." : "Não foi possível salvar. Tente de novo.");
      return;
    }
    router.refresh();
  };
  return (
    <div className="cfg-card" style={{ marginBottom: 18 }}>
      <div className="cfg-card-t">Pedidos para servir · {pendentes.length}</div>
      <div className="cfg-card-s">Pedidos feitos pelo app. A pessoa já cumpre os pré-requisitos que a igreja definiu para servir e para o time.</div>
      {pendentes.map((r) => {
        const membro = members.find((m) => m.id === r.member_id);
        const time = ministries.find((m) => m.id === r.ministry_id);
        return (
          <Linha estilo="config" key={r.id}>
            <Av name={membro?.name ?? "?"} size="sm" />
            <div className="cfg-row-main">
              <div className="cfg-row-t">{membro?.name ?? "Membro"}</div>
              <div className="cfg-row-s">quer servir em {time?.name ?? "um time"}</div>
            </div>
            <span style={{ display: "flex", gap: 8 }}>
              <Botao compacto desativado={ocupado === r.id} onClick={() => revisar(r.id, false)}>Recusar</Botao>
              <Botao variante="principal" compacto desativado={ocupado === r.id} onClick={() => revisar(r.id, true)}>Aprovar</Botao>
            </span>
          </Linha>
        );
      })}
      {erro && <div className="field-error" style={{ marginTop: 8 }}>{erro}</div>}
    </div>
  );
}

export function Times({ ministries, people, members, serveRequests, setDrawer, setModal }: { ministries: MinistryView[]; people: PersonView[]; members: MemberView[]; serveRequests: ServeRequest[]; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const { comTermos: ct } = useTermos();
  return (
    <div className="content">
      <PageHead title="Times" eyebrow="Pessoas" subtitle={plural(ministries.length, "time")} help="Louvor, Recepção, Kids... cada time tem um líder e suas funções próprias." action={<Botao variante="principal" onClick={() => setModal({ eyebrow: "Criar", title: "Novo time", subtitle: "Crie o time e já conte o propósito dele.", saveLabel: "Criar time", formFields: [{ k:"nome", label:"Nome do time", type:"text", req:true, ph:"ex: Louvor e Adoração" }, { k:"icon", label:"Ícone do time", type:"icon", value: DEFAULT_ICON }, { k:"desc", label:"Propósito", type:"area", ph:"Por que esse time existe?" }, { k:"aberto", label:"Receber pedidos pelo app", type:"toggle", onLabel:"Pedidos abertos", offLabel:"Pedidos fechados", hint:"Depois de definir um líder com ficha no app, a oportunidade aparece para os membros. Nenhuma pessoa entra sem aprovação." }], action: { kind: "ministry" } })}>+ Novo time</Botao>} />
      <PedidosParaServir serveRequests={serveRequests} members={members} ministries={ministries} />
      <div className="team-grid">
        {ministries.map((ministry) => <Acao className="team-card" key={ministry.id} onClick={() => setDrawer({ kind: "ministry", id: ministry.id })}><div className="team-card-top"><div className="team-mark"><TeamMark ministry={ministry} size={20} /></div><div className="av-stack">{ministry.people.slice(0, 4).map((link) => { const linkPerson = people.find((person) => person.id === link.personId); return <Av key={link.personId} name={linkPerson?.name ?? link.personName} photoUrl={linkPerson?.photoUrl} />; })}{ministry.people.length > 4 && <div className="av-more">+{ministry.people.length - 4}</div>}</div></div><div className="team-name">{ministry.name}</div><div className="team-lead">{ministry.people.find((link) => link.isLeader)?.personName ? <>Líder: <em>{ministry.people.find((link) => link.isLeader)?.personName}</em></> : <span className="sem-lider">Sem líder · Definir</span>}</div><div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)", lineHeight: 1.55, marginTop: 12 }}>{ministry.description}</div><div className="team-foot"><span className="team-stat"><b>{ministry.people.length}</b> {ct(ministry.people.length === 1 ? "{voluntario}" : "{voluntarios}")}</span><span className="team-stat"><b>{ministry.positions.length}</b> {ministry.positions.length === 1 ? "função" : "funções"}</span></div></Acao>)}
      </div>
    </div>
  );
}

/* módulos extras que um time libera no app pros seus membros (ministries.app_modules) */
export const APP_MODULES_TIME = [
  { id: "visitantes", label: "Visitantes (recepção)" },
  { id: "kids", label: "Kids (check-in)" },
];

export function MinisterioEditModal({ ministry, courses, onClose, onRefresh }: {
  ministry: MinistryView;
  courses: CourseView[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const profile = ministry.profile as { comoTrabalhamos?: string; chegada?: string; responsabilidades?: string[] };
  const access = useServiceAccess();
  const [nome, setNome] = useState(ministry.name);
  const [icon, setIcon] = useState(ministry.icon || DEFAULT_ICON);
  const [desc, setDesc] = useState(ministry.description);
  const [comoTrabalhamos, setComoTrabalhamos] = useState(profile.comoTrabalhamos ?? "");
  const [chegada, setChegada] = useState(profile.chegada ?? "");
  const [responsabilidades, setResponsabilidades] = useState((profile.responsabilidades ?? []).join("\n"));
  const [requisitos, setRequisitos] = useState<Requirement[]>(() => requirementsFor(access.requirements, "ministry", ministry.id));
  const [appModules, setAppModules] = useState<string[]>(ministry.appModules);
  const [recebendo, setRecebendo] = useState(recebimentoAberto(ministry));
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);
  const fid = useId();

  const togModule = (id: string) =>
    setAppModules((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const salvar = async () => {
    if (!nome.trim()) return;
    setSaving(true);
    setErro("");
    const { error } = await createServiceBrowserClient()
      .schema("service")
      .from("ministries")
      .update({
        name: nome.trim(),
        icon: icon || DEFAULT_ICON,
        description: desc.trim() || null,
        app_modules: appModules,
        profile: {
          ...ministry.profile,
          recebendoVoluntarios: recebendo,
          comoTrabalhamos: comoTrabalhamos.trim() || undefined,
          chegada: chegada.trim() || undefined,
          responsabilidades: responsabilidades.split("\n").map((s) => s.trim()).filter(Boolean),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", ministry.id);
    const reqResult = error ? { error: error.message } : await saveRequirements(ministry.organizationId, "ministry", ministry.id, requisitos);
    if (reqResult.error) {
      setSaving(false);
      /* o time pode ter sido gravado e só os pré-requisitos falharam: atualiza o que está atrás */
      if (!error) onRefresh();
      setErro(error ? "Não foi possível salvar. Tente de novo." : "O time foi salvo, mas os pré-requisitos não. Tente de novo.");
      return;
    }
    /* saving fica ligado até a tela fechar; o refresh vem depois do fechar */
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    onRefresh();
  };

  /* listas ordenadas: ligar e desligar o mesmo item não conta como mudança */
  const retrato = JSON.stringify({ nome, icon, desc, recebendo, comoTrabalhamos, chegada, responsabilidades, requisitos: requisitos.map((r) => JSON.stringify(r)).sort(), appModules: [...appModules].sort() });
  const [retratoInicial] = useState(retrato);

  return (
    <FormScreen
      ref={telaRef}
      eyebrow="Editar time"
      title={ministry.name}
      saveLabel="Salvar"
      saving={saving}
      missing={nome.trim() ? [] : ["nome"]}
      dirty={retrato !== retratoInicial}
      error={erro}
      onSave={salvar}
      onClose={onClose}
    >
      <FormSection title="O time">
        <div className="field"><label className="field-label req" htmlFor={`${fid}-nome`}>Nome</label><input id={`${fid}-nome`} className="input" aria-required="true" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
        <div className="field"><div className="field-label" id={`${fid}-icone`}>Ícone do time</div><div role="group" aria-labelledby={`${fid}-icone`}><IconPicker value={icon} onChange={setIcon} /></div></div>
        <div className="field"><label className="field-label" htmlFor={`${fid}-prop`}>Propósito</label><input id={`${fid}-prop`} className="input" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Por que esse time existe" /></div>
      </FormSection>

      <FormSection title="Sobre o time">
        <div className="field"><label className="field-label" htmlFor={`${fid}-como`}>Como trabalhamos</label><textarea id={`${fid}-como`} className="textarea" value={comoTrabalhamos} onChange={(e) => setComoTrabalhamos(e.target.value)} placeholder="Rotina, ensaios, escala..." /></div>
        <div className="field"><label className="field-label" htmlFor={`${fid}-cheg`}>Horário de chegada</label><input id={`${fid}-cheg`} className="input" value={chegada} onChange={(e) => setChegada(e.target.value)} placeholder={ct("ex: 1h antes do {culto}")} /></div>
        <div className="field">
          <label className="field-label" htmlFor={`${fid}-resp`}>O que esperamos</label>
          <textarea id={`${fid}-resp`} className="textarea" aria-describedby={`${fid}-resp-dica`} value={responsabilidades} onChange={(e) => setResponsabilidades(e.target.value)} placeholder="ex: Chegar no horário" />
          <div className="field-hint" id={`${fid}-resp-dica`}>Uma por linha. Ex.: chegar no horário; avisar com antecedência se não puder servir.</div>
        </div>
      </FormSection>

      <FormSection title="Quem pode entrar">
        <div className="field">
          <label className="field-label" htmlFor={`${fid}-recebendo`}>Receber pedidos pelo app</label>
          <Interruptor ligado={recebendo} id={`${fid}-recebendo`} rotulo="Receber pedidos pelo app" onClick={() => setRecebendo((v) => !v)} />
          <p className="field-hint">A oportunidade aparece para o membro quando este controle está ligado e há um líder do time com ficha no app. O pedido precisa ser aprovado para incluir a pessoa na equipe.</p>
        </div>
        <div className="field" role="group" aria-label="Pré-requisitos para entrar no time">
          <RequisitosEditor value={requisitos} onChange={setRequisitos} courses={courses.map((c) => ({ id: c.id, name: c.name }))} events={access.events} groupsLabel={access.groupsLabel} />
        </div>
      </FormSection>

      <FormSection title="No app">
        <div className="field">
          <div className="fs-chips" role="group" aria-label="Módulos extras no app" aria-describedby={`${fid}-app-dica`}>
            {APP_MODULES_TIME.map((m) => (
              <Opcao key={m.id} marcada={appModules.includes(m.id)} estilo="seg-chip" aria-pressed={appModules.includes(m.id)} onClick={() => togModule(m.id)}>{m.label}</Opcao>
            ))}
          </div>
          <div className="field-hint" id={`${fid}-app-dica`}>Quem está neste time passa a ver esses módulos no app.</div>
        </div>
      </FormSection>

      <FormSection title="Funções">
        <div className="cell-tags">
          {ministry.positions.map((p) => <Etiqueta key={p.id}>{p.name}</Etiqueta>)}
          {ministry.positions.length === 0 && <span className="fs-note">Nenhuma função cadastrada.</span>}
        </div>
        <p className="fs-note">Para criar ou mudar funções, use o painel de Times.</p>
      </FormSection>
    </FormScreen>
  );
}

/* acessos individuais por pessoa (telas extras além do papel) + delegação
   de quem pode conceder esses acessos ── Config → aba "Acessos por pessoa" */
/* "Quero servir" (pedir pra entrar num time) : a própria igreja define o que
   a pessoa precisa ter feito antes. Cada time ainda pode ter os seus
   requisitos (Editar time). Ver app/service/lib/requirements.ts. */
export function RequisitosServirCard() {
  const router = useRouter();
  const access = useServiceAccess();
  const [reqs, setReqs] = useState<Requirement[]>(() => requirementsFor(access.requirements, "serve", null));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const salvar = async () => {
    if (!access.organizationId) return;
    setSaving(true);
    setMsg("");
    const { error } = await saveRequirements(access.organizationId, "serve", null, reqs);
    setSaving(false);
    setMsg(error ? "Não foi possível salvar. Tente de novo." : "Salvo.");
    if (!error) router.refresh();
  };
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Requisitos para servir</div>
      <div className="cfg-card-s">O que a pessoa precisa ter feito antes de pedir para entrar em qualquer time pelo app. Cada time ainda pode ter os próprios requisitos, em Editar time.</div>
      <RequisitosEditor value={reqs} onChange={setReqs} courses={access.courses} events={access.events} groupsLabel={access.groupsLabel} />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <Botao variante="principal" compacto desativado={saving} onClick={salvar}>{saving ? "Salvando..." : "Salvar requisitos"}</Botao>
        {msg && <span style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>{msg}</span>}
      </div>
    </div>
  );
}
