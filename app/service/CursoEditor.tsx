"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "./lib/supabase-browser";

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
  materiais: Material[];
  preReqs: string[];
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
    cor: "clay", desc: "", divulgacao: "", materiais: [], preReqs: [],
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
    if (ref.current && ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
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
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("bold")}><b>B</b></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("italic")}><i>I</i></button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("formatBlock", "<h3>")}>Título</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertUnorderedList")}>· Lista</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => cmd("insertOrderedList")}>1. Lista</button>
        <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addLink}>→ Link</button>
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
          <div style={{ fontSize: 12, color: "var(--subtle)" }}>
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
            <button className="ce-x" type="button" onClick={() => del(m.id)} title="Remover">✕</button>
          </div>
        ))}
      </div>
      <div className="mat-add">
        <select
          className="select"
          style={{ flex: "0 0 110px" }}
          value={tipo}
          onChange={(e) => setTipo(e.target.value as Material["tipo"])}
        >
          {MAT_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
        </select>
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
        <button className="btn btn-sec btn-sm" type="button" onClick={add}>+ Material</button>
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
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Prova de evolução</div>
          <div className="modal-title">{aulaName || "Aula"}</div>
          <div className="modal-sub">Perguntas respondidas ao terminar a aula. Marque a alternativa correta.</div>
        </div>
        <div className="modal-body" style={{ display: "block", maxHeight: "54vh" }}>
          <div className="quiz-cfg">
            <div className="quiz-cfg-main">
              <div className="quiz-cfg-t">Mínimo de acertos para aprovar</div>
              <div className="quiz-cfg-s">Quantas a pessoa precisa acertar para concluir a aula.</div>
            </div>
            <div className="stepper">
              <button type="button" onClick={() => setMinA((n) => Math.max(0, (Number(n) || 0) - 1))}>-</button>
              <span>{displayMin}</span>
              <button type="button" onClick={() => setMinA((n) => Math.min(qs.length, (Number(n) || 0) + 1))}>+</button>
            </div>
            <span className="quiz-cfg-tot">de {qs.length}</span>
          </div>
          {qs.length === 0 && <div className="empty" style={{ padding: "24px 0" }}>Sem perguntas ainda.</div>}
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
                <button className="ce-x" type="button" onClick={() => del(i)}>✕</button>
              </div>
              {q.opts.map((o, oi) => (
                <div className="quiz-opt" key={oi}>
                  <button
                    className={`quiz-radio${q.correta === oi ? " on" : ""}`}
                    type="button"
                    onClick={() => setQ(i, "correta", oi)}
                    title="Correta"
                  >
                    {q.correta === oi ? "●" : "○"}
                  </button>
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
          <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 12 }} onClick={add}>
            + Pergunta
          </button>
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" type="button" onClick={save}>Salvar prova</button>
        </div>
      </div>
    </div>
  );
}

/* ─── CursoEditor (editor completo) ────────────────────────── */

export default function CursoEditor({ courseId, church, allCourses, onClose }: CursoEditorProps) {
  const router = useRouter();
  const supabase = createServiceBrowserClient();

  const [c, setC] = useState<CursoLocal>(blankCurso);
  const [loading, setLoading] = useState(!!courseId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [quiz, setQuiz] = useState<{ mi: number; ai: number } | null>(null);

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
        materiais: Array.isArray(row.materiais) ? (row.materiais as Material[]) : [],
        preReqs: Array.isArray(row.prereqs) ? (row.prereqs as string[]) : [],
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
          id: uid(), nome: "", tipo: "video", dur: "", link: "", conteudo: "", prova: null, minAcertos: 0,
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

  const togReq = (id: string) =>
    set("preReqs", c.preReqs.includes(id)
      ? c.preReqs.filter((x) => x !== id)
      : [...c.preReqs, id]);

  const totalAulas = c.modulos.reduce((n, m) => n + m.aulas.length, 0);
  const outros = allCourses.filter((x) => x.id !== courseId);

  /* salvar */
  const salvar = async () => {
    if (!c.nome.trim()) { setError("Dê um nome ao curso."); return; }
    setSaving(true);
    setError("");
    try {
      let savedCourseId = courseId;

      if (isEdit && courseId) {
        const { error: upErr } = await supabase.schema("service").from("courses").update({
          name: c.nome.trim(),
          kind: c.tipo,
          level: c.nivel.trim() || null,
          color: c.cor,
          description: c.desc.trim() || null,
          prereqs: c.preReqs,
          divulgacao: c.divulgacao || null,
          materiais: c.materiais,
          modalidade: c.modalidade,
        }).eq("id", courseId);
        if (upErr) throw upErr;

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
          prereqs: c.preReqs,
          divulgacao: c.divulgacao || null,
          materiais: c.materiais,
          modalidade: c.modalidade,
        }).select("id").single();
        if (insErr) throw insErr;
        savedCourseId = newCourse.id as string;
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
          });
          if (aulaErr) throw aulaErr;
        }
      }

      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="ce-page">
        <div className="ce-page-bar">
          <button className="ce-page-back" type="button" onClick={onClose}>← Cursos</button>
          <div className="ce-page-bar-title">Carregando…</div>
        </div>
        <div style={{ padding: 40, color: "var(--muted)", textAlign: "center" }}>Carregando curso…</div>
      </div>
    );
  }

  return (
    <div className="ce-page">
      {/* barra fixa */}
      <div className="ce-page-bar">
        <button className="ce-page-back" type="button" onClick={onClose}>
          <span aria-hidden="true">←</span> Cursos
        </button>
        <div className="ce-page-bar-title">
          {isEdit ? "Editar curso" : "Novo curso"}{c.nome ? ` · ${c.nome}` : ""}
        </div>
        <div className="ce-page-bar-actions">
          <button className="btn btn-sec" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-pri" type="button" onClick={salvar} disabled={saving}>
            {saving ? "Salvando…" : isEdit ? "Salvar curso" : "Criar curso"}
          </button>
        </div>
      </div>

      <div className="ce-page-scroll">
        <div className="ce-page-inner">
          {error && <div className="field-error" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{isEdit ? "Editar curso" : "Novo curso"}</div>
          <input
            className="ce-title-input"
            placeholder="Nome do curso"
            value={c.nome}
            onChange={(e) => set("nome", e.target.value)}
          />

          {/* identificação */}
          <div className="dsec" style={{ marginTop: 0 }}>
            <div className="dsec-title">Onde fica e como é</div>
            <div className="ce-grid">
              <div className="field">
                <label className="field-label">Nível</label>
                <input className="input" value={c.nivel} placeholder="Entrada, Discipulado…" onChange={(e) => set("nivel", e.target.value)} />
              </div>
              <div className="field">
                <label className="field-label">Cor de destaque</label>
                <div className="seg-check">
                  {CORES.map((o) => (
                    <button key={o.v} className={`seg-chip${c.cor === o.v ? " on" : ""}`} type="button" onClick={() => set("cor", o.v)}>{o.l}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="field">
              <label className="field-label">Formato</label>
              <div className="seg-check">
                {([{ v: "trilha", l: "Trilha (módulos)" }, { v: "conteudo", l: "Conteúdo no app" }, { v: "presencial", l: "Presencial" }] as const).map((o) => (
                  <button key={o.v} className={`seg-chip${c.tipo === o.v ? " on" : ""}`} type="button" onClick={() => set("tipo", o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Modalidade</label>
              <div className="seg-check">
                {MODALIDADES.map((o) => (
                  <button key={o.v} className={`seg-chip${c.modalidade === o.v ? " on" : ""}`} type="button" onClick={() => set("modalidade", o.v)}>{o.l}</button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="field-label">Descrição</label>
              <textarea className="textarea" value={c.desc} placeholder="Para quem é e o que vão aprender" onChange={(e) => set("desc", e.target.value)} />
            </div>
          </div>

          {/* divulgação */}
          <div className="dsec">
            <div className="dsec-title">Divulgação · antes de inscrever</div>
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
          </div>

          {/* pré-requisitos */}
          {outros.length > 0 && (
            <div className="dsec">
              <div className="dsec-title">Pré-requisitos para se inscrever</div>
              <div className="seg-check">
                {outros.map((o) => (
                  <button
                    key={o.id}
                    className={`seg-chip${c.preReqs.includes(o.id) ? " on" : ""}`}
                    type="button"
                    onClick={() => togReq(o.id)}
                  >
                    {o.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* conteúdo */}
          <div className="dsec">
            <div className="dsec-title">Conteúdo · {c.modulos.length} módulo(s) · {totalAulas} aula(s)</div>
            {c.modulos.map((mod, mi) => (
              <div className="ce-mod" key={mod.id}>
                <div className="ce-mod-head">
                  <span className="ce-mod-n">{String(mi + 1).padStart(2, "0")}</span>
                  <input
                    className="ce-mod-name"
                    value={mod.nome}
                    onChange={(e) => setModulo(mi, "nome", e.target.value)}
                  />
                  <button className="ce-x" type="button" onClick={() => delModulo(mi)} title="Remover módulo">✕</button>
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
                      <select
                        className="select ce-aula-tipo"
                        value={aula.tipo}
                        onChange={(e) => setAula(mi, ai, "tipo", e.target.value as AulaState["tipo"])}
                      >
                        {AULA_TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
                      </select>
                      <button className="ce-x" type="button" onClick={() => delAula(mi, ai)}>✕</button>
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
                    <button
                      className={`ce-prova${aula.prova?.length ? " on" : ""}`}
                      type="button"
                      onClick={() => setQuiz({ mi, ai })}
                    >
                      {aula.prova?.length
                        ? `◆ Prova · ${aula.prova.length} pergunta(s)${aula.minAcertos ? ` · min. ${aula.minAcertos}` : ""}`
                        : "+ Adicionar prova ao fim da aula"}
                    </button>
                  </div>
                ))}
                <button className="cb-add" type="button" onClick={() => addAula(mi)}>+ aula neste módulo</button>
              </div>
            ))}
            <button className="btn btn-sec btn-sm" type="button" style={{ marginTop: 12 }} onClick={addModulo}>
              + Novo módulo
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 28 }}>
            <button className="btn btn-pri" type="button" style={{ flex: 1, justifyContent: "center" }} onClick={salvar} disabled={saving}>
              {saving ? "Salvando…" : isEdit ? "Salvar curso" : "Criar curso"}
            </button>
            <button className="btn btn-sec" type="button" onClick={onClose}>Cancelar</button>
          </div>
        </div>
      </div>

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
    </div>
  );
}
