"use client";

import { telefoneParaWhatsapp } from "../lib/telefone";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { ICON_PATHS, DEFAULT_ICON, Icon } from "../lib/icons";
import { parseISODate } from "../lib/date";
import { HelpDot } from "../HelpSystem";
import { JRN_STEPS } from "./caminhada";
import { ACESSO_MSG_DEFAULT } from "../modules/pessoas/acesso-msg";
import { modulosLigados } from "../modules/registry";
import type { ChurchView, JourneyStepKind, MatrizV2, MemberView, PapelV2, PersonView, ReservationView } from "./tipos";

import { Contagem } from "../ui/Contagem";
/* módulos ligados na igreja (registro de módulos, lei 3) */
export function ligadosDa(church?: ChurchView, condicoes: Record<string, boolean> = {}) {
  return modulosLigados({ on: church?.modulosOn, off: church?.modulosOff }, condicoes);
}

export const OUTRO_LOCAL = "__outro__";

/* Biblioteca de ícones (traço, feather-style) : app/service/lib/icons.tsx.
   ICONS aqui é só um alias local pro nome antigo usado no resto do arquivo. */
export const ICONS = ICON_PATHS;

export const CEX_ICON_FOR: Record<string, string> = {
  painel: "painel", mapa: "mapapin", membros: "membros", pessoas: "pessoa", times: "times", visitantes: "visitante", criancas: "kids",
  decisoes: "decisoes", batismos: "batismos", cursos: "cursos",
  escalas: "escalas", reunioes: "reunioes", ensaios: "ensaios", quadros: "quadros", espacos: "espacos",
  cultos: "cultos", comunicacao: "comunicacao", conversas: "conversas", oracao: "oracao",
  relatorios: "relatorios", config: "config", identidade: "identidade", historia: "historia", marca: "pincel", secretaria: "documento",
};

export const ROUTES = {
  painel: "SERVICE · PAINEL",
  membros: "SERVICE · MEMBROS",
  pessoas: "SERVICE · VOLUNTÁRIOS",
  times: "SERVICE · TIMES",
  visitantes: "SERVICE · VISITANTES",
  criancas: "SERVICE · CRIANÇAS",
  decisoes: "SERVICE · DECISÕES",
  batismos: "SERVICE · BATISMOS",
  cursos: "SERVICE · CURSOS",
  escalas: "SERVICE · ESCALAS",
  reunioes: "SERVICE · REUNIÕES",
  ensaios: "SERVICE · ENSAIOS",
  espacos: "SERVICE · ESPAÇOS",
  quadros: "SERVICE · QUADROS",
  cultos: "SERVICE · AGENDA",
  comunicacao: "SERVICE · COMUNICAÇÃO",
  conversas: "SERVICE · CONVERSAS",
  oracao: "SERVICE · ORAÇÃO",
  relatorios: "SERVICE · RELATÓRIOS",
  secretaria: "SERVICE · SECRETARIA",
  config: "SERVICE · CONFIGURAÇÕES",
  identidade: "SERVICE · IDENTIDADE",
  historia: "SERVICE · NOSSA HISTÓRIA",
  grupos: "SERVICE · GRUPOS",
  pesquisas: "SERVICE · PESQUISAS",
  pagina: "SERVICE · PÁGINA DA IGREJA",
  configurar: "SERVICE · CONFIGURAR A IGREJA",
  aniversariantes: "SERVICE · ANIVERSARIANTES",
  financeiro: "SERVICE · FINANCEIRO",
  mapa: "SERVICE · MAPA DA IGREJA",
};

/* visitante sem nenhum contato registrado 48h depois da visita */
export function semContato48h(v: { stage: string; visited_on: string | null; id: string }, notes: { visitor_id: string }[]) {
  if (v.stage === "membro" || !v.visited_on) return false;
  if (notes.some((n) => n.visitor_id === v.id)) return false;
  const visita = parseISODate(v.visited_on);
  if (!visita) return false;
  return Date.now() - visita.getTime() > 48 * 3600 * 1000;
}

export function TeamMark({ ministry, size = 16 }: { ministry?: { icon?: string; name?: string }; size?: number }) {
  const nome = ministry?.name?.toLowerCase() ?? "";
  const iconName = (ministry?.icon && ICONS[ministry.icon]) ? ministry.icon :
    (nome.includes("louvor") ? "louvor" :
    nome.includes("kids") || nome.includes("infantil") || nome.includes("criança") ? "kids" :
    nome.includes("berç") ? "bercario" :
    nome.includes("mídia") || nome.includes("media") ? "midia" :
    nome.includes("foto") ? "fotografia" :
    nome.includes("transmiss") || nome.includes("live") || nome.includes("streaming") ? "transmissao" :
    nome.includes("som") || nome.includes("áudio") || nome.includes("audio") ? "som" :
    nome.includes("recep") ? "recepcao" :
    nome.includes("diacon") ? "diaconia" :
    nome.includes("intercess") || nome.includes("oraç") ? "oracao" :
    nome.includes("missõ") || nome.includes("missao") || nome.includes("missõe") ? "missoes" :
    nome.includes("jovens") || nome.includes("juventude") ? "jovens" :
    nome.includes("casais") || nome.includes("família") || nome.includes("familia") ? "casais" :
    nome.includes("segur") ? "seguranca" :
    nome.includes("estacionamento") ? "estacionamento" :
    nome.includes("limp") ? "limpeza" :
    nome.includes("manut") ? "manutencao" :
    nome.includes("transport") || nome.includes("van") ? "transporte" :
    nome.includes("copa") || nome.includes("cozinha") || nome.includes("hospit") ? "copa" : DEFAULT_ICON);
  return <Icon name={iconName} size={size} />;
}
/* Emoji real do WhatsApp, exceção pontual à regra "zero emoji" do AGENTS.md — só
   nas perguntas tipo 'emoji' das pesquisas da própria igreja (service.pesquisas),
   pedido explícito do usuário pro pulso pós-escala. Não usar fora daqui. */
export const REACOES_PESQUISA = ["😡", "😕", "😐", "🙂", "😍"];

/* estado vazio único: título curto, uma frase do que vai aparecer ali e,
   quando houver, o botão da primeira ação */

export function Kpi({ icon, label, value, foot, amber, help }: { icon: string; label: string; value: string | number; foot: string; amber?: boolean; help?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label"><Icon name={icon} size={13} /> <span>{label} {help ? <HelpDot text={help} /> : null}</span></div>
      <div className="kpi-value" style={amber ? { color: "var(--amber)" } : undefined}><Contagem valor={value} /></div>
      <div className="kpi-foot">{foot}</div>
    </div>
  );
}


export const VISITOR_STAGES = [
  { id: "novo", name: "Novo", color: "var(--amber)" },
  { id: "contato", name: "Contato", color: "var(--clay)" },
  { id: "integrando", name: "Integrando", color: "var(--olive)" },
  { id: "membro", name: "Membro", color: "var(--wheat)" },
] as const;

/* Mural : módulo em modules/mural/ (4.1) */

/* datas de produção vêm em YYYY-MM-DD (coluna `date` do Postgres) ou DD/MM/YYYY
   (mock de /service/demo) : tolera as duas. */
export function parseFlexDate(str: string | null | undefined): Date | null {
  if (!str) return null;
  const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3]);
  const br = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1]);
  return null;
}

export const BAT_ST_MAP: Record<string, { label: string; cls: string }> = {
  aberta: { label: "Inscrições abertas", cls: "chip-ok" },
  preparacao: { label: "Em preparação", cls: "chip-wait" },
  agendada: { label: "Agendada", cls: "chip-ok" },
  concluida: { label: "Concluída", cls: "chip-neutral" },
};

/* ── Papéis & permissões · 4 níveis (Master, Pastor, Líder, Voluntário) ── */
/* nomes e grupos iguais aos do menu (S51); os ids são os códigos gravados
   na matriz de permissões e não mudam */
export const ACOES_V2 = [
  { id: "painel", nome: "Início e relatórios", grupo: "Início" },
  { id: "membros", nome: "Pessoas e grupos", grupo: "Pessoas" },
  { id: "voluntarios", nome: "{Voluntarios}", grupo: "Pessoas" },
  { id: "visitantes", nome: "Visitantes", grupo: "Pessoas" },
  { id: "kids", nome: "Crianças", grupo: "Pessoas" },
  { id: "decisoes", nome: "Decisões", grupo: "Pessoas" },
  { id: "times", nome: "Times", grupo: "Ministério" },
  { id: "escala", nome: "Escalas", grupo: "Ministério" },
  { id: "ensaios", nome: "Ensaios", grupo: "Ministério" },
  { id: "reunioes", nome: "Reuniões", grupo: "Ministério" },
  { id: "cultos", nome: "{Cultos}, eventos e espaços", grupo: "Agenda" },
  { id: "comunica", nome: "Mural e pesquisas", grupo: "Comunicação" },
  { id: "oracao", nome: "Pedidos de oração", grupo: "Comunicação" },
  { id: "conversas", nome: "Conversas", grupo: "Comunicação" },
  { id: "batismos", nome: "Batismos", grupo: "Formação" },
  { id: "cursos", nome: "Cursos e trilhas", grupo: "Formação" },
  { id: "identidade", nome: "Identidade e propósito", grupo: "Gestão" },
  { id: "historia", nome: "Nossa história", grupo: "Gestão" },
  { id: "quadros", nome: "Quadros", grupo: "Gestão" },
  { id: "secretaria", nome: "Secretaria", grupo: "Gestão" },
  { id: "igreja", nome: "Dados da igreja e página", grupo: "Configurações" },
  { id: "permissoes", nome: "Configurações e permissões", grupo: "Configurações" },
  { id: "rede", nome: "Congregações", grupo: "Configurações" },
] as const;

export const PAPEIS_V2 = [
  { id: "master", nome: "Pastor Master", desc: "Controle total da rede", ic: "globo" },
  { id: "pastor", nome: "Pastor", desc: "Sua congregação inteira", ic: "identidade" },
  { id: "lider", nome: "Líder", desc: "Seu time e grupo", ic: "times" },
  { id: "voluntario", nome: "{Voluntario}", desc: "Quem serve num time. Usa o app; vê no painel só o que você ligar aqui", ic: "pessoa" },
  { id: "membro", nome: "Membro", desc: "App: {caminhada}, cursos e o que for liberado", ic: "pessoa" },
] as const;

export function matrizV2Padrao(): MatrizV2 {
  const allTrue = () => Object.fromEntries(ACOES_V2.map((a) => [a.id, true]));
  const allFalse = () => Object.fromEntries(ACOES_V2.map((a) => [a.id, false]));
  return {
    master: allTrue(),
    pastor: { ...allTrue(), permissoes: true, rede: false },
    lider: { ...allFalse(), painel: true, voluntarios: true, times: true, decisoes: true, escala: true, cultos: true, comunica: true, kids: true, ensaios: true, reunioes: true, quadros: true, conversas: true },
    /* começa sem nenhuma tela do painel: o voluntário só usa o app */
    voluntario: allFalse(),
    membro: allFalse(),
  };
}

/* mescla a matriz vinda do banco (core.role_permissions, já sem prefixo "service.")
   com o padrão, pra cobrir qualquer ação nova que a org ainda não tenha uma linha
   salva (ex.: org criada antes de algum ACOES_V2 novo existir). */
export function matrizComFallback(fromDb: Record<string, Record<string, boolean>>): MatrizV2 {
  const fallback = matrizV2Padrao();
  const roles = Object.keys(fallback) as PapelV2[];
  return Object.fromEntries(
    roles.map((role) => [role, { ...fallback[role], ...(fromDb[role] ?? {}) }]),
  ) as MatrizV2;
}

export function timelineEventPayload(organizationId: string, memberId: string, eventType: string, title: string, dateStr?: string | null) {
  const d = dateStr ? new Date(`${dateStr}T12:00:00`) : new Date();
  const sortKey = Number(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`);
  return {
    organization_id: organizationId,
    member_id: memberId,
    event_type: eventType,
    title,
    sort_key: sortKey,
    when_label: d.toLocaleDateString("pt-BR"),
  };
}


export const JORNADA_KIND_INDEX: Record<JourneyStepKind, number> = { decisao: 0, batismo: 1, curso: 2, integracao: 3, time: 4 };

export async function writeJourneyStep(organizationId: string, member: MemberView, step: JourneyStepKind, eventDate?: string | null) {
  const stepDef = JRN_STEPS.find((s) => s.kind === step);
  const sb = createServiceBrowserClient().schema("service");
  await sb.from("timeline_events").insert(
    timelineEventPayload(organizationId, member.id, step, stepDef?.label ?? step, eventDate),
  );
  const journey = [...member.journey];
  journey[JORNADA_KIND_INDEX[step]] = 1;
  await sb.from("members").update({ journey }).eq("id", member.id);
}

export function fillAcessoMsgTemplate(template: string, vars: { nome: string; igreja: string; link: string; email: string; senha: string }): string {
  return template
    .replaceAll("{nome}", vars.nome)
    .replaceAll("{igreja}", vars.igreja)
    .replaceAll("{link}", vars.link)
    .replaceAll("{email}", vars.email)
    .replaceAll("{senha}", vars.senha);
}

/* Convite do membro pelo WhatsApp do líder: gera o link de uso único
   (app/api/service/members/invite, a pessoa cria e-mail, senha e CEP nele)
   ou, se ela já tem acesso, o login da igreja, e abre o wa.me com a mensagem
   da igreja. A aba precisa ser aberta no clique (antes de qualquer await),
   senão o navegador bloqueia o pop-up: quem chama passa essa aba em `tab`.
   Fonte única: cadastro de membro novo e botão "mandar acesso" da ficha. */
export async function openMemberInviteWhatsapp(opts: {
  memberId: string;
  name: string;
  phone: string | null;
  churchName: string;
  template?: string;
  tab: Window | null;
}): Promise<{ error?: string; alreadyHasAccess?: boolean }> {
  const waPhone = telefoneParaWhatsapp(opts.phone);
  if (!waPhone) {
    opts.tab?.close();
    return { error: "Cadastre o telefone com DDD. Para outro país, inclua + e o código do país." };
  }
  let res: Response;
  try { res = await fetch("/api/service/members/invite", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ memberId: opts.memberId }),
  }); } catch {
    opts.tab?.close();
    return { error: "Não conseguimos gerar o acesso agora. O cadastro foi preservado. Tente novamente pela ficha da pessoa." };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.link) {
    opts.tab?.close();
    return { error: data.error ?? "Não foi possível gerar o convite agora. Tente de novo." };
  }
  const msg = fillAcessoMsgTemplate(opts.template || ACESSO_MSG_DEFAULT.mensagem, {
    nome: opts.name.split(" ")[0],
    igreja: opts.churchName,
    link: data.link,
    /* templates antigos ainda podem ter {email}/{senha}: a pessoa cria os dois no link */
    email: data.alreadyHasAccess ? "o que você já usa" : "você informa no link",
    senha: data.alreadyHasAccess ? "a mesma que você já usa" : "você cria no link",
  });
  const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
  if (opts.tab && !opts.tab.closed) opts.tab.location.href = url;
  else if (!window.open(url, "_blank")) return { error: "O acesso foi gerado, mas o navegador bloqueou o WhatsApp. Libere a abertura de janelas e tente novamente pela ficha da pessoa." };
  return { alreadyHasAccess: !!data.alreadyHasAccess };
}

export function normalize(value: string) {
  return value.trim().toLowerCase();
}

export function findPersonByName(people: PersonView[], value: string) {
  const term = normalize(value);
  if (!term) return null;
  return people.find((person) => normalize(person.name) === term || normalize(person.name).includes(term)) ?? null;
}

export const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
export function weekdayShortFromDate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return WEEKDAY_SHORT[d.getDay()];
}


export const DP_MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

/* o DatePicker devolve "10 jul" (sem ano, pensado pra colunas text como
   meetings.meeting_date). service.reservations.reserved_date é uma coluna
   date de verdade : precisa de ISO. Assume o ano corrente, rolando pro
   próximo ano se o dia já passou. */
export function dpToIsoDate(value: string): string | null {
  const [dayStr, monStr] = (value || "").split(" ");
  const day = parseInt(dayStr, 10);
  const monthIndex = DP_MESES.findIndex((m) => m.toLowerCase() === (monStr || "").toLowerCase());
  if (!day || monthIndex < 0) return null;
  const now = new Date();
  let year = now.getFullYear();
  if (new Date(year, monthIndex, day) < new Date(year, now.getMonth(), now.getDate())) year += 1;
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function timeToMinutes(value: string): number | null {
  const m = (value || "").match(/(\d{1,2})[h:](\d{2})/);
  return m ? parseInt(m[1], 10) * 60 + parseInt(m[2], 10) : null;
}

/* conflito de horário numa sala: mesma sala, mesma data, faixas que se cruzam */
export function findRoomConflict(reservations: ReservationView[], roomId: string, isoDate: string, start: string, end: string): ReservationView | null {
  const startMin = timeToMinutes(start);
  const endMin = timeToMinutes(end);
  if (startMin === null || endMin === null) return null;
  return reservations.find((r) => {
    if (r.room_id !== roomId || r.reserved_date !== isoDate) return false;
    const rStart = timeToMinutes(r.start_time ?? "");
    const rEnd = timeToMinutes(r.end_time ?? "");
    if (rStart === null || rEnd === null) return false;
    return startMin < rEnd && rStart < endMin;
  }) ?? null;
}
