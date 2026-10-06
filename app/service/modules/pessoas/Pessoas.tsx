"use client";

/* Módulo Pessoas (4.1): Pessoas (membros) e Voluntários. Saiu de
   ServiceExactApp.tsx sem mudar comportamento; o manifesto está em
   ./manifest.ts. Tipos de dados do painel: import só de tipo. */

import { useState } from "react";
import { ehNovo, nomeComparavel } from "../../lib/pessoas";
import { formatarTelefone, mesmoTelefone } from "../../lib/telefone";
import { formatDateBR } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { Av, Chip, EmptyState, PageHead } from "../../painel/ui";
import { JRN_STEPS } from "../../painel/caminhada";
import type { ChurchView, DrawerState, MemberView, MinistryView, ModalState, PersonView } from "../../ServiceExactApp";

function formatAvailability(value: Record<string, boolean>) {
  const labels: Record<string, string> = { dom_m: "Domingo manhã", dom_n: "Domingo noite", qua: "Quarta" };
  const items = Object.entries(value).filter(([, ok]) => ok).map(([key]) => labels[key] ?? key);
  return items.join(" · ");
}

function JrnPips({ journey, comTexto = false }: { journey: number[]; comTexto?: boolean }) {
  const feitas = JRN_STEPS.filter((_, i) => !!journey[i]);
  const resumo = feitas.length ? `${feitas.length} de ${JRN_STEPS.length}: ${feitas.map((s) => s.label).join(", ")}` : "nenhuma etapa ainda";
  return (
    <div className="jrn-cell" title={`Caminhada, ${resumo}`}>
      <div className="jrn-mini" aria-hidden="true">
        {journey.slice(0, 5).map((v, i) => <span key={i} className={`jrn-pip ${v ? "on" : ""}`} />)}
      </div>
      {comTexto ? <span className="jrn-txt">{feitas.length ? `${feitas.length} de ${JRN_STEPS.length} · ${feitas[feitas.length - 1].label}` : "Nenhuma etapa"}</span> : null}
    </div>
  );
}

/* v7 3.7: Situação que ajuda a agir: novo (com a data de chegada), pausa ou
   férias, sem telefone para o convite, membro desde quando. */
function SituacaoPessoa({ l }: { l: PessoaLinha }) {
  const tel = formatarTelefone(l.member?.phone || l.person?.phone || "");
  let chip: import("react").ReactNode;
  let sub = "";
  if (l.novo) {
    chip = <span className="chip chip-wait">Novo</span>;
    const chegou = formatDateBR(l.member?.firstContact || l.member?.createdAt || l.person?.createdAt || "");
    sub = chegou ? `chegou em ${chegou.slice(0, 5)}` : "";
  } else if (l.person && l.person.status !== "ativo") {
    chip = <Chip status={l.person.status} />;
  } else if (l.member) {
    chip = <Chip status="membro" />;
    sub = l.member.sinceYear ? `desde ${l.member.sinceYear}` : "";
  } else {
    chip = <span className="chip chip-neutral">Voluntário</span>;
  }
  return (
    <div className="sit-cell">
      {chip}
      {!tel ? <span className="sit-sub sit-alerta">sem telefone</span> : sub ? <span className="sit-sub">{sub}</span> : null}
    </div>
  );
}

/* Pessoas (S32): uma lista só com membros e voluntários, filtros por papel e
   a coluna "Serve em". As tabelas do banco continuam separadas; aqui é só a
   tela. */
type PessoaLinha = { key: string; name: string; sub: string; member?: MemberView; person?: PersonView; mins: MinistryView[]; leader: boolean; novo: boolean; photoUrl?: string | null };
export function Membros({ members, people = [], ministries, setDrawer, setModal, soTimes = null }: { members: MemberView[]; people?: PersonView[]; ministries: MinistryView[]; church?: ChurchView; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; soTimes?: string[] | null }) {
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "membros" | "voluntarios" | "lideres" | "novos">("todos");
  const minsDe = (personId: string | null | undefined) => (personId ? ministries.filter((min) => min.people.some((p) => p.personId === personId)) : []);
  const lideraAlgum = (personId: string | null | undefined) => !!personId && ministries.some((min) => min.people.some((p) => p.personId === personId && p.isLeader));
  // eslint-disable-next-line react-hooks/purity -- "Novos" são os últimos 30 dias pelo relógio real
  const agora = Date.now();
  /* ficha de membro sem o vínculo com o voluntário, mas com o mesmo nome e telefone: é a mesma pessoa, aparece uma vez */
  const mesmaPessoa = (m: MemberView, p: PersonView) => nomeComparavel(m.name) === nomeComparavel(p.name) && mesmoTelefone(m.phone, p.phone);
  const linhas: PessoaLinha[] = [
    ...members.map((m) => {
      const person = people.find((p) => p.id === m.volunteerId) ?? (!m.volunteerId ? people.find((p) => mesmaPessoa(m, p)) : undefined);
      return {
        key: `m-${m.id}`, name: m.name, sub: formatarTelefone(m.phone) || m.neighborhood || "", member: m, person,
        mins: minsDe(person?.id), leader: lideraAlgum(person?.id), photoUrl: person?.photoUrl,
        novo: ehNovo(m, agora),
      };
    }),
    ...people.filter((p) => !members.some((m) => m.volunteerId === p.id || (!m.volunteerId && mesmaPessoa(m, p)))).map((p) => ({
      key: `p-${p.id}`, name: p.name, sub: formatarTelefone(p.phone), person: p, mins: minsDe(p.id), leader: lideraAlgum(p.id), photoUrl: p.photoUrl,
      novo: ehNovo({ createdAt: p.createdAt }, agora),
    })),
  ].filter((l) => !soTimes || l.mins.some((min) => soTimes.includes(min.id)))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const nomesTimes = soTimes ? ministries.filter((m) => soTimes.includes(m.id)).map((m) => m.name).join(", ") : "";
  const conta = {
    membros: linhas.filter((l) => l.member).length,
    voluntarios: linhas.filter((l) => l.mins.length > 0).length,
    lideres: linhas.filter((l) => l.leader).length,
    novos: linhas.filter((l) => l.novo).length,
  };
  const visible = linhas.filter((l) => {
    const okQ = !q || l.name.toLowerCase().includes(q.toLowerCase()) || l.sub.includes(q) || (q.replace(/\D/g, "").length >= 3 && l.sub.replace(/\D/g, "").includes(q.replace(/\D/g, "")));
    const okF = filtro === "todos" || (filtro === "membros" && !!l.member) || (filtro === "voluntarios" && l.mins.length > 0) || (filtro === "lideres" && l.leader) || (filtro === "novos" && l.novo);
    return okQ && okF;
  });
  const abrir = (l: PessoaLinha) => setDrawer(l.member ? { kind: "member", id: l.member.id } : { kind: "person", id: l.person!.id });
  return (
    <div className="content wide">
      <PageHead title="Pessoas" eyebrow="Pessoas" subtitle={soTimes ? `Quem serve nos times que você lidera: ${nomesTimes}.` : "Toda a igreja num lugar só: membros, voluntários e líderes, com onde cada um serve."} help={soTimes ? "Você vê aqui as pessoas dos seus times. O restante da igreja fica com a gestão, que pode liberar em Configurações › Permissões." : "Toda a congregação entra aqui, sirva ou não em um time. É diferente de Voluntários, que lista só quem já serve ativamente."} action={soTimes ? undefined : <button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo membro", subtitle: "Nome, sobrenome e telefone bastam: o convite do app vai pelo WhatsApp e a pessoa completa o resto.", saveLabel: "Adicionar membro", formFields: [{ k:"nome", label:"Nome e sobrenome", type:"text", req:true, ph:"Como a pessoa se chama", hint:"A pessoa pode ajustar depois no app." }, { k:"tel", label:"Telefone (WhatsApp)", type:"text", half:true, req:true, ph:"(11) 9...", hint:"Ao salvar, o WhatsApp abre com o convite do app para este número." }, { k:"email", label:"E-mail", type:"text", half:true, ph:"opcional", hint:"Opcional: a pessoa informa no convite." }, { k:"nasc", label:"Aniversário", type:"date", half:true }, { k:"cep", label:"CEP", type:"cep", half:true, ph:"00000-000", hint:"Preenche rua, bairro, cidade e estado sozinho.", autofill:{ street:"rua", neighborhood:"bairro", city:"cidade", state:"estado" } }, { k:"bairro", label:"Bairro", type:"text", half:true, ph:"Onde mora" }, { k:"rua", label:"Rua", type:"text", half:true, ph:"Nome da rua" }, { k:"cidade", label:"Cidade", type:"text", half:true }, { k:"estado", label:"Estado", type:"text", half:true, ph:"UF" }], action: { kind: "member" } })}>+ Novo membro</button>} />
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar por nome ou telefone..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg seg-wrap">
          {([["todos", "Todos", linhas.length], ["membros", "Membros", conta.membros], ["voluntarios", "Voluntários", conta.voluntarios], ["lideres", "Líderes", conta.lideres], ["novos", "Novos", conta.novos]] as const).map(([id, l, n]) => (
            <button key={id} className={filtro === id ? "on" : ""} type="button" onClick={() => setFiltro(id)}>{l} <span className="seg-n">{n}</span></button>
          ))}
        </div>
      </div>
      <p className="jrn-legenda"><b>Caminhada</b>, uma barra por etapa, na ordem: {JRN_STEPS.map((s) => s.label).join(" · ")}.</p>
      <div className="tbl">
        <div className="tr head" style={{ gridTemplateColumns: "1.6fr 1.3fr 1fr 0.9fr" }}><span>Pessoa</span><span>Serve em</span><span>Caminhada</span><span>Situação</span></div>
        {visible.map((l) => (
          <button className="tr click" type="button" key={l.key} style={{ gridTemplateColumns: "1.6fr 1.3fr 1fr 0.9fr" }} onClick={() => abrir(l)}>
            <div className="cell-person"><Av name={l.name} size="md" photoUrl={l.photoUrl} /><div><div className="cell-name">{l.name}</div><div className="cell-sub">{l.sub}</div></div></div>
            <div>
              {l.mins.length > 0 ? <div className="cell-tags">{l.mins.map((min) => <span key={min.id} className="tag">{min.name}</span>)}{l.leader && <span className="lider-tag">Líder</span>}</div> : null}
            </div>
            <div>{l.member ? <JrnPips journey={l.member.journey} comTexto /> : null}</div>
            <SituacaoPessoa l={l} />
          </button>
        ))}
        {visible.length === 0 && <EmptyState title="Ninguém por aqui" text="Quem você cadastrar aparece nesta lista. Se usou a busca ou um filtro, tente limpar." />}
      </div>
    </div>
  );
}

export function Pessoas({ people, currentPersonId, setDrawer, setModal }: { people: PersonView[]; currentPersonId?: string | null; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | "ativo" | "pausa">("todos");
  const visible = people.filter((person) => {
    const okQ = !q || person.name.toLowerCase().includes(q.toLowerCase());
    const okStatus = status === "todos" || person.status === status;
    return okQ && okStatus;
  });
  return (
    <div className="content">
      <PageHead title="Voluntários" eyebrow="Pessoas" subtitle="Todo mundo com cadastro de voluntário, sirva ou não em um time ainda. Toque para ver perfil, disponibilidade e histórico." help="Todo mundo com acesso de voluntário na igreja, mesmo quem ainda não está em nenhum time. Veja funções, disponibilidade e engajamento nas escalas." action={<button className="btn btn-pri" type="button" onClick={() => setModal({ eyebrow: "Criar", title: "Novo voluntário", subtitle: "Cadastre e já escolha os times.", saveLabel: "Adicionar voluntário", formFields: [{ k:"nome", label:"Nome completo", type:"text", req:true, ph:"Como a pessoa se chama" }, { k:"tel", label:"Telefone", type:"text", half:true, ph:"(11) 9..." }, { k:"email", label:"E-mail", type:"text", half:true, ph:"e-mail da pessoa" }], action: { kind: "member" } })}>+ Novo voluntário</button>} />
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar por nome..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="seg">
          <button className={status === "todos" ? "on" : ""} type="button" onClick={() => setStatus("todos")}>Todos</button>
          <button className={status === "ativo" ? "on" : ""} type="button" onClick={() => setStatus("ativo")}>Ativos</button>
          <button className={status === "pausa" ? "on" : ""} type="button" onClick={() => setStatus("pausa")}>Pausa</button>
        </div>
        <div className="tb-spacer" />
        <span className="panel-meta">{visible.length} pessoas</span>
      </div>
      <div className="tbl">
        <div className="tr head tr-people"><div>Voluntário</div><div>Disponibilidade</div><div>Etiquetas</div><div>Status</div></div>
        {visible.map((person) => (
          <button className="tr click tr-people" type="button" key={person.id} onClick={() => setDrawer({ kind: "person", id: person.id })}>
            <div className="who">
              <Av name={person.name} photoUrl={person.photoUrl} />
              <div>
                <strong>{person.name}{person.id === currentPersonId && <span style={{ color: "var(--olive)", fontSize: "var(--fs-pn-12)", marginLeft: 7 }}>você</span>}</strong>
                <small>{formatarTelefone(person.phone)}</small>
              </div>
            </div>
            <div>{formatAvailability(person.availability)}</div>
            <div>{person.tags.join(" · ")}</div>
            <div><Chip status={person.status} /></div>
          </button>
        ))}
        {visible.length === 0 && <div className="empty">Ninguém encontrado.</div>}
      </div>
    </div>
  );
}

