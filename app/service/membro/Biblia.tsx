"use client";

import { useEffect, useMemo, useState } from "react";
import { Icon } from "../lib/icons";
import type { BibleBook, BibleFlatVerse, BibleMark } from "./tipos";

import { Botao, BotaoIcone } from "../ui/Botao";
import { Acao } from "../ui/Acao";
import { Opcao } from "../ui/Opcao";
export let bibleCache: BibleBook[] | null = null;
export let bibleCachePromise: Promise<BibleBook[]> | null = null;
export function loadBible(): Promise<BibleBook[]> {
  if (bibleCache) return Promise.resolve(bibleCache);
  if (!bibleCachePromise) {
    bibleCachePromise = fetch("/bible/acf.json")
      .then((r) => r.json())
      .then((data: BibleBook[]) => { bibleCache = data; return data; });
  }
  return bibleCachePromise;
}
export function normalizeBusca(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export const BIBLE_CORES: { key: string; label: string }[] = [
  { key: "sand", label: "Areia" },
  { key: "wheat", label: "Trigo" },
  { key: "amber", label: "Ambar" },
  { key: "clay", label: "Barro" },
  { key: "terra", label: "Terracota" },
  { key: "rust", label: "Ferrugem" },
  { key: "cocoa", label: "Cacau" },
  { key: "olive", label: "Oliva" },
];

export function TabBiblia({
  bibleMarks, onSaveBibleMark,
}: {
  bibleMarks: BibleMark[];
  onSaveBibleMark?: (book: string, chapter: number, verse: number, data: { color: string | null; note: string | null }) => void;
}) {
  const [bible, setBible] = useState<BibleBook[] | null>(bibleCache);
  const [view, setView] = useState<"livros" | "capitulos" | "leitor" | "marcacoes">("livros");
  const [bookAbbrev, setBookAbbrev] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [actionVerse, setActionVerse] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    loadBible().then((data) => { if (alive) setBible(data); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query.trim()), 220);
    return () => clearTimeout(t);
  }, [query]);

  const flatIndex = useMemo<BibleFlatVerse[]>(() => {
    if (!bible) return [];
    const out: BibleFlatVerse[] = [];
    bible.forEach((b) => {
      b.chapters.forEach((verses, ci) => {
        verses.forEach((text, vi) => {
          out.push({ abbrev: b.abbrev, name: b.name, chapter: ci + 1, verse: vi + 1, text, norm: normalizeBusca(text) });
        });
      });
    });
    return out;
  }, [bible]);

  const searchResults = useMemo(() => {
    if (debouncedQuery.length < 3) return [];
    const q = normalizeBusca(debouncedQuery);
    const out: BibleFlatVerse[] = [];
    for (const v of flatIndex) {
      if (v.norm.includes(q)) {
        out.push(v);
        if (out.length >= 80) break;
      }
    }
    return out;
  }, [flatIndex, debouncedQuery]);

  const marksByRef = useMemo(() => {
    const map = new Map<string, BibleMark>();
    bibleMarks.forEach((m) => map.set(`${m.book}:${m.chapter}:${m.verse}`, m));
    return map;
  }, [bibleMarks]);

  const book = bible?.find((b) => b.abbrev === bookAbbrev) ?? null;
  const versesAtuais = book && chapter ? book.chapters[chapter - 1] : null;

  const irPara = (abbrev: string, c: number) => {
    setBookAbbrev(abbrev);
    setChapter(c);
    setView("leitor");
    setQuery("");
  };
  const abrirAcaoVerso = (v: number) => {
    const mark = bookAbbrev && chapter ? marksByRef.get(`${bookAbbrev}:${chapter}:${v}`) : undefined;
    setNoteDraft(mark?.note ?? "");
    setCopied(false);
    setActionVerse(v);
  };
  const copiarVerso = () => {
    if (actionVerse == null || !book || !chapter || !versesAtuais) return;
    const texto = `"${versesAtuais[actionVerse - 1]}"\n${book.name} ${chapter}:${actionVerse} · ACF`;
    navigator.clipboard?.writeText(texto).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    }).catch(() => { /* clipboard indisponivel : nao quebra nada, so nao copia */ });
  };
  const escolherCor = (color: string | null) => {
    if (actionVerse == null || !bookAbbrev || !chapter) return;
    const mark = marksByRef.get(`${bookAbbrev}:${chapter}:${actionVerse}`);
    onSaveBibleMark?.(bookAbbrev, chapter, actionVerse, { color, note: mark?.note ?? null });
  };
  const salvarNota = () => {
    if (actionVerse == null || !bookAbbrev || !chapter) return;
    const mark = marksByRef.get(`${bookAbbrev}:${chapter}:${actionVerse}`);
    onSaveBibleMark?.(bookAbbrev, chapter, actionVerse, { color: mark?.color ?? null, note: noteDraft.trim() || null });
    setActionVerse(null);
  };
  const removerMarcacao = () => {
    if (actionVerse == null || !bookAbbrev || !chapter) return;
    onSaveBibleMark?.(bookAbbrev, chapter, actionVerse, { color: null, note: null });
    setActionVerse(null);
  };

  const marcaAtual = actionVerse != null && bookAbbrev && chapter ? marksByRef.get(`${bookAbbrev}:${chapter}:${actionVerse}`) : undefined;

  if (!bible) {
    return (
      <>
        <div className="empty" style={{ marginTop: 12 }}>
          <div className="empty-mark"><Icon name="biblia" size={22} /></div>
          <h3 className="empty-title">Baixando a Bíblia...</h3>
          <p className="empty-desc">So acontece uma vez. Depois fica salva no seu celular.</p>
        </div>
      </>
    );
  }

  return (
    <>
      {view === "livros" && (
        <>
          <div className="bib-search">
            <input className="input" placeholder="Buscar palavra ou trecho..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {debouncedQuery.length >= 3 ? (
            <>
              <div className="m-section-t">{searchResults.length} {searchResults.length === 1 ? "resultado" : "resultados"}</div>
              {searchResults.map((r) => (
                <Acao key={`${r.abbrev}${r.chapter}:${r.verse}`} className="bib-result" onClick={() => irPara(r.abbrev, r.chapter)}>
                  <b>{r.name} {r.chapter}:{r.verse}</b>
                  <small>{r.text}</small>
                </Acao>
              ))}
              {searchResults.length === 0 && <div className="empty"><p className="empty-desc">Nada encontrado com esse termo.</p></div>}
            </>
          ) : (
            <>
              <Acao className="bib-marks-cta" onClick={() => setView("marcacoes")}>
                <span className="bib-marks-cta-ic"><Icon name="estrela" size={16} /></span>
                <div><b>Minhas marcações</b><small>{bibleMarks.length} {bibleMarks.length === 1 ? "versículo marcado ou anotado" : "versículos marcados ou anotados"}</small></div>
                <span className="m-alert-go">→</span>
              </Acao>
              <div className="m-section-t">Antigo Testamento</div>
              <div className="bib-books">
                {bible.slice(0, 39).map((b) => (
                  <Acao key={b.abbrev} className="bib-book" onClick={() => { setBookAbbrev(b.abbrev); setView("capitulos"); }}>{b.name}</Acao>
                ))}
              </div>
              <div className="m-section-t">Novo Testamento</div>
              <div className="bib-books">
                {bible.slice(39).map((b) => (
                  <Acao key={b.abbrev} className="bib-book" onClick={() => { setBookAbbrev(b.abbrev); setView("capitulos"); }}>{b.name}</Acao>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {view === "capitulos" && book && (
        <>
          <Botao tamanho="toque" variante="texto" onClick={() => setView("livros")}>← Livros</Botao>
          <div className="m-h1" style={{ fontSize: "var(--fs-app-20)", marginBottom: 14 }}>{book.name}</div>
          <div className="bib-chapters">
            {book.chapters.map((_, i) => (
              <Acao key={i} className="bib-chapter" onClick={() => irPara(book.abbrev, i + 1)}>{i + 1}</Acao>
            ))}
          </div>
        </>
      )}

      {view === "leitor" && book && chapter && versesAtuais && (
        <>
          <Botao tamanho="toque" variante="texto" onClick={() => setView("capitulos")}>← Capitulos</Botao>
          <div className="bib-reader-head">
            <Acao className="bib-chnav" desativado={chapter <= 1} onClick={() => irPara(book.abbrev, chapter - 1)}>‹</Acao>
            <div className="m-h1" style={{ fontSize: "var(--fs-app-17)" }}>{book.name} {chapter}</div>
            <Acao className="bib-chnav" desativado={chapter >= book.chapters.length} onClick={() => irPara(book.abbrev, chapter + 1)}>›</Acao>
          </div>
          <div className="bib-verses">
            {versesAtuais.map((text, i) => {
              const v = i + 1;
              const mark = marksByRef.get(`${book.abbrev}:${chapter}:${v}`);
              return (
                <Acao
                  key={v}
                  className={`bib-verse${mark?.color ? ` tone-${mark.color}` : ""}${mark ? " marked" : ""}`}
                  onClick={() => abrirAcaoVerso(v)}
                >
                  <span className="bib-verse-n">{v}</span>
                  <span className="bib-verse-t">{text}</span>
                  {mark?.note ? <span className="bib-verse-note-ic"><Icon name="documento" size={11} /></span> : null}
                </Acao>
              );
            })}
          </div>
        </>
      )}

      {view === "marcacoes" && (
        <>
          <Botao tamanho="toque" variante="texto" onClick={() => setView("livros")}>← Livros</Botao>
          <div className="m-h1" style={{ fontSize: "var(--fs-app-20)", marginBottom: 14 }}>Minhas marcações</div>
          {bibleMarks.length === 0 && <div className="empty"><p className="empty-desc">Toque num versículo na leitura pra marcar ou anotar.</p></div>}
          {bibleMarks
            .slice()
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
            .map((m) => {
              const nome = bible.find((b) => b.abbrev === m.book)?.name ?? m.book;
              return (
                <Acao key={m.id} className={`bib-result${m.color ? ` tone-${m.color}` : ""}`} onClick={() => irPara(m.book, m.chapter)}>
                  <b>{nome} {m.chapter}:{m.verse}</b>
                  {m.note ? <small>{m.note}</small> : null}
                </Acao>
              );
            })}
        </>
      )}

      {actionVerse != null && book && chapter && (
        <div className="m-sheet-bg" onClick={() => setActionVerse(null)}>
          <div className="ob-card" onClick={(e) => e.stopPropagation()}>
            <div className="bib-action-ref">{book.name} {chapter}:{actionVerse}</div>
            <p className="bib-action-text">{versesAtuais?.[actionVerse - 1]}</p>
            <Botao compacto className="bib-copy" onClick={copiarVerso} style={{ marginTop: 10 }}>
              <Icon name="copiar" size={13} /> {copied ? "Copiado!" : "Copiar versículo"}
            </Botao>
            <div className="bib-swatches">
              {BIBLE_CORES.map((c) => (
                <Opcao
                  key={c.key}
                  title={c.label}
                  marcada={marcaAtual?.color === c.key} estilo="bib-swatch" className={`tone-${c.key}`}
                  onClick={() => escolherCor(c.key)}
                />
              ))}
              {marcaAtual?.color && (
                <BotaoIcone className="bib-swatch-clear" title="Remover cor" rotulo="Remover cor" onClick={() => escolherCor(null)}>✕</BotaoIcone>
              )}
            </div>
            <div className="field" style={{ marginTop: 14 }}>
              <label className="field-label">Anotacao</label>
              <textarea className="input" rows={3} placeholder="O que esse versículo significa pra você?" value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              {(marcaAtual?.color || marcaAtual?.note) && (
                <Botao compacto onClick={removerMarcacao}>Remover marcação</Botao>
              )}
              <div style={{ flex: 1 }} />
              <Botao compacto onClick={() => setActionVerse(null)}>Fechar</Botao>
              <Botao variante="principal" compacto onClick={salvarNota}>Salvar</Botao>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
