/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · EDITOR DE ITEM
   Formulário à esquerda, prévia ao vivo à direita (Card / Página /
   Banner). Tudo editável. Material e Evento têm link Hotmart;
   Curso e Mentoria não (lógica de turma / lista de espera).
   ════════════════════════════════════════════════════════════════ */
const { useState: useStateE } = React;

function Field({ label, hint, children, req }) {
  return (
    <div className="fld">
      <label className="fld-label">{label}{req && <span className="fld-req"> ◆</span>}</label>
      {children}
      {hint && <div className="fld-hint">{hint}</div>}
    </div>
  );
}

function AccentLock({ value, name }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'var(--ink)', border: '1px solid var(--border-2)', borderRadius: 'var(--r-sm)', padding: '11px 14px' }}>
      <span style={{ width: 26, height: 26, borderRadius: 6, background: value, flexShrink: 0, border: '.5px solid rgba(255,255,255,.14)' }}></span>
      <span style={{ fontSize: 14, color: 'var(--light)', fontWeight: 600 }}>{name}</span>
      <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--subtle)', marginLeft: 'auto' }}>{value}</span>
      <span title="Travado: a cor vem da estante" style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', letterSpacing: '.08em' }}>◆ TRAVADA</span>
    </div>
  );
}

/* Seletor de Modelo do card/banner (sistema de banners) */
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

/* Lista genérica de bullets (bínus / o que vem dentro) */
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

/* Repetidor por MENSAGEM: nome + breve descrição de cada uma.
   Número de linhas acompanha o campo "Mensagens". */
function MessageListField({ count, value, accent, onChange }) {
  const rows = Math.max(count || 0, value.length);
  const get = (i) => value[i] || { nome: '', desc: '' };
  const set = (i, patch) => {
    const a = [];
    for (let k = 0; k < rows; k++) a[k] = { ...get(k) };
    a[i] = { ...a[i], ...patch };
    onChange(a);
  };
  if (rows === 0) return <div className="fld-hint">Defina <em>Mensagens</em> acima para detalhar cada uma.</div>;
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

/* Depoimento: texto + autor */
function DepoimentoField({ value, onChange }) {
  const v = value || { texto: '', autor: '' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <textarea className="inp ta" value={v.texto} onChange={(e) => onChange({ ...v, texto: e.target.value })} placeholder="“O que essa pessoa disse depois de usar...”" />
      <input className="inp" value={v.autor} onChange={(e) => onChange({ ...v, autor: e.target.value })} placeholder="Nome · igreja / cargo" />
    </div>
  );
}

function ImageField({ value, onChange }) {
  const inputRef = React.useRef(null);
  const pick = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) onChange(URL.createObjectURL(f));
  };
  return (
    <div className="imgfield">
      <div className="imgdrop" onClick={() => inputRef.current && inputRef.current.click()}>
        {value ? <img src={value} alt="" className="imgthumb" /> : <span>Arraste uma imagem ou <em>clique para enviar</em></span>}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
      <div className="imgactions">
        {value && <button className="lnk-danger" onClick={() => onChange(null)}>Remover imagem</button>}
        <span className="fld-hint" style={{ margin: 0 }}>Sem imagem, usa a <em>arte automática CE.X</em> (o X grande na cor da categoria).</span>
      </div>
    </div>
  );
}

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

function Editor({ item, types, onSave, onCancel }) {
  const [d, setD] = useStateE({ ...item });
  const [mode, setMode] = useStateE('card');
  const set = (k, v) => setD((prev) => ({ ...prev, [k]: v }));

  // Cor SEMPRE derivada da estante/nível (não editável)
  const accent = window.CEX_accentFor(d);
  const accentName = (window.CEX_DATA.ACCENT_NAME || {})[accent] || '';
  const SHELVES = window.CEX_DATA.SHELVES || {};
  const dv = { ...d, accent };

  const setFamily = (fam) => setD((prev) => ({ ...prev, family: fam, shelf: (SHELVES[fam] || [])[0] || prev.shelf }));

  const isMaterial = d.type === 'material';
  const isCurso = d.type === 'curso';
  const isMentoria = d.type === 'mentoria';
  const isEvento = d.type === 'evento';
  const isNew = !item.id;

  const typeLabel = { material: 'material', curso: 'curso', mentoria: 'mentoria', evento: 'evento' }[d.type];

  return (
    <div className="editor">
      {/* ── Formulário ── */}
      <div className="ed-form">
        <div className="ed-formhead">
          <div className="ed-eyebrow" style={{ color: accent }}>◆ {typeLabel.toUpperCase()}</div>
          <input className="ed-titleinput" value={d.title} placeholder="Título do item"
            onChange={(e) => set('title', e.target.value)} />
        </div>

        <Field label="Descrição curta" hint="Uma linha. Aparece no card e no topo da página.">
          <textarea className="inp ta" value={d.desc} onChange={(e) => set('desc', e.target.value)} />
        </Field>

        {isMaterial && (
          <>
            <div className="ed-2col">
              <Field label="Família"><select className="inp" value={d.family} onChange={(e) => setFamily(e.target.value)}>
                <option>Para ministrar</option><option>Para liderar</option></select></Field>
              <Field label="Estante" hint="Define a cor do card (travada)."><select className="inp" value={d.shelf} onChange={(e) => set('shelf', e.target.value)}>
                {(SHELVES[d.family] || [d.shelf]).map((s) => <option key={s}>{s}</option>)}</select></Field>
            </div>
            <div className="ed-3col">
              <Field label="Código"><input className="inp" value={d.code} onChange={(e) => set('code', e.target.value)} /></Field>
              <Field label="Mensagens"><input className="inp" type="number" value={d.messages || ''} onChange={(e) => set('messages', e.target.value ? +e.target.value : null)} /></Field>
              <Field label="Páginas"><input className="inp" type="number" value={d.pages || ''} onChange={(e) => set('pages', +e.target.value)} /></Field>
            </div>
            <div className="ed-2col">
              <Field label="Preço (R$)" req><input className="inp" type="number" value={d.price} onChange={(e) => set('price', +e.target.value)} /></Field>
              <Field label="Status"><select className="inp" value={d.status} onChange={(e) => set('status', e.target.value)}><option>Publicado</option><option>Rascunho</option></select></Field>
            </div>
            <Field label="Link da Hotmart" req hint="É o botão COMPRAR da página de detalhe (abre em nova aba).">
              <input className="inp" value={d.hotmart} onChange={(e) => set('hotmart', e.target.value)} placeholder="https://pay.hotmart.com/..." />
            </Field>

            <Field label="Modelo do card / banner" hint="Muda o layout na prévia. A cor segue sempre a estante.">
              <ModelField value={d.model || 'A'} accent={accent} onChange={(v) => set('model', v)} />
            </Field>
            {d.model === 'C' && (
              <div className="ed-2col">
                <Field label="Número em destaque"><input className="inp" type="number" value={d.big || ''} onChange={(e) => set('big', e.target.value ? +e.target.value : null)} placeholder={String(d.messages || d.pages || '')} /></Field>
                <Field label="Rótulo do número"><input className="inp" value={d.bigLabel || ''} onChange={(e) => set('bigLabel', e.target.value)} placeholder="mensagens / páginas" /></Field>
              </div>
            )}

            {d.messages > 0 && (
              <Field label={`Detalhe das ${d.messages} mensagens`} hint="Nome e uma linha sobre cada mensagem. Aparece na página do material.">
                <MessageListField count={d.messages} value={d.messageList || []} accent={accent} onChange={(v) => set('messageList', v)} />
              </Field>
            )}

            <Field label="Pra quem é" hint="Uma frase que nomeia a dor de quem vai usar.">
              <textarea className="inp ta" value={d.paraQuem || ''} onChange={(e) => set('paraQuem', e.target.value)} placeholder="Pra líder que..." />
            </Field>
            <Field label="O que vem dentro" hint="Bullets da página de detalhe.">
              <ListField value={d.beneficios || []} onChange={(v) => set('beneficios', v)} placeholder="Um benefício do material" />
            </Field>
            <Field label="Depoimento" hint="Opcional. Prova de quem já usou.">
              <DepoimentoField value={d.depoimento} onChange={(v) => set('depoimento', v)} />
            </Field>
          </>
        )}

        {isCurso && (
          <>
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
            <Field label="Pra quem é" hint="Nomeia a dor do líder que precisa deste curso.">
              <textarea className="inp ta" value={d.paraQuem || ''} onChange={(e) => set('paraQuem', e.target.value)} placeholder="Pra líder que..." />
            </Field>
            <Field label="Depoimento" hint="Opcional. Quem já fez o curso.">
              <DepoimentoField value={d.depoimento} onChange={(v) => set('depoimento', v)} />
            </Field>
            <div className="fld">
              <label className="fld-label">Selo "AO VIVO"</label>
              <div className={`tgl ${d.aoVivo ? 'on' : ''}`} onClick={() => set('aoVivo', !d.aoVivo)}></div>
            </div>
          </>
        )}

        {isMentoria && (
          <>
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
            <div className="ed-2col">
              <Field label="Data"><input className="inp" value={d.data} onChange={(e) => set('data', e.target.value)} /></Field>
              <Field label="Local"><input className="inp" value={d.local} onChange={(e) => set('local', e.target.value)} /></Field>
            </div>
            <div className="ed-2col">
              <Field label="Vagas"><input className="inp" type="number" value={d.vagas} onChange={(e) => set('vagas', +e.target.value)} /></Field>
              <Field label="Status"><select className="inp" value={d.status} onChange={(e) => set('status', e.target.value)}><option>Publicado</option><option>Rascunho</option></select></Field>
            </div>
            <Field label="Link de inscrição (Hotmart)" hint="Opcional. Abre em nova aba.">
              <input className="inp" value={d.hotmart || ''} onChange={(e) => set('hotmart', e.target.value)} placeholder="https://pay.hotmart.com/..." />
            </Field>
          </>
        )}

        <Field label="Cor de acento" hint="Travada: cada estante / nível tem sua cor. Oliva nunca passa de 15% da peça.">
          <AccentLock value={accent} name={accentName} />
        </Field>
        <Field label="Imagem de capa">
          <ImageField value={d.image} onChange={(v) => set('image', v)} />
        </Field>

        <div className="ed-actions">
          <button className="btn-pri" onClick={() => onSave(dv)}>{isNew ? 'Criar item' : 'Salvar alterações'}</button>
          <button className="btn-sec" onClick={onCancel}>Cancelar</button>
        </div>
      </div>

      {/* ── Prévia ao vivo ── */}
      <div className="ed-preview">
        <div className="ed-prevbar">
          <span className="ed-prevtitle">Prévia ao vivo</span>
          <div className="seg">
            {['card', 'pagina', 'banner'].map((m) => (
              <button key={m} className={`seg-btn ${mode === m ? 'on' : ''}`} onClick={() => setMode(m)}>
                {m === 'card' ? 'Card' : m === 'pagina' ? 'Página' : 'Banner'}
              </button>
            ))}
          </div>
        </div>
        <div className="ed-prevstage">
          {mode === 'card' && <div className="prev-center"><CatalogCardPreview item={dv} /></div>}
          {mode === 'pagina' && <div className="prev-scale"><DetailPreview item={dv} /></div>}
          {mode === 'banner' && <div className="prev-center"><BannerPreview item={dv} /></div>}
        </div>
        {d.status === 'Rascunho' && <div className="ed-draftnote">◆ Em rascunho. Não aparece no site até publicar.</div>}
      </div>
    </div>
  );
}

Object.assign(window, { Editor });
