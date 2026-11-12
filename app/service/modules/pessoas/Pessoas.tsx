"use client";

/* Módulo Pessoas (4.1): Pessoas (membros) e Voluntários. Saiu de
   ServiceExactApp.tsx sem mudar comportamento; o manifesto está em
   ./manifest.ts. Tipos de dados do painel: import só de tipo. */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ehNovo, nomeComparavel } from "../../lib/pessoas";
import { formatarTelefone, mesmoTelefone } from "../../lib/telefone";
import { formatDateBR } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { Av, Chip, EmptyState, PageHead } from "../../painel/ui";
import { JRN_STEPS } from "../../painel/caminhada";
import { useTermos } from "../../lib/vocabulario-context";
import { ImportarMembros } from "./ImportarMembros";
import { DuplicadosAviso } from "./Duplicados";
import type { ChurchView, DrawerState, MemberView, MinistryView, ModalState, PersonView } from "../../ServiceExactApp";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Etiqueta, Selo } from "../../ui/Selo";
import { Linha, linhaClasse } from "../../ui/Linha";
import { Segmentado } from "../../ui/Segmentado";
import { Vazio } from "../../ui/Estados";
import { Tabela } from "../../ui/Tabela";
import { baixarCsv } from "../../lib/csv";
import { avisar } from "../../lib/avisar";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";
function formatAvailability(value: Record<string, boolean>, traduzirUi: Text) {
  const labels: Record<string, string> = { dom_m: traduzirUi("Domingo manhã"), dom_n: traduzirUi("Domingo noite"), qua: traduzirUi("Quarta") };
  const items = Object.entries(value).filter(([, ok]) => ok).map(([key]) => labels[key] ?? key);
  return items.join(" · ");
}

function JrnPips({ journey, comTexto = false }: { journey: number[]; comTexto?: boolean }) {
  const traduzirUi = useTexto();
  const { comTermos: ct } = useTermos();
  const feitas = JRN_STEPS.filter((_, i) => !!journey[i]);
  const resumo = feitas.length ? traduzirUi("{feitas} de {total}: {etapas}", { feitas: String(feitas.length), total: String(JRN_STEPS.length), etapas: feitas.map((s) => ct(s.label)).join(", ") }) : traduzirUi("nenhuma etapa ainda");
  return (
    <div className="jrn-cell" title={traduzirUi("{Caminhada}, {resumo}", { resumo })}>
      <div className="jrn-mini" aria-hidden="true">
        {journey.slice(0, 5).map((v, i) => <span key={i} className={`jrn-pip ${v ? "on" : ""}`} />)}
      </div>
      {comTexto ? <span className="jrn-txt">{feitas.length ? traduzirUi("{feitas} de {total} · {etapa}", { feitas: String(feitas.length), total: String(JRN_STEPS.length), etapa: ct(feitas[feitas.length - 1].label) }) : traduzirUi("Nenhuma etapa")}</span> : null}
    </div>
  );
}

/* v7 3.7: Situação que ajuda a agir: novo (com a data de chegada), pausa ou
   férias, sem telefone para o convite, membro desde quando. */
function SituacaoPessoa({ l }: { l: PessoaLinha }) {
  const traduzirUi = useTexto();
  const tel = formatarTelefone(l.member?.phone || l.person?.phone || "");
  let chip: import("react").ReactNode;
  let sub = "";
  if (l.novo) {
    chip = <Selo tom="pendente">{traduzirUi("Novo")}</Selo>;
    const chegou = formatDateBR(l.member?.firstContact || l.member?.createdAt || l.person?.createdAt || "");
    sub = chegou ? traduzirUi("chegou em {data}", { data: chegou.slice(0, 5) }) : "";
  } else if (l.person && l.person.status !== "ativo") {
    chip = <Chip status={l.person.status} />;
  } else if (l.member) {
    chip = <Chip status="membro" />;
    sub = l.member.sinceYear ? traduzirUi("desde {ano}", { ano: String(l.member.sinceYear) }) : "";
  } else {
    chip = <Selo>{traduzirUi("{Voluntario}")}</Selo>;
  }
  return (
    <div className="sit-cell">
      {chip}
      {!tel ? <span className="sit-sub sit-alerta">{traduzirUi("sem telefone")}</span> : sub ? <span className="sit-sub">{sub}</span> : null}
    </div>
  );
}

/* situação em texto, a mesma do selo da tabela, para a planilha */
const STATUS_TEXTO: Record<string, string> = { pausa: "Em pausa", ferias: "Férias" };
function situacaoTexto(l: PessoaLinha, voluntario: string) {
  if (l.novo) return "Novo";
  if (l.person && l.person.status !== "ativo") return STATUS_TEXTO[l.person.status] ?? l.person.status;
  return l.member ? "Membro" : voluntario;
}

/* ação em lote (só a gestão; líder de time não leva a lista embora): telefones das marcadas, um por linha, para colar no WhatsApp ou na agenda */
async function copiarTelefones(linhas: { member?: MemberView; person?: PersonView }[], traduzirUi: Text) {
  const tels = linhas.map((l) => formatarTelefone(l.member?.phone || l.person?.phone || "")).filter(Boolean);
  const sem = linhas.length - tels.length;
  if (!tels.length) { avisar(traduzirUi("Nenhuma das marcadas tem telefone."), "warn"); return; }
  try {
    await navigator.clipboard.writeText(tels.join("\n"));
    avisar(traduzirUi("{tels, plural, =1 {# telefone copiado} other {# telefones copiados}}{sem, plural, =0 {} =1 {; # pessoa sem telefone} other {; # pessoas sem telefone}}.", { tels: tels.length, sem }));
  } catch {
    avisar(traduzirUi("Não deu para copiar. Tente baixar a planilha."), "warn");
  }
}

/* Pessoas (S32): uma lista só com membros e voluntários, filtros por papel e
   a coluna "Serve em". As tabelas do banco continuam separadas; aqui é só a
   tela. */
type PessoaLinha = { key: string; name: string; sub: string; member?: MemberView; person?: PersonView; mins: MinistryView[]; leader: boolean; novo: boolean; photoUrl?: string | null };
export function Membros({ members, people = [], ministries, church, setDrawer, setModal, soTimes = null, filtroInicial, onLimparFiltro, podeJuntar = false }: { members: MemberView[]; people?: PersonView[]; ministries: MinistryView[]; church?: ChurchView; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; soTimes?: string[] | null; filtroInicial?: "em-grupos" | "membros"; onLimparFiltro?: () => void; /* O11: secretaria (can_secretaria) */ podeJuntar?: boolean }) {
  const traduzirUi = useTexto();
  const { comTermos: ct } = useTermos();
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "membros" | "voluntarios" | "lideres" | "novos" | "em-grupos">(filtroInicial ?? "todos");
  const [importando, setImportando] = useState(false);
  const router = useRouter();
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
    const okF = filtro === "todos" || (filtro === "membros" && !!l.member) || (filtro === "voluntarios" && l.mins.length > 0) || (filtro === "lideres" && l.leader) || (filtro === "novos" && l.novo) || (filtro === "em-grupos" && !!l.member?.groupId);
    return okQ && okF;
  });
  const abrir = (l: PessoaLinha) => setDrawer(l.member ? { kind: "member", id: l.member.id } : { kind: "person", id: l.person!.id });
  return (
    <div className="content wide">
      <PageHead title={traduzirUi("Pessoas")} eyebrow={traduzirUi("Pessoas")} subtitle={soTimes ? traduzirUi("Seus times: {times}.", { times: nomesTimes }) : undefined} help={soTimes ? traduzirUi("Você vê aqui as pessoas dos seus times. O restante da igreja fica com a gestão, que pode liberar em Configurações › Permissões.") : traduzirUi("Toda a congregação entra aqui, sirva ou não em um time. É diferente de {Voluntarios}, que lista só quem já serve ativamente.")} action={soTimes ? undefined : <>{church ? <Botao onClick={() => setImportando(true)}><Icon name="anexo" size={14} /> {traduzirUi("Importar planilha")}</Botao> : null}<Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo membro"), subtitle: traduzirUi("Nome, sobrenome e telefone bastam: o convite do app vai pelo WhatsApp e a pessoa completa o resto."), saveLabel: traduzirUi("Adicionar membro"), formFields: [{ k:"nome", label:traduzirUi("Nome e sobrenome"), type:"text", req:true, ph:traduzirUi("Como a pessoa se chama"), hint:traduzirUi("A pessoa pode ajustar depois no app."), secao:traduzirUi("Dados da pessoa") }, { k:"tel", label:traduzirUi("Telefone (WhatsApp)"), type:"text", half:true, req:true, ph:"(11) 9...", hint:traduzirUi("Ao salvar, o WhatsApp abre com o convite do app para este número.") }, { k:"email", label:traduzirUi("E-mail"), type:"text", half:true, ph:traduzirUi("opcional"), hint:traduzirUi("Opcional: a pessoa informa no convite.") }, { k:"nasc", label:traduzirUi("Aniversário"), type:"date", half:true }, { k:"cep", label:traduzirUi("CEP"), type:"cep", half:true, secao:traduzirUi("Endereço (opcional)"), ph:"00000-000", hint:traduzirUi("Preenche rua, bairro, cidade e estado sozinho."), autofill:{ street:"rua", neighborhood:"bairro", city:"cidade", state:"estado" } }, { k:"bairro", label:traduzirUi("Bairro"), type:"text", half:true, ph:traduzirUi("Onde mora") }, { k:"rua", label:traduzirUi("Rua"), type:"text", half:true, ph:traduzirUi("Nome da rua") }, { k:"cidade", label:traduzirUi("Cidade"), type:"text", half:true }, { k:"estado", label:traduzirUi("Estado"), type:"text", half:true, ph:traduzirUi("UF") }], action: { kind: "member" } })}>{traduzirUi("+ Novo membro")}</Botao></>} />
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder={traduzirUi("Buscar por nome ou telefone...")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Segmentado className="seg-wrap">
          {([["todos", traduzirUi("Todos"), linhas.length], ["membros", traduzirUi("Membros"), conta.membros], ["voluntarios", traduzirUi("{Voluntarios}"), conta.voluntarios], ["lideres", traduzirUi("Líderes"), conta.lideres], ["novos", traduzirUi("Novos"), conta.novos]] as const).map(([id, l, n]) => (
            <Opcao key={id} marcada={filtro === id} onClick={() => setFiltro(id)}>{l} <span className="seg-n">{n}</span></Opcao>
          ))}
        </Segmentado>
      </div>
      {filtroInicial && <div className="panel-head" role="status"><span className="panel-meta">{filtro === "em-grupos" ? traduzirUi("Filtro: membros em {grupos}") : traduzirUi("Filtro: membros registrados")}</span><Botao variante="texto" onClick={() => { setFiltro("todos"); onLimparFiltro?.(); }}>{traduzirUi("Limpar filtro")}</Botao></div>}
      {podeJuntar && !soTimes && church ? <DuplicadosAviso linhas={linhas} organizationId={church.organizationId} onJuntou={() => router.refresh()} /> : null}
      <p className="jrn-legenda">{traduzirUi.rich("<b>{Caminhada}</b>, uma barra por etapa, na ordem: {etapas}.", { etapas: JRN_STEPS.map((s) => ct(s.label)).join(" · "), b: (c) => <b>{c}</b> })}</p>
      <Tabela
        rotulo={traduzirUi("Pessoas")}
        linhas={visible}
        chave={(l) => l.key}
        nomeLinha={(l) => l.name}
        aoAbrir={abrir}
        chaveAnimacao={`${filtro}|${q}`}
        colunas={[
          { id: "pessoa", rotulo: traduzirUi("Pessoa"), largura: "1.6fr", celula: (l) => <div className="cell-person"><Av name={l.name} size="md" photoUrl={l.photoUrl} /><div><div className="cell-name">{l.name}</div><div className="cell-sub">{l.sub}</div></div></div> },
          { id: "serve", rotulo: traduzirUi("Serve em"), largura: "1.3fr", celula: (l) => (l.mins.length > 0 ? <div className="cell-tags">{l.mins.map((min) => <Etiqueta key={min.id}>{min.name}</Etiqueta>)}{l.leader && <span className="lider-tag">{traduzirUi("Líder")}</span>}</div> : null) },
          { id: "caminhada", rotulo: traduzirUi("{Caminhada}"), largura: "1fr", celula: (l) => (l.member ? <JrnPips journey={l.member.journey} comTexto /> : null) },
          { id: "situacao", rotulo: traduzirUi("Situação"), largura: "0.9fr", celula: (l) => <SituacaoPessoa l={l} /> },
        ]}
        lote={soTimes ? undefined : (marcadas) => <>
          <Botao compacto onClick={() => copiarTelefones(marcadas, traduzirUi)}>{traduzirUi("Copiar telefones")}</Botao>
          <Botao compacto onClick={() => baixarCsv("pessoas.csv", [["Nome", "Telefone", "Serve em", "Situação"], ...marcadas.map((l) => [l.name, formatarTelefone(l.member?.phone || l.person?.phone || ""), l.mins.map((m) => m.name).join(", "), situacaoTexto(l, ct("{Voluntario}"))])])}>{traduzirUi("Baixar planilha")}</Botao>
        </>}
        vazio={<EmptyState title={traduzirUi("Ninguém por aqui")} text={traduzirUi("Quem você cadastrar aparece nesta lista. Se usou a busca ou um filtro, tente limpar.")} />}
      />
      {importando && church ? <ImportarMembros church={church} members={members} onClose={() => setImportando(false)} onDone={() => router.refresh()} /> : null}
    </div>
  );
}

export function Pessoas({ people, ministries = [], currentPersonId, setDrawer, setModal, filtroInicial, onLimparFiltro }: { people: PersonView[]; ministries?: MinistryView[]; currentPersonId?: string | null; setDrawer: (drawer: DrawerState) => void; setModal: (modal: ModalState) => void; filtroInicial?: "servindo"; onLimparFiltro?: () => void }) {
  const traduzirUi = useTexto();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"todos" | "ativo" | "pausa">("todos");
  const [filtroServindo, setFiltroServindo] = useState(filtroInicial === "servindo");
  const visible = people.filter((person) => {
    const okQ = !q || person.name.toLowerCase().includes(q.toLowerCase());
    const okStatus = status === "todos" || person.status === status;
    const okServe = !filtroServindo || (person.status === "ativo" && ministries.some((min) => min.people.some((p) => p.personId === person.id)));
    return okQ && okStatus && okServe;
  });
  return (
    <div className="content">
      <PageHead title={traduzirUi("{Voluntarios}")} eyebrow={traduzirUi("Pessoas")} help={traduzirUi("Todo mundo com acesso de {voluntario} na igreja, mesmo quem ainda não está em nenhum time. Veja funções, disponibilidade e participação nos times.")} action={<Botao variante="principal" onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo {voluntario}"), subtitle: traduzirUi("Cadastre e já escolha os times."), saveLabel: traduzirUi("Adicionar {voluntario}"), formFields: [{ k:"nome", label:traduzirUi("Nome completo"), type:"text", req:true, ph:traduzirUi("Como a pessoa se chama") }, { k:"tel", label:traduzirUi("Telefone"), type:"text", half:true, ph:"(11) 9..." }, { k:"email", label:traduzirUi("E-mail"), type:"text", half:true, ph:traduzirUi("e-mail da pessoa") }], action: { kind: "member" } })}>{traduzirUi("+ Novo {voluntario}")}</Botao>} />
      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder={traduzirUi("Buscar por nome...")} value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <Segmentado>
          <Opcao marcada={status === "todos"} onClick={() => setStatus("todos")}>{traduzirUi("Todos")}</Opcao>
          <Opcao marcada={status === "ativo"} onClick={() => setStatus("ativo")}>{traduzirUi("Ativos")}</Opcao>
          <Opcao marcada={status === "pausa"} onClick={() => setStatus("pausa")}>{traduzirUi("Pausa")}</Opcao>
        </Segmentado>
        <div className="tb-spacer" />
        <span className="panel-meta">{traduzirUi("{count, plural, =1 {{n} pessoas} other {{n} pessoas}}", { count: visible.length, n: String(visible.length) })}</span>
      </div>
      {filtroServindo && <div className="panel-head" role="status"><span className="panel-meta">{traduzirUi("Filtro: pessoas que servem em times")}</span><Botao variante="texto" onClick={() => { setFiltroServindo(false); onLimparFiltro?.(); }}>{traduzirUi("Limpar filtro")}</Botao></div>}
      <div className="tbl">
        <Linha estilo="tabela" className="head tr-people"><div>{traduzirUi("{Voluntario}")}</div><div>{traduzirUi("Disponibilidade")}</div><div>{traduzirUi("Etiquetas")}</div><div>{traduzirUi("Status")}</div></Linha>
        {visible.map((person) => (
          <Acao className={`${linhaClasse({ estilo: "tabela" })} click tr-people`} key={person.id} onClick={() => setDrawer({ kind: "person", id: person.id })}>
            <div className="who">
              <Av name={person.name} photoUrl={person.photoUrl} />
              <div>
                <strong>{person.name}{person.id === currentPersonId && <span style={{ color: "var(--olive)", fontSize: "var(--fs-pn-12)", marginLeft: 7 }}>{traduzirUi("você")}</span>}</strong>
                <small>{formatarTelefone(person.phone)}</small>
              </div>
            </div>
            <div>{formatAvailability(person.availability, traduzirUi)}</div>
            <div>{person.tags.join(" · ")}</div>
            <div><Chip status={person.status} /></div>
          </Acao>
        ))}
        {visible.length === 0 && <Vazio titulo={traduzirUi("Ninguém encontrado.")} />}
      </div>
    </div>
  );
}
