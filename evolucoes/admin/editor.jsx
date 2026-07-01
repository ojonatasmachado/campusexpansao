/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · EDITOR DE ITEM (v2 · content-first)
   O mentor monta o material adicionando CONTEÚDO (texto, PDF, slides,
   imagem). O sistema DERIVA sozinho: nº de mensagens, nº de páginas,
   formatos, código e até título/descrição. Quase nada é digitado à mão.
   Prévia ao vivo do card à direita. A cor vem da estante (não exposta).
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateE } = React;

/* ───────── ÍCONES ───────── */
const IcoWord = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M9 12h6M9 16h6M9 8h2"/></svg>);
const IcoPdf = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4"/><path d="M8.5 14l2.5 2.5 4.5-5"/></svg>);
const IcoPpt = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M12 17v3M8 21h8"/></svg>);
const IcoImg = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.7"/><path d="M21 15l-5-5L5 21"/></svg>);
const ICON = { word: IcoWord, pdf: IcoPdf, ppt: IcoPpt, image: IcoImg };

/* ───────── ANÁLISE AUTOMÁTICA DO TEXTO ─────────
   Detecta nº de mensagens (cabeçalhos), nº de páginas (volume de texto)
   e sugere título + descrição a partir das primeiras linhas. */
function analyzeText(raw) {
  const text = (raw || '').replace(/\r/g, '');
  const compact = text.replace(/\s+/g, ' ').trim();
  const chars = compact.length;
  const pages = chars ? Math.max(1, Math.round(chars / 1900)) : 0;

  const lines = text.split('\n').map((l) => l.trim());
  const headings = [];
  const reMd = /^#{1,3}\s+(.+)$/;
  const reKw = /^(mensagem|aula|li[çc][ãa]o|encontro|cap[íi]tulo|tema|parte|estudo)\s*\d*\s*[:.\-)]?\s*(.*)$/i;
  const reNum = /^\d{1,2}\s*[).\-]\s+(.{3,})$/;
  lines.forEach((l) => {
    let m;
    if (!l) return;
    if ((m = l.match(reMd))) headings.push(m[1].trim());
    else if ((m = l.match(reKw))) headings.push((m[2] || l).trim());
    else if ((m = l.match(reNum))) headings.push(m[1].trim());
  });

  const firstLine = lines.find((l) => l.length > 0) || '';
  const title = firstLine.replace(/^#{1,3}\s+/, '').replace(/^\d{1,2}\s*[).\-]\s+/, '').slice(0, 60);
  const para = lines.find((l) => l.length > 40 && l !== firstLine) || '';
  const desc = para.slice(0, 130);

  return { chars, pages, messages: headings.length || null, headings, title, desc };
}

/* Conta páginas de um PDF lendo os bytes (best-effort, sem dependência). */
async function countPdfPages(file) {
  try {
    const buf = await file.arrayBuffer();
    const txt = new TextDecoder('latin1').decode(new Uint8Array(buf));
    let max = 0, m;
    const re = /\/Count\s+(\d+)/g;
    while ((m = re.exec(txt))) max = Math.max(max, +m[1]);
    if (max) return max;
    const m2 = txt.match(/\/Type\s*\/Page(?![s])/g);
    return m2 ? m2.length : null;
  } catch (e) { return null; }
}

/* Deriva os metadados do item a partir dos blocos de conteúdo. */
function deriveFromContents(cs) {
  if (!cs || !cs.length) return {};
  let pages = 0, messages = 0, hasMsg = false, primary = null;
  const fmt = [];
  const addF = (f) => { if (!fmt.includes(f)) fmt.push(f); };
  cs.forEach((c) => {
    pages += c.pages || 0;
    if (c.kind === 'word') {
      if (c.messages) { messages += c.messages; hasMsg = true; }
      addF('PDF');
      if (c.delivery === 'word') { addF('Word'); addF('Editável'); }
      primary = primary || 'PDF';
    } else if (c.kind === 'pdf') { addF('PDF'); primary = primary || 'PDF'; }
    else if (c.kind === 'ppt') { addF('Slides'); primary = primary || 'PPT'; }
  });
  return { pages: pages || null, messages: hasMsg ? messages : null, format: primary || 'PDF', formatos: fmt };
}

/* Código sistêmico: prefixo pela família + número. Gerado uma vez. */
function systemicCode(family) {
  const pre = family === 'Para liderar' ? 'M' : 'S';
  return `${pre}-${String(Math.floor(Math.random() * 89) + 10)}`;
}

/* ───────── CAMPOS GENÉRICOS ───────── */
function Field({ label, hint, children, opt }) {
  return (
    <div className="fld">
      {label && <label className="fld-label">{label}{opt && <span className="fld-opt"> · opcional</span>}</label>}
      {children}
      {hint && <div className="fld-hint">{hint}</div>}
    </div>
  );
}

function SectionHead({ mark, opt }) {
  return (
    <div className="ed-sec">
      <span className="ed-sec-mark">◆ {mark}</span>
      <span className="ed-sec-line"></span>
      {opt && <span className="ed-sec-opt">{opt}</span>}
    </div>
  );
}

function ListField({ value, onChange, placeholder }) {
  const set = (i, v) => { const a = [...value]; a[i] = v; onChange(a); };
  const add = () => onChange([...value, '']);
  const del = (i) => onChange(value.filter((_, k) => k !== i));
  return (
    <div className="ementa">
      {value.map((e, i) => (
        <div className="ementa-row" key={i}>
          <span className="ementa-num">→</span>
          <input className="inp" value={e} onChange={(ev) => set(i, ev.target.value)} placeholder={placeholder} />
          <button className="ementa-del" onClick={() => del(i)} title="Remover">✕</button>
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar item</button>
    </div>
  );
}

function MessageListField({ count, value, accent, onChange }) {
  const rows = Math.max(count || 0, value.length);
  const get = (i) => value[i] || { nome: '', desc: '' };
  const set = (i, patch) => {
    const a = [];
    for (let k = 0; k < rows; k++) a[k] = { ...get(k) };
    a[i] = { ...a[i], ...patch };
    onChange(a);
  };
  if (rows === 0) return <div className="fld-hint">Adicione um <em>documento</em> acima para detalhar cada mensagem.</div>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => {
        const r = get(i);
        return (
          <div key={i} style={{ border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--ink)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 600, color: accent }}>{String(i + 1).padStart(2, '0')}</span>
              <input className="inp" style={{ flex: 1 }} value={r.nome} onChange={(e) => set(i, { nome: e.target.value })} placeholder={`Nome da mensagem ${i + 1}`} />
            </div>
            <input className="inp" value={r.desc} onChange={(e) => set(i, { desc: e.target.value })} placeholder="Breve descrição (uma linha)" />
          </div>
        );
      })}
    </div>
  );
}

function ModelField({ value, onChange, accent }) {
  const opts = [
    { k: 'A', n: 'Tipográfico', d: 'Título gigante é a arte' },
    { k: 'B', n: 'Bloco', d: 'Faixa de cor cheia' },
    { k: 'C', n: 'Número', d: 'O número vende' },
    { k: 'D', n: 'Foto', d: 'Usa a imagem de capa' },
  ];
  return (
    <div className="ed-2col" style={{ gridTemplateColumns: '1fr 1fr', gap: 10 }}>
      {opts.map((o) => (
        <button key={o.k} onClick={() => onChange(o.k)}
          style={{ textAlign: 'left', padding: '12px 14px', borderRadius: 'var(--r-sm)', border: `1px solid ${value === o.k ? accent : 'var(--border-2)'}`,
            background: value === o.k ? 'var(--olive-dim)' : 'var(--ink)', transition: 'all .15s' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600, color: value === o.k ? accent : 'var(--muted)' }}>{o.k}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--light)' }}>{o.n}</span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--subtle)' }}>{o.d}</div>
        </button>
      ))}
    </div>
  );
}

/* Palavras-chave como tags */
function TagsField({ value, onChange }) {
  const [draft, setDraft] = useStateE('');
  const v = value || [];
  const commit = () => {
    const t = draft.trim().replace(/,$/, '');
    if (t && !v.includes(t)) onChange([...v, t]);
    setDraft('');
  };
  return (
    <div className="tags" onClick={(e) => e.currentTarget.querySelector('input').focus()}>
      {v.map((t, i) => (
        <span className="tag" key={i}>{t}<span className="tag-x" onClick={(e) => { e.stopPropagation(); onChange(v.filter((_, k) => k !== i)); }}>✕</span></span>
      ))}
      <input className="tag-inp" value={draft} placeholder={v.length ? 'mais uma…' : 'ex: célula, discipulado, jovens'}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(); } else if (e.key === 'Backspace' && !draft && v.length) onChange(v.slice(0, -1)); }}
        onBlur={commit} />
    </div>
  );
}

/* FAQ opcional */
function FaqField({ value, onChange }) {
  const v = value || [];
  const set = (i, patch) => { const a = v.map((x) => ({ ...x })); a[i] = { ...a[i], ...patch }; onChange(a); };
  const add = () => onChange([...v, { q: '', a: '' }]);
  const del = (i) => onChange(v.filter((_, k) => k !== i));
  if (!v.length) return <button className="btn-ghost-add" onClick={add}>+ Adicionar pergunta frequente</button>;
  return (
    <div className="faq">
      {v.map((f, i) => (
        <div className="faq-row" key={i}>
          <div className="faq-q">
            <input className="inp" value={f.q} onChange={(e) => set(i, { q: e.target.value })} placeholder="Pergunta" />
            <button className="faq-del" onClick={() => del(i)} title="Remover">✕</button>
          </div>
          <textarea className="inp ta" style={{ minHeight: 54 }} value={f.a} onChange={(e) => set(i, { a: e.target.value })} placeholder="Resposta curta" />
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Outra pergunta</button>
    </div>
  );
}

/* Campos de detalhe que TODO conteúdo carrega → aparecem na página de venda */
function ContentDetails({ name, note, onName, onNote, namePlaceholder, notePlaceholder }) {
  return (
    <div className="cdetails">
      <div className="cdetails-tag">◆ Vai aparecer na página de venda</div>
      <Field label="Nome deste conteúdo">
        <input className="inp" value={name} onChange={(e) => onName(e.target.value)} placeholder={namePlaceholder} />
      </Field>
      <Field label="O que é / o que entrega" hint="Uma linha pro comprador saber o que está levando.">
        <textarea className="inp ta" style={{ minHeight: 52 }} value={note} onChange={(e) => onNote(e.target.value)} placeholder={notePlaceholder || 'Ex: Roteiro completo, pronto pra aplicar na célula.'} />
      </Field>
    </div>
  );
}

/* ───────── ESCOLHER FORMATO (pop-up inicial) ───────── */
function ChooserModal({ onPick, onClose }) {
  const opts = [
    { k: 'word', Ic: IcoWord, t: 'Documento de texto', s: 'Escreva aqui ou cole — sai em PDF e/ou Word editável' },
    { k: 'pdf', Ic: IcoPdf, t: 'PDF pronto', s: 'Importe um arquivo PDF que você já tem' },
    { k: 'ppt', Ic: IcoPpt, t: 'Apresentação', s: 'Slides para projetar, a partir dos modelos' },
    { k: 'image', Ic: IcoImg, t: 'Imagem', s: 'Foto de capa para a arte do material' },
  ];
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="cmodal-head">
          <div>
            <div className="cmodal-eyebrow">◆ Novo conteúdo</div>
            <div className="cmodal-title">O que você quer adicionar?</div>
          </div>
          <button className="cmodal-x" onClick={onClose}>✕</button>
        </div>
        <div className="cmodal-body">
          <div className="chooser">
            {opts.map((o) => { const Ic = o.Ic; return (
              <button key={o.k} className="chooser-opt" onClick={() => onPick(o.k)}>
                <span className="chooser-ic"><Ic /></span>
                <span className="chooser-tt">{o.t}</span>
                <span className="chooser-sb">{o.s}</span>
              </button>
            ); })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── MÓDULO: ESCREVER / COLAR TEXTO (Word) ───────── */
function WordModal({ initial, onAdd, onClose }) {
  const [text, setText] = useStateE(initial && initial.text || '');
  const [delivery, setDelivery] = useStateE(initial ? initial.delivery : 'word');
  const [name, setName] = useStateE(initial ? (initial.name || '') : '');
  const [note, setNote] = useStateE(initial ? (initial.note || '') : '');
  const a = analyzeText(text);
  const ready = text.trim().length > 20;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()}>
        <div className="cmodal-head">
          <div>
            <div className="cmodal-eyebrow">◆ Documento · módulo de texto</div>
            <div className="cmodal-title">Escreva ou cole o conteúdo</div>
          </div>
          <button className="cmodal-x" onClick={onClose}>✕</button>
        </div>
        <div className="cmodal-body">
          <textarea className="inp ta cmodal-ta" autoFocus value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'Cole aqui o material. Use um título por mensagem (ex: "Mensagem 1: ..." ou "# Título") e o sistema conta tudo sozinho.'} />
          <div className="derive">
            <span className={`derive-chip ${a.messages ? 'live' : ''}`}><b>{a.messages || '—'}</b> mensagens</span>
            <span className={`derive-chip ${a.pages ? 'live' : ''}`}><b>{a.pages || '—'}</b> páginas</span>
          </div>
          <div className="cmodal-sub">Contagem detectada automaticamente.</div>

          <div className="fld" style={{ marginTop: 22 }}>
            <label className="fld-label">Como o comprador recebe</label>
            <div className="dchoice">
              <button className={`dopt ${delivery === 'word' ? 'on' : ''}`} onClick={() => setDelivery('word')}>
                <div className="dopt-tt"><span className="dradio"></span>Edita no Word</div>
                <div className="dopt-sb">Abre no mesmo módulo de texto e personaliza pra igreja dele.</div>
              </button>
              <button className={`dopt ${delivery === 'pdf' ? 'on' : ''}`} onClick={() => setDelivery('pdf')}>
                <div className="dopt-tt"><span className="dradio"></span>Somente PDF</div>
                <div className="dopt-sb">Recebe pronto pra ler e imprimir, sem editar.</div>
              </button>
            </div>
          </div>

          <ContentDetails name={name} note={note} onName={setName} onNote={setNote}
            namePlaceholder={a.title || 'Ex: Roteiro das mensagens'} />
        </div>
        <div className="cmodal-foot">
          <a className="cmodal-link" href="../cex-studio/textos.html" target="_blank" rel="noreferrer">Abrir editor completo →</a>
          <button className="btn-pri" disabled={!ready} style={{ opacity: ready ? 1 : .5 }}
            onClick={() => ready && onAdd({ kind: 'word', text, chars: a.chars, messages: a.messages, pages: a.pages, delivery, headings: a.headings, name: name.trim() || a.title, note: note.trim() }, { title: a.title, desc: a.desc })}>
            {initial ? 'Salvar conteúdo' : 'Adicionar conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── MÓDULO: IMPORTAR PDF ───────── */
function PdfModal({ initial, onAdd, onClose }) {
  const [fileName, setFileName] = useStateE(initial ? (initial.file || '') : '');
  const [pages, setPages] = useStateE(initial ? initial.pages : null);
  const [busy, setBusy] = useStateE(false);
  const [name, setName] = useStateE(initial ? (initial.name || '') : '');
  const [note, setNote] = useStateE(initial ? (initial.note || '') : '');
  const ref = React.useRef(null);
  const pick = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setFileName(f.name); setBusy(true); setPages(null);
    const n = await countPdfPages(f);
    setPages(n); setBusy(false);
    if (!name) setName(f.name.replace(/\.pdf$/i, ''));
  };
  const ready = !!fileName;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()}>
        <div className="cmodal-head">
          <div>
            <div className="cmodal-eyebrow">◆ PDF · leitor</div>
            <div className="cmodal-title">Importar um PDF pronto</div>
          </div>
          <button className="cmodal-x" onClick={onClose}>✕</button>
        </div>
        <div className="cmodal-body">
          <div className="imgdrop" style={{ padding: 36 }} onClick={() => ref.current && ref.current.click()}>
            {fileName ? <span><b style={{ color: 'var(--cream)' }}>{fileName}</b></span> : <span>Arraste o PDF ou <em>clique para enviar</em></span>}
          </div>
          <input ref={ref} type="file" accept="application/pdf" hidden onChange={pick} />
          {fileName && (
            <div className="derive">
              <span className={`derive-chip ${pages ? 'live' : ''}`}><b>{busy ? '…' : (pages || '?')}</b> páginas</span>
              <span className="derive-chip">formato: <b style={{ fontSize: 12 }}>PDF</b></span>
            </div>
          )}
          <div className="cmodal-sub">O número de páginas é lido do arquivo automaticamente.</div>

          {ready && <ContentDetails name={name} note={note} onName={setName} onNote={setNote}
            namePlaceholder="Ex: Apostila do participante" />}
        </div>
        <div className="cmodal-foot">
          <a className="cmodal-link" href="../cex-studio/pdf.html" target="_blank" rel="noreferrer">Abrir leitor de PDF →</a>
          <button className="btn-pri" disabled={!ready} style={{ opacity: ready ? 1 : .5 }}
            onClick={() => ready && onAdd({ kind: 'pdf', file: fileName, pages: pages || null, name: name.trim() || fileName.replace(/\.pdf$/i, ''), note: note.trim() }, { title: fileName.replace(/\.pdf$/i, '') })}>
            {initial ? 'Salvar conteúdo' : 'Adicionar conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── MÓDULO: SLIDES / PPT ───────── */
function PptModal({ initial, onAdd, onClose }) {
  const [slides, setSlides] = useStateE(initial ? initial.slides : 12);
  const [name, setName] = useStateE(initial ? (initial.name || '') : '');
  const [note, setNote] = useStateE(initial ? (initial.note || '') : '');
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="cmodal" onClick={(e) => e.stopPropagation()}>
        <div className="cmodal-head">
          <div>
            <div className="cmodal-eyebrow">◆ Slides · modelos prontos</div>
            <div className="cmodal-title">Apresentação para projetar</div>
          </div>
          <button className="cmodal-x" onClick={onClose}>✕</button>
        </div>
        <div className="cmodal-body">
          <p className="cmodal-sub" style={{ marginTop: 0, marginBottom: 16 }}>Os slides saem dos modelos CE.X já formatados. Monte no estúdio e diga quantas telas tem.</p>
          <Field label="Quantas telas (slides)">
            <input className="inp" type="number" min="1" value={slides} onChange={(e) => setSlides(+e.target.value)} />
          </Field>
          <ContentDetails name={name} note={note} onName={setName} onNote={setNote}
            namePlaceholder="Ex: Slides para projetar no encontro" />
        </div>
        <div className="cmodal-foot">
          <a className="cmodal-link" href="../cex-studio/slides.html" target="_blank" rel="noreferrer">Abrir estúdio de slides →</a>
          <button className="btn-pri" onClick={() => onAdd({ kind: 'ppt', slides, name: name.trim() || 'Apresentação de slides', note: note.trim() }, null)}>
            {initial ? 'Salvar conteúdo' : 'Adicionar conteúdo'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ───────── DESCRITORES DA PEÇA ───────── */
function pieceInfo(c) {
  if (c.kind === 'word') return {
    Ic: IcoWord, label: 'TEXTO', title: c.name || 'Documento de texto', auto: true,
    big: c.messages || c.pages || null, bigUnit: c.messages ? 'msgs' : (c.pages ? 'págs' : ''),
    foot: c.delivery === 'word' ? 'Edita no Word' : 'Somente PDF',
  };
  if (c.kind === 'pdf') return {
    Ic: IcoPdf, label: 'PDF', title: c.name || 'PDF importado', auto: true,
    big: c.pages || null, bigUnit: c.pages ? 'págs' : '', foot: 'PDF importado',
  };
  if (c.kind === 'ppt') return {
    Ic: IcoPpt, label: 'SLIDES', title: c.name || 'Apresentação', auto: false,
    big: c.slides || null, bigUnit: 'telas', foot: 'Slides',
  };
  if (c.kind === 'image') return {
    Ic: IcoImg, label: 'CAPA', title: 'Imagem de capa', auto: false,
    big: null, bigUnit: '', foot: 'Arte do card', cover: true,
  };
  return { Ic: IcoWord, label: '', title: '', auto: false };
}

/* ───────── PEÇA (cartão-arquivo arrastável) ───────── */
function Piece({ c, accent, draggable, dragging, dropTarget, onDel, onEdit, ...drag }) {
  const info = pieceInfo(c);
  const Ic = info.Ic;
  const cls = ['piece', dragging ? 'is-drag' : '', dropTarget ? 'is-over' : '', info.cover ? 'is-cover' : ''].filter(Boolean).join(' ');
  const sub = (!info.cover && c.note) ? c.note : info.foot;
  return (
    <div className={cls} draggable={draggable} {...drag} onClick={onEdit ? () => onEdit() : undefined}>
      <span className="piece-edge" style={{ background: accent }}></span>
      <div className="piece-cover">
        {info.cover && c.src
          ? <img src={c.src} alt="" className="piece-img" />
          : (<>
              <span className="piece-glyph" style={{ color: accent }}><Ic /></span>
              {info.big != null && (
                <div className="piece-big"><b>{info.big}</b><span>{info.bigUnit}</span></div>
              )}
            </>)}
        <span className="piece-tag" style={info.cover ? { color: 'var(--cream)' } : null}>{info.label}</span>
        {info.auto && <span className="piece-auto" title="Lido automaticamente">◆</span>}
      </div>
      <div className="piece-foot">
        <div className="piece-tt">{info.title}</div>
        <div className="piece-sub">{sub}</div>
      </div>
      {onEdit && !info.cover && <span className="piece-edithint">tocar p/ editar</span>}
      {draggable && <span className="piece-grip" aria-hidden="true">⠿</span>}
      <button className="piece-del" onClick={(e) => { e.stopPropagation(); onDel(); }} title="Remover">✕</button>
    </div>
  );
}

/* ───────── CONTEÚDOS DO MATERIAL ───────── */
function ContentBoard({ contents, image, accent, onOpen, onDel, onDelCover, onReorder, onEdit }) {
  const [drag, setDrag] = useStateE(null);
  const [over, setOver] = useStateE(null);
  const t = deriveFromContents(contents);
  const count = contents.length;
  const pieces = [...(image ? [{ kind: 'image', src: image, _cover: true }] : []), ...contents];
  const fmts = (t.formatos && t.formatos.length) ? t.formatos : [];

  const dragProps = (ci) => ({
    onDragStart: () => setDrag(ci),
    onDragEnd: () => { setDrag(null); setOver(null); },
    onDragOver: (e) => { e.preventDefault(); if (over !== ci) setOver(ci); },
    onDrop: (e) => { e.preventDefault(); if (drag != null && drag !== ci) onReorder(drag, ci); setDrag(null); setOver(null); },
  });

  return (
    <div className="wb">
      <div className="wb-head">
        <div className="wb-eyebrow" style={{ color: accent }}>◆ O QUE O COMPRADOR RECEBE</div>
        <div className={`wb-status ${count ? 'building' : ''}`}>
          <span className="wb-dot"></span>{count ? `${count} ${count === 1 ? 'conteúdo' : 'conteúdos'}` : 'Nada ainda'}
        </div>
      </div>

      <div className="wb-totals">
        <div className="wb-tot"><b style={{ color: count ? accent : 'var(--subtle)' }}>{count || '—'}</b><span>conteúdos</span></div>
        <div className="wb-tot"><b>{t.pages || '—'}</b><span>páginas</span></div>
        <div className="wb-tot"><b>{t.messages || '—'}</b><span>mensagens</span></div>
        <div className="wb-tot wb-tot-fmt"><b>{fmts.length ? fmts.join(' · ') : '—'}</b><span>formatos</span></div>
      </div>

      <div className="wb-grid">
        {pieces.map((c, i) => {
          const ci = i - (image ? 1 : 0); // índice em `contents` (negativo = capa)
          const isCover = c._cover;
          return (
            <Piece key={isCover ? 'cover' : ci} c={c} accent={accent}
              draggable={!isCover && count > 1}
              dragging={!isCover && drag === ci}
              dropTarget={!isCover && over === ci && drag !== ci}
              onDel={() => isCover ? onDelCover() : onDel(ci)}
              onEdit={isCover ? null : () => onEdit(ci)}
              {...(!isCover && count > 1 ? dragProps(ci) : {})} />
          );
        })}

        <button className="piece add" onClick={() => onOpen('chooser')}>
          <div className="add-inner">
            <span className="add-plus">＋</span>
            <span className="add-tt">Adicionar conteúdo</span>
          </div>
        </button>
      </div>

      {count === 0 && (
        <div className="wb-empty">Cada conteúdo que você adiciona — um documento, um PDF, uma apresentação — vira um item da lista que o comprador vê. <em>Dê um nome e uma descrição a cada um</em>; páginas e formatos se contam sozinhos.</div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   EDITOR
   ════════════════════════════════════════════════════════════════ */
function Editor({ item, types, onSave, onCancel }) {
  const [d, setD] = useStateE({ ...item });
  const [mode, setMode] = useStateE('card');
  const [modal, setModal] = useStateE(null);
  const imgRef = React.useRef(null);
  const set = (k, v) => setD((prev) => ({ ...prev, [k]: v }));

  const accent = window.CEX_accentFor(d);
  const SHELVES = window.CEX_DATA.SHELVES || {};
  const dv = { ...d, accent };
  const setFamily = (fam) => setD((prev) => ({ ...prev, family: fam, shelf: (SHELVES[fam] || [])[0] || prev.shelf }));

  const isMaterial = d.type === 'material';
  const isCurso = d.type === 'curso';
  const isMentoria = d.type === 'mentoria';
  const isEvento = d.type === 'evento';
  const isNew = !item.id;
  const typeLabel = { material: 'material', curso: 'curso', mentoria: 'mentoria', evento: 'evento' }[d.type];

  /* Salva um conteúdo (novo ou editado) e re-deriva os metadados. */
  const saveContent = (content, suggest) => {
    const idx = modal && modal.index != null ? modal.index : null;
    setD((prev) => {
      const contents = [...(prev.contents || [])];
      const isNew = idx == null;
      if (isNew) contents.push(content); else contents[idx] = content;
      const patch = { contents, ...deriveFromContents(contents) };
      if (isNew && suggest) {
        if (!prev.title && suggest.title) patch.title = suggest.title;
        if (!prev.desc && suggest.desc) patch.desc = suggest.desc;
      }
      if (!prev.code) patch.code = systemicCode(prev.family);
      if (isNew && content.kind === 'word' && content.headings && content.headings.length && !(prev.messageList || []).some((m) => m && m.nome)) {
        patch.messageList = content.headings.map((h) => ({ nome: h, desc: '' }));
      }
      return { ...prev, ...patch };
    });
    setModal(null);
  };
  const delContent = (i) => setD((prev) => {
    const contents = (prev.contents || []).filter((_, k) => k !== i);
    return { ...prev, contents, ...(contents.length ? deriveFromContents(contents) : { messages: null, pages: null, formatos: [] }) };
  });
  const pickImage = (e) => { const f = e.target.files && e.target.files[0]; if (f) set('image', URL.createObjectURL(f)); };
  const reorderContent = (from, to) => setD((prev) => {
    const a = [...(prev.contents || [])];
    const [m] = a.splice(from, 1);
    a.splice(to, 0, m);
    return { ...prev, contents: a, ...deriveFromContents(a) };
  });
  const editContent = (i) => { const c = (d.contents || [])[i]; if (c) setModal({ type: c.kind, index: i, content: c }); };
  const chooserPick = (k) => { if (k === 'image') { setModal(null); imgRef.current && imgRef.current.click(); } else setModal({ type: k }); };

  return (
    <div className="editor">
      {/* ── Formulário ── */}
      <div className="ed-form">
        <div className="ed-formhead">
          <div className="ed-headrow">
            <div className="ed-eyebrow" style={{ color: accent }}>◆ {typeLabel.toUpperCase()}</div>
            {isMaterial && d.code && <span className="codebadge"><b>{d.code}</b><span className="sys">código gerado</span></span>}
          </div>
          <input className="ed-titleinput" value={d.title} placeholder={isMaterial ? 'Dê um nome ao produto' : 'Título do item'}
            onChange={(e) => set('title', e.target.value)} />
          <div className="ed-hero-hint">O nome aparece no card e na página de venda — veja a prévia ao lado mudar enquanto você edita.</div>
        </div>

        {isMaterial && (
          <>
            {/* CONTEÚDO — a mesa de montagem */}
            <SectionHead mark="Conteúdo" opt="o resto se monta sozinho" />
            <ContentBoard
              contents={d.contents || []}
              image={d.image}
              accent={accent}
              onOpen={(k) => setModal({ type: k })}
              onDel={delContent}
              onDelCover={() => set('image', null)}
              onReorder={reorderContent}
              onEdit={editContent} />
            <input ref={imgRef} type="file" accept="image/*" hidden onChange={pickImage} />

            {/* ONDE FICA */}
            <SectionHead mark="Onde fica na loja" />
            <div className="ed-2col">
              <Field label="Família"><select className="inp" value={d.family} onChange={(e) => setFamily(e.target.value)}>
                <option>Para ministrar</option><option>Para liderar</option></select></Field>
              <Field label="Estante" hint="A cor do card vem daqui, automática."><select className="inp" value={d.shelf} onChange={(e) => set('shelf', e.target.value)}>
                {(SHELVES[d.family] || [d.shelf]).map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>

            {/* DETALHES DA PÁGINA */}
            <SectionHead mark="Detalhes da página" opt="já sugeridos, edite o que quiser" />
            <Field label="Descrição curta" hint="Uma linha. Aparece no card e no topo da página.">
              <textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value)} placeholder="Se preenche a partir do conteúdo." />
            </Field>
            {d.messages > 0 && (
              <Field label={`As ${d.messages} mensagens`} hint="Nomes vêm dos títulos do seu texto. Ajuste se precisar.">
                <MessageListField count={d.messages} value={d.messageList || []} accent={accent} onChange={(v) => set('messageList', v)} />
              </Field>
            )}
            <Field label="Pra quem é" hint="Uma frase que nomeia a dor de quem vai usar." opt>
              <textarea className="inp ta" value={d.paraQuem || ''} onChange={(e) => set('paraQuem', e.target.value)} placeholder="Pra líder que..." />
            </Field>
            <Field label="O que vem dentro" hint="Bullets da página de detalhe.">
              <ListField value={d.beneficios || []} onChange={(v) => set('beneficios', v)} placeholder="Um benefício do material" />
            </Field>
            <Field label="Palavras-chave" hint="Ajudam a achar o material na busca. Enter pra confirmar.">
              <TagsField value={d.tags || []} onChange={(v) => set('tags', v)} />
            </Field>

            {/* PERGUNTAS FREQUENTES (opcional) */}
            <SectionHead mark="Perguntas frequentes" opt="opcional" />
            <FaqField value={d.faq || []} onChange={(v) => set('faq', v)} />

            {/* VENDA */}
            <SectionHead mark="Venda" />
            <div className="ed-2col">
              <Field label="Preço (R$)"><input className="inp" type="number" value={d.price} onChange={(e) => set('price', +e.target.value)} /></Field>
              <Field label="Status"><select className="inp" value={d.status} onChange={(e) => set('status', e.target.value)}><option>Publicado</option><option>Rascunho</option></select></Field>
            </div>
            <Field label="Link da Hotmart" hint="É o botão COMPRAR da página (abre em nova aba).">
              <input className="inp" value={d.hotmart} onChange={(e) => set('hotmart', e.target.value)} placeholder="https://pay.hotmart.com/..." />
            </Field>
            {(d.model || 'A') === 'C' && (
              <div className="ed-2col">
                <Field label="Número em destaque" hint="O modelo Número é escolhido na prévia ao lado."><input className="inp" type="number" value={d.big || ''} onChange={(e) => set('big', e.target.value ? +e.target.value : null)} placeholder={String(d.messages || d.pages || '')} /></Field>
                <Field label="Rótulo do número"><input className="inp" value={d.bigLabel || ''} onChange={(e) => set('bigLabel', e.target.value)} placeholder="mensagens / páginas" /></Field>
              </div>
            )}
          </>
        )}

        {isCurso && (
          <>
            <Field label="Descrição curta"><textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value)} /></Field>
            <div className="ed-2col">
              <Field label="Nível"><select className="inp" value={d.level} onChange={(e) => set('level', e.target.value)}>
                <option>Fundação</option><option>Liderança</option><option>Multiplicação</option></select></Field>
              <Field label="Status"><select className="inp" value={d.status} onChange={(e) => set('status', e.target.value)}><option>Publicado</option><option>Rascunho</option></select></Field>
            </div>
            <div className="ed-3col">
              <Field label="Etapa nº"><input className="inp" type="number" value={d.etapa} onChange={(e) => set('etapa', +e.target.value)} /></Field>
              <Field label="de (total)"><input className="inp" type="number" value={d.totalEtapas} onChange={(e) => set('totalEtapas', +e.target.value)} /></Field>
              <Field label="Semanas"><input className="inp" type="number" value={d.weeks} onChange={(e) => set('weeks', +e.target.value)} /></Field>
            </div>
            <Field label="Mentor / condutor"><input className="inp" value={d.mentor} onChange={(e) => set('mentor', e.target.value)} /></Field>
            <Field label="Próxima turma"><input className="inp" value={d.proximaTurma} onChange={(e) => set('proximaTurma', e.target.value)} /></Field>
            <Field label="Ementa por semana"><EmentaField value={d.ementa} onChange={(v) => set('ementa', v)} /></Field>
            <Field label="Pra quem é" opt><textarea className="inp ta" value={d.paraQuem || ''} onChange={(e) => set('paraQuem', e.target.value)} placeholder="Pra líder que..." /></Field>
            <div className="fld">
              <label className="fld-label">Selo "AO VIVO"</label>
              <div className={`tgl ${d.aoVivo ? 'on' : ''}`} onClick={() => set('aoVivo', !d.aoVivo)}></div>
            </div>
          </>
        )}

        {isMentoria && (
          <>
            <Field label="Descrição curta"><textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value)} /></Field>
            <Field label="Formato"><input className="inp" value={d.formato} onChange={(e) => set('formato', e.target.value)} placeholder="Grupo · 8 vagas / Individual" /></Field>
            <Field label="Cadência"><input className="inp" value={d.cadencia} onChange={(e) => set('cadencia', e.target.value)} /></Field>
            <div className="ed-2col">
              <Field label="Mentor"><input className="inp" value={d.mentor} onChange={(e) => set('mentor', e.target.value)} /></Field>
              <Field label="Status"><select className="inp" value={d.status} onChange={(e) => set('status', e.target.value)}><option>Publicado</option><option>Rascunho</option></select></Field>
            </div>
          </>
        )}

        {isEvento && (
          <>
            <Field label="Descrição curta"><textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value)} /></Field>
            <div className="ed-2col">
              <Field label="Data"><input className="inp" value={d.data} onChange={(e) => set('data', e.target.value)} /></Field>
              <Field label="Local"><input className="inp" value={d.local} onChange={(e) => set('local', e.target.value)} /></Field>
            </div>
            <div className="ed-2col">
              <Field label="Vagas"><input className="inp" type="number" value={d.vagas} onChange={(e) => set('vagas', +e.target.value)} /></Field>
              <Field label="Status"><select className="inp" value={d.status} onChange={(e) => set('status', e.target.value)}><option>Publicado</option><option>Rascunho</option></select></Field>
            </div>
            <Field label="Link de inscrição (Hotmart)" opt><input className="inp" value={d.hotmart || ''} onChange={(e) => set('hotmart', e.target.value)} placeholder="https://pay.hotmart.com/..." /></Field>
          </>
        )}

        {!isMaterial && (
          <Field label="Imagem de capa" opt>
            <div className="imgfield">
              <div className="imgdrop" onClick={() => imgRef.current && imgRef.current.click()}>
                {d.image ? <img src={d.image} alt="" className="imgthumb" /> : <span>Arraste uma imagem ou <em>clique para enviar</em></span>}
              </div>
              <input ref={imgRef} type="file" accept="image/*" hidden onChange={pickImage} />
              <div className="imgactions">
                {d.image && <button className="lnk-danger" onClick={() => set('image', null)}>Remover imagem</button>}
                <span className="fld-hint" style={{ margin: 0 }}>Sem imagem, usa a <em>arte automática CE.X</em>.</span>
              </div>
            </div>
          </Field>
        )}

        <div className="ed-actions">
          <button className="btn-pri" onClick={() => onSave(dv)}>{isNew ? 'Criar item' : 'Salvar alterações'}</button>
          <button className="btn-sec" onClick={onCancel}>Cancelar</button>
        </div>
      </div>

      {/* ── Prévia ao vivo (fica visível enquanto edita) ── */}
      <div className="ed-preview">
        <div className="ed-prevbar">
          <span className="ed-prevtitle">Prévia ao vivo</span>
          <div className="seg">
            {['card', 'pagina', 'divulgacao'].map((m) => (
              <button key={m} className={`seg-btn ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
                {m === 'card' ? 'Card' : m === 'pagina' ? 'Página' : 'Divulgação'}
              </button>
            ))}
          </div>
        </div>
        <div className="ed-prevstage">
          {mode === 'card' && <div className="prev-center"><CatalogCardPreview item={dv} /></div>}
          {mode === 'pagina' && <div className="prev-scale"><DetailPreview item={dv} /></div>}
          {mode === 'divulgacao' && <SharePanel item={dv} />}
        </div>
        {isMaterial && mode === 'card' && (
          <div className="modelbar">
            <span className="modelbar-lbl">Modelo</span>
            <div className="modelbar-opts">
              {[{ k: 'A', n: 'Tipo' }, { k: 'B', n: 'Bloco' }, { k: 'C', n: 'Número' }, { k: 'D', n: 'Foto' }].map((o) => (
                <button key={o.k} className={`modelchip ${(d.model || 'A') === o.k ? 'on' : ''}`}
                  style={(d.model || 'A') === o.k ? { borderColor: accent, color: accent } : null}
                  onClick={() => set('model', o.k)}>{o.n}</button>
              ))}
            </div>
          </div>
        )}
        {d.status === 'Rascunho' && <div className="ed-draftnote">◆ Em rascunho. Não aparece no site até publicar.</div>}
      </div>

      {modal && modal.type === 'chooser' && <ChooserModal onPick={chooserPick} onClose={() => setModal(null)} />}
      {modal && modal.type === 'word' && <WordModal initial={modal.content} onAdd={saveContent} onClose={() => setModal(null)} />}
      {modal && modal.type === 'pdf' && <PdfModal initial={modal.content} onAdd={saveContent} onClose={() => setModal(null)} />}
      {modal && modal.type === 'ppt' && <PptModal initial={modal.content} onAdd={saveContent} onClose={() => setModal(null)} />}
    </div>
  );
}

/* Ementa de curso (mantida) */
function EmentaField({ value, onChange }) {
  const set = (i, v) => { const a = [...value]; a[i] = v; onChange(a); };
  const add = () => onChange([...value, '']);
  const del = (i) => onChange(value.filter((_, k) => k !== i));
  return (
    <div className="ementa">
      {value.map((e, i) => (
        <div className="ementa-row" key={i}>
          <span className="ementa-num">S{i + 1}</span>
          <input className="inp" value={e} onChange={(ev) => set(i, ev.target.value)} placeholder={`O que se aprende na semana ${i + 1}`} />
          <button className="ementa-del" onClick={() => del(i)} title="Remover">✕</button>
        </div>
      ))}
      <button className="btn-ghost-add" onClick={add}>+ Adicionar semana</button>
    </div>
  );
}

Object.assign(window, { Editor });
