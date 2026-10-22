"use client";

import { Icon } from "./lib/icons";
import { htmlSeguro } from "./lib/html-seguro";
import { plural } from "./lib/plural";
import { useEffect, useRef, useState } from "react";
import { FormScreen, FormSection, type FormScreenHandle } from "./painel/form/FormScreen";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { useServiceAccess } from "./AccessContext";
import RequisitosEditor from "./RequisitosEditor";
import { requirementsFor, saveRequirements, type Requirement } from "./lib/requirements";

import { Botao, BotaoIcone } from "./ui/Botao";
import { Janela } from "./ui/Janela";
import { Interruptor } from "./ui/Interruptor";
import { Acao } from "./ui/Acao";
import { Opcao } from "./ui/Opcao";
import { Linha } from "./ui/Linha";
import { Campo, Entrada, TextoLongo } from "./ui/Campo";
import { Selecao } from "./ui/Selecao";
import { SeletorData, SeletorHora } from "./ui/Data";
import { Vazio, Carregando } from "./ui/Estados";
/* ─── tipos internos do editor ─────────────────────────────── */

type QuizQ = { q: string; opts: string[]; correta: number };
type Material = { id: string; tipo: "video" | "link" | "texto"; titulo: string; url: string };

type AulaState = {
  id: string;
  dbId?: string;
  nome: string;
  tipo: "video" | "texto" | "ao_vivo" | "presencial";
  dur: string;
  link: string;
  conteudo: string;
  prova: QuizQ[] | null;
  minAcertos: number;
  /* aula presencial/ao vivo: dia, hora e sala (0067). Com data, aparece na Agenda do aluno */
  data: string;
  hora: string;
  sala: string;
};

type ModuloState = {
  id: string;
  dbId?: string;
  nome: string;
  aulas: AulaState[];
};

type CursoLocal = {
  nome: string;
  nivel: string;
  tipo: "trilha" | "conteudo" | "presencial";
  modalidade: "presencial" | "remoto" | "hibrido" | "ao_vivo";
  cor: string;
  desc: string;
  divulgacao: string;
  /* false: o curso não aparece no app do membro (rascunho). Coluna da 0049. */
  publicado: boolean;
  materiais: Material[];
  preReqs: Requirement[];
  modulos: ModuloState[];
};

export type CursoEditorProps = {
  courseId: string | null;
  church: { id: string; organizationId: string };
  allCourses: Array<{ id: string; name: string }>;
  onClose: () => void;
};

/* ─── constantes ────────────────────────────────────────────── */

const MODALIDADES = [
  { v: "presencial", l: "Presencial" },
  { v: "remoto", l: "Remoto (app)" },
  { v: "hibrido", l: "Híbrido" },
  { v: "ao_vivo", l: "Ao vivo online" },
] as const;

const AULA_TIPOS = [
  { v: "video", l: "Vídeo" },
  { v: "texto", l: "Texto" },
  { v: "ao_vivo", l: "Ao vivo" },
  { v: "presencial", l: "Presencial" },
] as const;

const MAT_TIPOS = [
  { v: "video", l: "Vídeo" },
  { v: "link", l: "Link / PDF" },
  { v: "texto", l: "Texto" },
] as const;

const CORES = [
  { v: "olive", l: "Oliva" },
  { v: "wheat", l: "Trigo" },
  { v: "clay", l: "Barro" },
  { v: "terra", l: "Terra" },
  { v: "sand", l: "Areia" },
  { v: "amber", l: "Âmbar" },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function blankCurso(): CursoLocal {
  return {
    nome: "", nivel: "", tipo: "trilha", modalidade: "remoto",
    cor: "clay", desc: "", divulgacao: "", publicado: true, materiais: [], preReqs: [],
    modulos: [{ id: uid(), nome: "Módulo 1", aulas: [] }],
  };
}

/* ─── RichText ──────────────────────────────────────────────── */

function RichText({
  value, onChange, placeholder, minH,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; minH?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    /* o texto gravado passa pela mesma limpeza da tela do membro antes de virar HTML editável */
    const limpo = htmlSeguro(value);
    if (ref.current && ref.current.innerHTML !== limpo) {
      ref.current.innerHTML = limpo;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cmd = (c: string, val?: string) => {
    document.execCommand(c, false, val);
    if (ref.current) { ref.current.focus(); onChange(ref.current.innerHTML); }
  };
  const addLink = () => {
    const u = window.prompt("Endereço do link (https://...)");
    if (u) cmd("createLink", u);
  };

  return (
    <div className="rt">
      <div className="rt-bar">
        <Acao onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("bold")}><b>B</b></Acao>
        <Acao onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("italic")}><i>I</i></Acao>
        <Acao onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("formatBlock", "<h3>")}>Título</Acao>
        <Acao onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertUnorderedList")}>· Lista</Acao>
        <Acao onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertOrderedList")}>1. Lista</Acao>
        <Acao onMouseDown={(e) => e.preventDefault()} onClick={addLink}>→ Link</Acao>
      </div>
      <div
        ref={ref}
        className="rt-area"
        contentEditable
        suppressContentEditableWarning
        data-ph={placeholder || "Escreva aqui…"}
        style={{ minHeight: minH ?? 120 }}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
      />
    </div>
  );
}

/* ─── MateriaisEditor ───────────────────────────────────────── */

function MateriaisEditor({
  value, onChange,
}: {
  value: Material[]; onChange: (v: Material[]) => void;
}) {
  const [tipo, setTipo] = useState<Material["tipo"]>("video");
  const [titulo, setTitulo] = useState("");
  const [url, setUrl] = useState("");

  const add = () => {
    if (!titulo.trim()) return;
    onChange([...value, { id: uid(), tipo, titulo: titulo.trim(), url: url.trim() }]);
    setTitulo(""); setUrl("");
  };

  const del = (id: string) => onChange(value.filter((m) => m.id !== id));

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        {value.length === 0 && (
          <div style={{ fontSize: "var(--fs-ui-sm)", color: "var(--muted)" }}>
            Nenhum material ainda. Adicione vídeos, links ou textos para apresentar o curso.
          </div>
        )}
        {value.map((m) => (
          <div className="mat-row" key={m.id}>
            <span className="mat-tipo">{MAT_TIPOS.find((t) => t.v === m.tipo)?.l ?? m.tipo}</span>
            <div className="mat-main">
              <div className="mat-titulo">{m.titulo}</div>
              {m.url && <div className="mat-url">{m.url}</div>}
            </div>
            <Acao className="ce-x" onClick={() => del(m.id)} title="Remover">✕</Acao>
          </div>
        ))}
      </div>
      <div className="mat-add">
        <div style={{ flex: "0 0 110px" }}>
          <Selecao
            rotulo="Tipo do material"
            valor={tipo}
            aoMudar={(v) => setTipo(v as Material["tipo"])}
            opcoes={MAT_TIPOS.map((t) => ({ v: t.v, l: t.l }))}
          />
        </div>
        <input
          className="input"
          placeholder="Título"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <input
          className="input"
          placeholder="Link (YouTube, PDF…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Botao compacto onClick={add}>+ Material</Botao>
      </div>
    </div>
  );
}

/* ─── QuizEditor (modal) ────────────────────────────────────── */

function QuizEditor({
  aulaName, prova, minAcertos, onSave, onClose,
}: {
  aulaName: string;
  prova: QuizQ[] | null;
  minAcertos: number;
  onSave: (prova: QuizQ[], min: number) => void;
  onClose: () => void;
}) {
  const [qs, setQs] = useState<QuizQ[]>(() => prova ? JSON.parse(JSON.stringify(prova)) : []);
  const [minA, setMinA] = useState<number | "">(minAcertos || "");

  const add = () => setQs((p) => [...p, { q: "", opts: ["", "", ""], correta: 0 }]);
  const setQ = (i: number, k: keyof QuizQ, v: unknown) =>
    setQs((p) => { const a = [...p]; a[i] = { ...a[i], [k]: v }; return a; });
  const setOpt = (i: number, oi: number, v: string) =>
    setQs((p) => { const a = [...p]; const o = [...a[i].opts]; o[oi] = v; a[i] = { ...a[i], opts: o }; return a; });
  const del = (i: number) => setQs((p) => p.filter((_, x) => x !== i));

  const save = () => {
    const limpa = qs.filter((q) => q.q.trim());
    const min = minA === ""
      ? Math.max(1, Math.ceil(limpa.length * 0.7))
      : Math.min(limpa.length, Math.max(0, Number(minA)));
    onSave(limpa, min);
  };

  const displayMin = minA === "" ? Math.max(1, Math.ceil(qs.length * 0.7)) : minA;

  return (
    <Janela larga sobretitulo="Prova de evolução" titulo={aulaName || "Aula"}
      texto="Perguntas respondidas ao terminar a aula. Marque a alternativa correta."
      aoFechar={onClose} corpoBloco
      rodape={<><Botao onClick={onClose}>Cancelar</Botao><Botao variante="principal" onClick={save}>Salvar prova</Botao></>}>
          <div className="quiz-cfg">
            <div className="quiz-cfg-main">
              <div className="quiz-cfg-t">Mínimo de acertos para aprovar</div>
              <div className="quiz-cfg-s">Quantas a pessoa precisa acertar para concluir a aula.</div>
            </div>
            <div className="stepper">
              <Acao onClick={() => setMinA((n) => Math.max(0, (Number(n) || 0) - 1))}>-</Acao>
              <span>{displayMin}</span>
              <Acao onClick={() => setMinA((n) => Math.min(qs.length, (Number(n) || 0) + 1))}>+</Acao>
            </div>
            <span className="quiz-cfg-tot">de {qs.length}</span>
          </div>
          {qs.length === 0 && <Vazio titulo="Sem perguntas ainda." />}
          {qs.map((q, i) => (
            <div className="quiz-q" key={i}>
              <div className="quiz-q-head">
                <span className="quiz-q-n">{i + 1}</span>
                <input
                  className="input"
                  placeholder="Enunciado da pergunta"
                  value={q.q}
                  onChange={(e) => setQ(i, "q", e.target.value)}
                />
                <BotaoIcone className="ce-x" onClick={() => del(i)} rotulo="Remover">✕</BotaoIcone>
              </div>
              {q.opts.map((o, oi) => (
                <div className="quiz-opt" key={oi}>
                  <Opcao
                    marcada={q.correta === oi} estilo="quiz-radio"
                    onClick={() => setQ(i, "correta", oi)}
                    title="Correta"
                  >
                    {q.correta === oi ? <Icon name="ok" size={14} /> : <Icon name="circulo" size={14} />}
                  </Opcao>
                  <input
                    className="input"
                    placeholder={`Alternativa ${oi + 1}`}
                    value={o}
                    onChange={(e) => setOpt(i, oi, e.target.value)}
                  />
                </div>
              ))}
            </div>
          ))}
          <Botao compacto style={{ marginTop: 12 }} onClick={add}>
            + Pergunta
          </Botao>
    </Janela>
  );
}

/* ─── CursoEditor (editor completo) ────────────────────────── */

export default function CursoEditor({ courseId, church, allCourses, onClose }: CursoEditorProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();
  const access = useServiceAccess();

  const [c, setC] = useState<CursoLocal>(blankCurso);
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<{ mi: number; ai: number } | null>(null);
  const telaRef = useRef<FormScreenHandle>(null);
  /* retrato do curso como abriu (depois de carregar), para perguntar antes de descartar */
  const [retratoInicial, setRetratoInicial] = useState<string | null>(null);
  if (!loading && retratoInicial === null) setRetratoInicial(JSON.stringify(c));

  const isEdit = !!courseId;

  /* carregar curso existente */
  useEffect(() => {
    if (!courseId) return;
    void (async () => {
      setLoading(true);
      const [{ data: course }, { data: modules }] = await Promise.all([
        supabase.schema("service").from("courses").select("*").eq("id", courseId).single(),
        supabase.schema("service").from("course_modules").select("*").eq("course_id", courseId).order("sort_order"),
      ]);

      if (!course) { setLoading(false); return; }

      const moduleIds = (modules ?? []).map((m: Record<string, unknown>) => m.id as string);
      const { data: lessons } = moduleIds.length
        ? await supabase.schema("service").from("course_lessons").select("*").in("module_id", moduleIds).order("sort_order")
        : { data: [] };

      const row = course as Record<string, unknown>;
      const mods: ModuloState[] = (modules ?? []).map((m: Record<string, unknown>) => ({
        id: uid(),
        dbId: m.id as string,
        nome: (m.name ?? "") as string,
        aulas: (lessons ?? [])
          .filter((l: Record<string, unknown>) => l.module_id === m.id)
          .map((l: Record<string, unknown>) => ({
            id: uid(),
            dbId: l.id as string,
            nome: (l.name ?? "") as string,
            tipo: (l.kind ?? "video") as AulaState["tipo"],
            dur: (l.duration ?? "") as string,
            link: (l.link ?? "") as string,
            conteudo: (l.conteudo ?? "") as string,
            prova: Array.isArray(l.prova) ? (l.prova as QuizQ[]) : null,
            minAcertos: (l.min_acertos ?? 0) as number,
            data: (l.lesson_date ?? "") as string,
            hora: (l.lesson_time ?? "") as string,
            sala: (l.location ?? "") as string,
          })),
      }));

      setC({
        nome: (row.name ?? "") as string,
        nivel: (row.level ?? "") as string,
        tipo: (row.kind ?? "trilha") as CursoLocal["tipo"],
        modalidade: (row.modalidade ?? "remoto") as CursoLocal["modalidade"],
        cor: (row.color ?? "clay") as string,
        desc: (row.description ?? "") as string,
        divulgacao: (row.divulgacao ?? "") as string,
        publicado: (row as { published?: boolean }).published !== false,
        materiais: Array.isArray(row.materiais) ? (row.materiais as Material[]) : [],
        preReqs: requirementsFor(access.requirements, "course", courseId),
        modulos: mods.length ? mods : [{ id: uid(), nome: "Módulo 1", aulas: [] }],
      });
      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  /* helpers de campo */
  const set = <K extends keyof CursoLocal>(k: K, v: CursoLocal[K]) =>
    setC((p) => ({ ...p, [k]: v }));

  /* módulos */
  const addModulo = () =>
    setC((p) => ({
      ...p,
      modulos: [...p.modulos, { id: uid(), nome: `Módulo ${p.modulos.length + 1}`, aulas: [] }],
    }));
  const setModulo = (mi: number, k: keyof ModuloState, v: unknown) =>
    setC((p) => { const m = [...p.modulos]; m[mi] = { ...m[mi], [k]: v }; return { ...p, modulos: m }; });
  const delModulo = (mi: number) =>
    setC((p) => ({ ...p, modulos: p.modulos.filter((_, i) => i !== mi) }));

  /* aulas */
  const addAula = (mi: number) =>
    setC((p) => {
      const m = [...p.modulos];
      m[mi] = {
        ...m[mi],
        aulas: [...m[mi].aulas, {
          id: uid(), nome: "", tipo: "video", dur: "", link: "", conteudo: "", prova: null, minAcertos: 0, data: "", hora: "", sala: "",
        }],
      };
      return { ...p, modulos: m };
    });
  const setAula = <K extends keyof AulaState>(mi: number, ai: number, k: K, v: AulaState[K]) =>
    setC((p) => {
      const m = [...p.modulos];
      const a = [...m[mi].aulas];
      a[ai] = { ...a[ai], [k]: v };
      m[mi] = { ...m[mi], aulas: a };
      return { ...p, modulos: m };
    });
  const delAula = (mi: number, ai: number) =>
    setC((p) => {
      const m = [...p.modulos];
      m[mi] = { ...m[mi], aulas: m[mi].aulas.filter((_, i) => i !== ai) };
      return { ...p, modulos: m };
    });

  const totalAulas = c.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const outros = allCourses.filter((x) => x.id !== courseId);

  /* salvar */
  const salvar = async () => {
    if (!c.nome.trim()) { setError("Dê um nome ao curso."); return; }
    setSaving(true);
    setError("");
    /* separado do resto: antes da migração 0049 a coluna não existe e o
       curso continua sendo salvo (sempre publicado) */
    const gravarPublicado = async (id: string) => {
      await supabase.schema("service").from("courses").update({ published: c.publicado }).eq("id", id);
    };
    try {
      let savedCourseId = courseId;

      if (isEdit && courseId) {
        const { error: upErr } = await supabase.schema("service").from("courses").update({
          name: c.nome.trim(),
          kind: c.tipo,
          level: c.nivel.trim() || null,
          color: c.cor,
          description: c.desc.trim() || null,
          divulgacao: c.divulgacao || null,
          materiais: c.materiais,
          modalidade: c.modalidade,
        }).eq("id", courseId);
        if (upErr) throw upErr;
        await gravarPublicado(courseId);

        /* apagar módulos e aulas antigos para reinserir */
        await supabase.schema("service").from("course_modules").delete().eq("course_id", courseId);
      } else {
        const { data: newCourse, error: insErr } = await supabase.schema("service").from("courses").insert({
          organization_id: church.organizationId,
          church_id: church.id,
          name: c.nome.trim(),
          kind: c.tipo,
          level: c.nivel.trim() || null,
          color: c.cor,
          description: c.desc.trim() || null,
          category: c.nivel.trim() || "discipulado",
          divulgacao: c.divulgacao || null,
          materiais: c.materiais,
          modalidade: c.modalidade,
        }).select("id").single();
        if (insErr) throw insErr;
        savedCourseId = newCourse.id as string;
        await gravarPublicado(savedCourseId);
      }

      /* pré-requisitos vivem em service.requirements (migração 0043) */
      if (savedCourseId) {
        const { error: reqErr } = await saveRequirements(church.organizationId, "course", savedCourseId, c.preReqs);
        if (reqErr) throw new Error(reqErr);
      }

      /* inserir módulos e aulas */
      for (let mi = 0; mi < c.modulos.length; mi++) {
        const mod = c.modulos[mi];
        const { data: modRow, error: modErr } = await supabase.schema("service").from("course_modules").insert({
          organization_id: church.organizationId,
          course_id: savedCourseId,
          name: mod.nome.trim() || `Módulo ${mi + 1}`,
          sort_order: mi + 1,
        }).select("id").single();
        if (modErr) throw modErr;

        for (let ai = 0; ai < mod.aulas.length; ai++) {
          const aula = mod.aulas[ai];
          const { error: aulaErr } = await supabase.schema("service").from("course_lessons").insert({
            organization_id: church.organizationId,
            module_id: modRow.id,
            name: aula.nome.trim() || `Aula ${ai + 1}`,
            duration: aula.dur.trim() || null,
            kind: aula.tipo,
            sort_order: ai + 1,
            link: aula.link.trim() || null,
            conteudo: aula.conteudo || null,
            prova: aula.prova,
            min_acertos: aula.minAcertos,
            /* dia e sala só valem para aula com presença por QR */
            ...(aula.tipo === "presencial" || aula.tipo === "ao_vivo"
              ? { lesson_date: aula.data || null, lesson_time: aula.hora.trim() || null, location: aula.sala.trim() || null }
              : {}),
          });
          if (aulaErr) throw aulaErr;
        }
      }

      if (telaRef.current) await telaRef.current.fechar(); else onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={isEdit ? "Editar curso" : "Novo curso"}
      title={c.nome.trim() || (isEdit ? "Editar curso" : "Novo curso")}
      saveLabel={isEdit ? "Salvar curso" : "Criar curso"}
      saving={saving}
      missing={loading || c.nome.trim() ? [] : ["nome do curso"]}
      dirty={retratoInicial !== null && JSON.stringify(c) !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      {loading ? <Carregando forma="linhas" rotulo="Carregando curso" /> : (<>
          <FormSection title="Curso">
            <Campo rotulo="Nome do curso" obrigatorio id="ce-nome">
              <Entrada aria-required="true" placeholder="ex: Fundamentos da fé" value={c.nome} onChange={(e) => set("nome", e.target.value)} />
            </Campo>
          </FormSection>

          {/* identificação */}
          <FormSection title="Onde fica e como é">
            <div className="ce-grid">
              <Campo rotulo="Nível">
                <Entrada value={c.nivel} placeholder="Entrada, Discipulado…" onChange={(e) => set("nivel", e.target.value)} />
              </Campo>
              <Campo rotulo="Cor de destaque" grupo>
                <div className="seg-check">
                  {CORES.map((o) => (
                    <Opcao key={o.v} marcada={c.cor === o.v} estilo="seg-chip" onClick={() => set("cor", o.v)}>{o.l}</Opcao>
                  ))}
                </div>
              </Campo>
            </div>
            <Campo rotulo="Formato" grupo>
              <div className="seg-check">
                {([{ v: "trilha", l: "Trilha (módulos)" }, { v: "conteudo", l: "Conteúdo no app" }, { v: "presencial", l: "Presencial" }] as const).map((o) => (
                  <Opcao key={o.v} marcada={c.tipo === o.v} estilo="seg-chip" onClick={() => set("tipo", o.v)}>{o.l}</Opcao>
                ))}
              </div>
            </Campo>
            <Campo rotulo="Modalidade" grupo>
              <div className="seg-check">
                {MODALIDADES.map((o) => (
                  <Opcao key={o.v} marcada={c.modalidade === o.v} estilo="seg-chip" onClick={() => set("modalidade", o.v)}>{o.l}</Opcao>
                ))}
              </div>
            </Campo>
            <Campo rotulo="Descrição">
              <TextoLongo value={c.desc} placeholder="Para quem é e o que vão aprender" onChange={(e) => set("desc", e.target.value)} />
            </Campo>
          </FormSection>

          <FormSection title="No app">
            <Linha estilo="config" style={{ borderBottom: "none", padding: 0 }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Aparece no app do membro</div>
                <div className="cfg-row-s">{c.publicado ? "Publicado: os membros veem e podem se inscrever" : "Rascunho: só a liderança vê"}</div>
              </div>
              <Interruptor ligado={c.publicado} rotulo="Aparece no app do membro" onClick={() => set("publicado", !c.publicado)} />
            </Linha>
          </FormSection>

          {/* divulgação */}
          <FormSection title="Divulgação · antes de inscrever">
            <div className="cfg-card-s" style={{ marginBottom: 12 }}>
              Texto e materiais que aparecem para quem ainda não se inscreveu.
            </div>
            <div className="field">
              <label className="field-label">Texto de apresentação</label>
              <RichText
                value={c.divulgacao}
                onChange={(v) => set("divulgacao", v)}
                placeholder="O que é, para quem é, por que fazer…"
                minH={120}
              />
            </div>
            <div className="field">
              <label className="field-label">Materiais de divulgação</label>
              <MateriaisEditor value={c.materiais} onChange={(v) => set("materiais", v)} />
            </div>
          </FormSection>

          {/* pré-requisitos */}
          <FormSection title="Pré-requisitos para se inscrever">
            <RequisitosEditor value={c.preReqs} onChange={(v) => set("preReqs", v)} courses={outros} events={access.events} groupsLabel={access.groupsLabel} />
          </FormSection>

          {/* conteúdo */}
          <FormSection title={`Conteúdo · ${plural(c.modulos.length, "módulo")} · ${plural(totalAulas, "aula")}`}>
            {c.modulos.map((mod, mi) => (
              <div className="ce-mod" key={mod.id}>
                <div className="ce-mod-head">
                  <span className="ce-mod-n">{String(mi + 1).padStart(2, "0")}</span>
                  <input
                    className="ce-mod-name"
                    value={mod.nome}
                    onChange={(e) => setModulo(mi, "nome", e.target.value)}
                  />
                  <Acao className="ce-x" onClick={() => delModulo(mi)} title="Remover módulo">✕</Acao>
                </div>
                {mod.aulas.map((aula, ai) => (
                  <div className="ce-aula" key={aula.id}>
                    <div className="ce-aula-row">
                      <input
                        className="input ce-aula-name"
                        placeholder="Título da aula"
                        value={aula.nome}
                        onChange={(e) => setAula(mi, ai, "nome", e.target.value)}
                      />
                      <Selecao
                        className="ce-aula-tipo"
                        rotulo="Tipo da aula"
                        valor={aula.tipo}
                        aoMudar={(v) => setAula(mi, ai, "tipo", v as AulaState["tipo"])}
                        opcoes={AULA_TIPOS.map((t) => ({ v: t.v, l: t.l }))}
                      />
                      <Acao className="ce-x" onClick={() => delAula(mi, ai)}>✕</Acao>
                    </div>
                    <div className="ce-aula-row">
                      {(aula.tipo === "video" || aula.tipo === "ao_vivo") && (
                        <input
                          className="input"
                          placeholder="Link do vídeo (YouTube, Vimeo…)"
                          value={aula.link}
                          onChange={(e) => setAula(mi, ai, "link", e.target.value)}
                        />
                      )}
                      <input
                        className="input ce-aula-dur"
                        placeholder="Duração (ex: 8 min)"
                        value={aula.dur}
                        onChange={(e) => setAula(mi, ai, "dur", e.target.value)}
                      />
                    </div>
                    {(aula.tipo === "presencial" || aula.tipo === "ao_vivo") && (
                      <div className="ce-aula-row">
                        <SeletorData rotulo="Dia da aula" valor={aula.data} aoMudar={(v) => setAula(mi, ai, "data", v)} />
                        <SeletorHora className="ce-aula-dur" rotulo="Hora da aula" valor={aula.hora} aoMudar={(v) => setAula(mi, ai, "hora", v)} />
                        <input className="input" placeholder={aula.tipo === "ao_vivo" ? "Onde (ex: link no grupo)" : "Sala (ex: Sala 2)"} value={aula.sala} onChange={(e) => setAula(mi, ai, "sala", e.target.value)} />
                      </div>
                    )}
                    {aula.tipo === "texto" && (
                      <div className="ce-aula-conteudo">
                        <div className="ce-aula-conteudo-lbl">Conteúdo da aula (o aluno lê no app)</div>
                        <RichText
                          value={aula.conteudo}
                          onChange={(v) => setAula(mi, ai, "conteudo", v)}
                          placeholder="Escreva a aula: texto, tópicos, versículos…"
                          minH={140}
                        />
                      </div>
                    )}
                    {(aula.tipo === "video" || aula.tipo === "ao_vivo" || aula.tipo === "presencial") && (
                      <div className="ce-aula-conteudo">
                        <div className="ce-aula-conteudo-lbl">Material de apoio (opcional)</div>
                        <RichText
                          value={aula.conteudo}
                          onChange={(v) => setAula(mi, ai, "conteudo", v)}
                          placeholder="Resumo, referências, o que estudar antes…"
                          minH={80}
                        />
                      </div>
                    )}
                    <Opcao
                      marcada={!!aula.prova?.length} estilo="ce-prova"
                      onClick={() => setQuiz({ mi, ai })}
                    >
                      {aula.prova?.length
                        ? `Prova · ${plural(aula.prova.length, "pergunta")}${aula.minAcertos ? ` · min. ${aula.minAcertos}` : ""}`
                        : "+ Adicionar prova ao fim da aula"}
                    </Opcao>
                  </div>
                ))}
                <Botao compacto onClick={() => addAula(mi)}>+ aula neste módulo</Botao>
              </div>
            ))}
            <Botao compacto style={{ marginTop: 12 }} onClick={addModulo}>
              Novo módulo
            </Botao>
          </FormSection>
      </>)}

      {quiz && (
        <QuizEditor
          aulaName={c.modulos[quiz.mi]?.aulas[quiz.ai]?.nome ?? ""}
          prova={c.modulos[quiz.mi]?.aulas[quiz.ai]?.prova ?? null}
          minAcertos={c.modulos[quiz.mi]?.aulas[quiz.ai]?.minAcertos ?? 0}
          onSave={(prova, min) => {
            setAula(quiz.mi, quiz.ai, "prova", prova);
            setAula(quiz.mi, quiz.ai, "minAcertos", min);
            setQuiz(null);
          }}
          onClose={() => setQuiz(null)}
        />
      )}
    </FormScreen>
  );
}
