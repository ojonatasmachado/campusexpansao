"use client";

import { useContext, useState, useId } from "react";
import { Icon } from "../lib/icons";
import { formatDateBR, joinDot } from "../lib/date";
import ChurchLockup from "../ChurchLockup";
import { TextSizeSlider } from "../TextSizeSlider";
import { useTermos } from "../lib/vocabulario-context";
import { proximaAula } from "../lib/aulas";
import { JourneyContext, contactErrors, dataLonga, realValue } from "./comum";
import type { BaptismClass, Course, CourseLesson, CourseModule, Enrollment, JourneyRequest, JourneyStep, M, MemberContactInput, Ministry, P, StepView } from "./tipos";

import { Botao } from "../ui/Botao";
import { Cartao } from "../ui/Cartao";
import { Campo, Entrada } from "../ui/Campo";
// ── constantes ────────────────────────────────────────────────────────────────

/* etapas da caminhada; a 4ª usa o nome que a igreja deu aos grupos
   (vocabulário, lei 7), nunca a sigla */
export function useJornada() {
  const { termo } = useTermos();
  return ["Decisão", "Batismo", "Fundamentos", termo("grupo"), "Servindo"];
}

// ── Onboarding (primeiro acesso do membro) ───────────────────────────────────

export const APP_TABS_INFO = [
  { ic: "inicio", t: "Início", s: "O que precisa de você agora e o que acontece na igreja." },
  { ic: "agenda", t: "Agenda", s: "Sua escala, suas tarefas e a agenda da igreja." },
  { ic: "conversas", t: "Mensagens", s: "O Mural da igreja e as conversas com a liderança." },
  { ic: "cursos", t: "{Caminhada}", s: "Seus passos na igreja, cursos e a Bíblia." },
  { ic: "perfil", t: "Perfil", s: "Toque na sua foto no alto: seus dados, família, tamanho do texto e tema." },
];

export function AppTabsInfoGrid() {
  const { comTermos: ct } = useTermos();
  return (
    <div className="ob-tabs-grid">
      {APP_TABS_INFO.map((x) => (
        <div className="ob-tab-item" key={x.t}>
          <span className="ob-tab-ic"><Icon name={x.ic} size={18} /></span>
          <div><b>{ct(x.t)}</b><small>{x.s}</small></div>
        </div>
      ))}
    </div>
  );
}

export function AppTourModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="m-sheet-bg" onClick={onClose}>
      <div className="ob-card" style={{ maxWidth: 320 }} onClick={(e) => e.stopPropagation()}>
        <div className="ob-welcome-x" style={{ marginBottom: 14, fontWeight: 700, fontSize: "var(--fs-app-15)" }}>Conheça o app</div>
        <AppTabsInfoGrid />
        <Botao variante="principal" style={{ width: "100%", marginTop: 16 }} onClick={onClose}>Fechar</Botao>
      </div>
    </div>
  );
}


/* Primeiro acesso em 2 passos (v7 4.10): nome e telefone; tamanho do texto
   (a própria tela é a prévia: ela já muda de tamanho enquanto a pessoa
   arrasta). Foto, e-mail, aniversário e CEP viram o cartão "Complete seus
   dados" no Início; o atalho na tela de início é pedido no segundo acesso. */
export function Onboarding({ person, member, churchName, churchLogoUrl, onCompleteOnboarding, onDone }: { person: P; member: M | null; churchName?: string; churchLogoUrl?: string | null; organizationId?: string; onCompleteOnboarding?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>; onDone: () => void }) {
  const fieldId = useId();
  const { comTermos: ct } = useTermos();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<MemberContactInput>({
    name: member?.name ?? person.name,
    email: realValue(member?.email),
    phone: realValue(member?.phone),
    nasc: member?.birth ?? "",
    country: member?.country,
    cep: member?.postalCode ?? "",
    rua: member?.street ?? "",
    bairro: member?.neighborhood ?? "",
    cidade: member?.city ?? "",
    estado: member?.state ?? "",
  });
  const [tentou, setTentou] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erroSalvar, setErroSalvar] = useState("");
  const set = (k: keyof MemberContactInput, v: string) => setD((p) => ({ ...p, [k]: v }));
  const todos = contactErrors(d);
  const erros = { name: todos.name, phone: todos.phone };
  const dadosOk = !erros.name && !erros.phone;

  const steps = [
    {
      t: `Que bom ter você aqui, ${person.name.split(" ")[0]}`,
      s: "Confirme seu nome e seu telefone. É o que a liderança usa para falar com você.",
      body: (
        <div className="ob-form">
          <Campo rotulo="Nome e sobrenome" obrigatorio erro={tentou && erros.name ? erros.name : undefined}>
            <Entrada id={`${fieldId}-name`} value={d.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
          </Campo>
          <Campo rotulo="Telefone (WhatsApp)" obrigatorio erro={tentou && erros.phone ? erros.phone : undefined}>
            <Entrada id={`${fieldId}-phone`} type="tel" value={d.phone} autoComplete="tel" placeholder="(11) 90000-0000" onChange={(e) => set("phone", e.target.value)} />
          </Campo>
        </div>
      ),
      ok: "Continuar →",
    },
    {
      t: "Tamanho do texto",
      s: "Arraste até ler com conforto. A tela inteira já muda junto. Dá para trocar depois no Perfil.",
      body: (
        <div className="ob-textsize">
          <TextSizeSlider previa={false} />
          <Cartao estilo="app" plano className="ob-previa" aria-hidden="true">
            <div className="m6-kick">Domingo · 9:30</div>
            <div className="m6-ct">{ct("{Culto} da manhã")}</div>
            <div className="m6-meta">Você serve na Recepção · chegar às 9:00</div>
          </Cartao>
        </div>
      ),
      ok: "Entrar no app →",
    },
  ] as const;

  const cur = steps[step];

  const next = async () => {
    if (step === 0) {
      if (!dadosOk) { setTentou(true); return; }
      /* grava ao sair do passo 1 e só avança se gravou: fechar o app no passo 2
         não traz o primeiro acesso de volta. Os outros campos vão como estão
         (vazio não apaga nada no servidor). */
      if (onCompleteOnboarding) {
        setSalvando(true);
        setErroSalvar("");
        const { error } = await onCompleteOnboarding(person.id, member?.id ?? null, d);
        setSalvando(false);
        if (error) { setErroSalvar(error); return; }
      }
      setStep(1);
      return;
    }
    onDone();
  };

  return (
    <div className="ob">
      <div className="ob-card">
        <div className="ob-progress">
          {steps.map((_, i) => (
            <div key={i} className={`ob-dot${i <= step ? " on" : ""}`} />
          ))}
        </div>
        <div className="ob-logo">
          <ChurchLockup size="sm" logoUrl={churchLogoUrl} name={churchName} />
        </div>
        <div className="ob-eyebrow">Primeiro acesso · passo {step + 1} de {steps.length}</div>
        <h2 className="ob-title">{cur.t}</h2>
        <p className="ob-sub">{cur.s}</p>
        <div className="ob-body">{cur.body}</div>
        {erroSalvar && <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginBottom: 10 }}>{erroSalvar}</div>}
        <div className="ob-actions">
          {step > 0 && (
            <Botao onClick={() => setStep(step - 1)}>
              Voltar
            </Botao>
          )}
          <Botao
            variante="principal"
            style={{ flex: 1, justifyContent: "center" }}
            desativado={salvando}
            onClick={next}
          >
            {salvando ? "Salvando..." : cur.ok}
          </Botao>
        </div>
      </div>
    </div>
  );
}

export function useSteps({ person, member, ministries, courses, enrollments, courseModules = [], courseLessons = [], baptismClasses, journeyRequests, onOpenSub, onRequestStep, onServir }: {
  person: P; member: M | null; ministries: Ministry[]; courses: Course[]; enrollments: Enrollment[]; baptismClasses: BaptismClass[];
  courseModules?: CourseModule[]; courseLessons?: CourseLesson[];
  journeyRequests: JourneyRequest[]; onOpenSub: (sub: string) => void; onRequestStep: (step: JourneyStep) => void; onServir: () => void;
}): StepView[] {
  const j = useContext(JourneyContext);
  const JORNADA = useJornada();
  const journey = member?.journey ?? [];
  const pedidos = new Set(journeyRequests.filter((r) => r.memberId === member?.id && r.status === "pendente").map((r) => r.step));
  const cursando = member ? enrollments.find((e) => e.member_id === member.id && e.status !== "concluido") : undefined;
  const cursoNome = cursando ? courses.find((c) => c.id === cursando.course_id)?.name : undefined;
  const turmaInscrita = member ? baptismClasses.find((b) => j.baptismCandidates.some((c) => c.class_id === b.id && c.member_id === member.id)) : undefined;
  const turmaAberta = baptismClasses.find((b) => b.open_enrollment && b.status !== "concluida");
  const pedidoServir = member ? j.serveRequests.find((r) => r.member_id === member.id && r.status === "pendente") : undefined;
  const serve = ministries.some((m) => m.people.some((mp) => mp.personId === person.id));
  const ids: JourneyStep[] = ["decisao", "batismo", "curso", "integracao", "time"];
  return ids.map((id, i) => {
    const nome = JORNADA[i];
    if (journey[i] || (id === "time" && serve)) return { id, nome, st: "feito" };
    if (pedidos.has(id)) return { id, nome, st: "andamento", info: "Pedido enviado · aguardando a liderança" };
    if (id === "batismo") {
      if (turmaInscrita) return { id, nome, st: "andamento", info: joinDot("Inscrição feita", turmaInscrita.label, formatDateBR(turmaInscrita.baptism_date)) };
      if (turmaAberta) return { id, nome, st: "afazer", info: joinDot("Inscrições abertas", turmaAberta.label), acao: "Quero me batizar", run: () => onOpenSub("batismo"), inscricao: joinDot(turmaAberta.label, formatDateBR(turmaAberta.baptism_date)) };
      return { id, nome, st: "afazer", acao: "Já fui batizado", run: () => onRequestStep(id) };
    }
    if (id === "curso") {
      if (cursando) {
        const prox = proximaAula(cursando.course_id, cursando.done_count, courseModules, courseLessons);
        return { id, nome, st: "andamento", info: joinDot(cursoNome, prox && `Próxima aula: ${prox.aula.name}`, dataLonga(prox?.aula.lesson_date), prox?.aula.lesson_time, prox?.aula.location), acao: prox ? "Ver a próxima aula" : "Ver o curso", run: () => onOpenSub("cursos") };
      }
      /* sem curso publicado, o botão levaria a uma lista vazia (lei 6) */
      return courses.length ? { id, nome, st: "afazer", acao: "Ver os cursos", run: () => onOpenSub("cursos") } : { id, nome, st: "afazer" };
    }
    if (id === "time") {
      if (pedidoServir) return { id, nome, st: "andamento", info: "Pedido enviado · o líder vai falar com você" };
      return { id, nome, st: "afazer", acao: "Conhecer os times", run: onServir };
    }
    if (id === "integracao") return { id, nome, st: "afazer", acao: "Já participo", run: () => onRequestStep(id) };
    return { id, nome, st: "afazer", acao: "Contar que já decidi", run: () => onRequestStep(id) };
  });
}

/* calcula as etapas dentro dos contextos (precisa do JourneyContext) */
export function StepsHost({ children, ...p }: Parameters<typeof useSteps>[0] & { children: (steps: StepView[]) => React.ReactNode }) {
  const steps = useSteps(p);
  return <>{children(steps)}</>;
}
