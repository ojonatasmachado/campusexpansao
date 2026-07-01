/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · IGREJA — Identidade (missão/visão/propósito/valores
   + ciclo do ano) e Nossa História (mural com fotos, textos e links).
   Conteúdo opcional: campo vazio não aparece. Edição salva na sessão.
   ════════════════════════════════════════════════════════════════ */

/* modalzinho genérico de edição (campos texto/área) */
function EditModal({ title, sub, fields, values, onSave, onClose }) {
  const [v, setV] = useState(values);
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Editar</div>
          <div className="modal-title">{title}</div>
          {sub && <div className="modal-sub">{sub}</div>}
        </div>
        <div className="modal-body">
          {fields.map((f) => (
            <div className="field" key={f.k}>
              <label className="field-label">{f.label}</label>
              {f.area
                ? <textarea className="textarea" value={v[f.k] || ''} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} style={f.big ? { minHeight: 120 } : null} />
                : <input className="input" value={v[f.k] || ''} placeholder={f.ph} onChange={(e) => set(f.k, e.target.value)} />}
              {f.hint && <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>{f.hint}</div>}
            </div>
          ))}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={() => { onSave(v); onClose(); }}>Salvar</button>
        </div>
      </div>
    </div>
  );
}

/* ════════ IDENTIDADE ════════ */
const VAL_ICONS = ['identidade', 'cursos', 'membros', 'batismos', 'decisoes', 'globo'];
function Identidade({ admin = (typeof window !== 'undefined' && window.cexPodeEditar ? window.cexPodeEditar('igreja') : true) }) {
  const [, bump] = useState(0);
  const [edit, setEdit] = useState(null); // 'id' | 'ciclo'
  const id = S.IDENTIDADE;
  const ativo = S.CICLOS.find((c) => c.ativo);
  const anteriores = S.CICLOS.filter((c) => !c.ativo);
  const force = () => bump((n) => n + 1);

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Nossa igreja</div>
          <h1 className="ph-title">Identidade & <em>propósito</em></h1>
          <p className="ph-sub">Quem somos, por que existimos e para onde vamos. É isso que conecta cada pessoa ao chamado — e ajuda a decidir onde servir.</p>
        </div>
        {admin && <div className="ph-actions"><button className="btn btn-sec" onClick={() => setEdit('id')}>Editar identidade</button></div>}
      </div>

      {id.proposito && (
        <div className="ident-hero">
          <div className="ident-hero-label">Nosso propósito</div>
          <div className="ident-hero-text">{id.proposito}</div>
          {id.versiculo && <div className="ident-verse">{id.versiculo}</div>}
        </div>
      )}

      <div className="ident-grid">
        {id.missao && (
          <div className="ident-card">
            <div className="ident-card-ic"><Icon name="identidade" size={22} /></div>
            <div className="ident-card-t">Missão</div>
            <div className="ident-card-x">{id.missao}</div>
          </div>
        )}
        {id.visao && (
          <div className="ident-card">
            <div className="ident-card-ic"><Icon name="globo" size={22} /></div>
            <div className="ident-card-t">Visão</div>
            <div className="ident-card-x">{id.visao}</div>
          </div>
        )}
      </div>

      {S.VALORES && S.VALORES.length > 0 && (
        <>
          <div className="section-divide"><Icon name="identidade" size={14} className="num" /><span className="label">Nossos valores</span><span className="line"></span></div>
          <div className="val-grid">
            {S.VALORES.map((val, i) => (
              <div className="val-card" key={i}>
                <div className="val-ic"><Icon name={VAL_ICONS[i % VAL_ICONS.length]} size={20} /></div>
                <div className="val-t">{val.titulo}</div>
                <div className="val-x">{val.texto}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {ativo && (
        <>
          <div className="section-divide"><Icon name="agenda" size={14} className="num" /><span className="label">Visão do ano · {ativo.ano}</span><span className="line"></span>{admin && <button className="panel-link" onClick={() => setEdit('ciclo')}>Editar ciclo</button>}</div>
          <div className="ciclo">
            <div className="ciclo-banner">
              <image-slot id={ativo.bannerId} shape="rect" placeholder={`Banner do ${ativo.tema}`}></image-slot>
              <div className="ciclo-banner-tag">{ativo.ano} · ciclo vigente</div>
            </div>
            <div className="ciclo-body">
              <div className="ciclo-tema">{ativo.tema}</div>
              {ativo.versiculo && <div className="ciclo-verse">{ativo.versiculo}</div>}
              <div className="ciclo-text">{ativo.texto}</div>
              {ativo.objetivos && ativo.objetivos.length > 0 && (
                <div className="ciclo-obj">
                  <div className="ciclo-obj-t">Objetivos do ano</div>
                  {ativo.objetivos.map((o, i) => (
                    <div className="ciclo-obj-row" key={i}><span className="ciclo-obj-n">{String(i + 1).padStart(2, '0')}</span>{o}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {anteriores.length > 0 && (
        <>
          <div className="section-divide"><Icon name="historia" size={14} className="num" /><span className="label">Ciclos anteriores</span><span className="line"></span></div>
          <div className="tbl">
            {anteriores.map((c) => (
              <div className="tr" key={c.id} style={{ gridTemplateColumns: '90px 1.6fr 1fr' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--olive)', fontWeight: 600 }}>{c.ano}</div>
                <div><div className="cell-name">{c.tema}</div><div className="cell-sub">{c.versiculo}</div></div>
                <div className="cell-sub">{c.texto.slice(0, 90)}…</div>
              </div>
            ))}
          </div>
        </>
      )}

      {edit === 'id' && (
        <EditModal title="Identidade da igreja" sub="Aparece para toda a igreja, no painel e no app do membro."
          fields={[
            { k: 'proposito', label: 'Propósito', area: true, big: true, ph: 'Por que a igreja existe?' },
            { k: 'versiculo', label: 'Versículo-chave', ph: '"..." — referência' },
            { k: 'missao', label: 'Missão', area: true, ph: 'O que fazemos' },
            { k: 'visao', label: 'Visão', area: true, ph: 'Para onde vamos' },
          ]}
          values={{ proposito: id.proposito, versiculo: id.versiculo, missao: id.missao, visao: id.visao }}
          onSave={(v) => { Object.assign(S.IDENTIDADE, v); force(); cexToast('Identidade atualizada.'); }}
          onClose={() => setEdit(null)} />
      )}
      {edit === 'ciclo' && ativo && (
        <EditModal title={`Ciclo ${ativo.ano}`} sub="A visão do ano que todos enxergam."
          fields={[
            { k: 'tema', label: 'Tema do ano', ph: 'Ex: Ano do Enraizamento' },
            { k: 'versiculo', label: 'Versículo', ph: '"..." — referência' },
            { k: 'texto', label: 'Explicação', area: true, big: true, ph: 'O que esse ano significa' },
            { k: 'objetivos', label: 'Objetivos (um por linha)', area: true, ph: 'Um objetivo por linha' },
          ]}
          values={{ tema: ativo.tema, versiculo: ativo.versiculo, texto: ativo.texto, objetivos: ativo.objetivos.join('\n') }}
          onSave={(v) => { ativo.tema = v.tema; ativo.versiculo = v.versiculo; ativo.texto = v.texto; ativo.objetivos = v.objetivos.split('\n').map((s) => s.trim()).filter(Boolean); force(); cexToast('Ciclo atualizado.'); }}
          onClose={() => setEdit(null)} />
      )}
    </div>
  );
}

/* ════════ NOSSA HISTÓRIA (mural) ════════ */
function NossaHistoria({ admin = true }) {
  const [, bump] = useState(0);
  const [edit, setEdit] = useState(null); // {novo:true} | item
  const force = () => bump((n) => n + 1);
  const lista = S.HISTORIA;

  return (
    <div className="content">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Nossa igreja</div>
          <h1 className="ph-title">Nossa <em>história</em></h1>
          <p className="ph-sub">Cada capítulo de fé que nos trouxe até aqui. Um mural para lembrar de onde viemos — e de Quem nos sustentou.</p>
        </div>
        {admin && <div className="ph-actions"><button className="btn btn-pri" onClick={() => setEdit({ novo: true })}>+ Adicionar capítulo</button></div>}
      </div>

      {lista.length === 0 ? (
        <div className="empty">Ainda não há capítulos. <em>Conte a primeira página da sua história.</em></div>
      ) : (
        <div className="hist">
          {lista.map((h, i) => (
            <div className={`hist-item ${i % 2 ? 'rev' : ''}`} key={h.id}>
              <div className="hist-photo">
                <image-slot id={h.fotoId} shape="rounded" placeholder={`Foto · ${h.ano}`}></image-slot>
                <span className="hist-year">{h.ano}</span>
              </div>
              <div className="hist-text">
                <div className="hist-t">{h.titulo}</div>
                <div className="hist-x">{h.texto}</div>
                <div className="hist-foot">
                  {h.link && <a className="hist-link" href={h.link} target="_blank" rel="noreferrer">Ver mais →</a>}
                  {admin && <button className="hist-edit" onClick={() => setEdit(h)}>Editar</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {edit && (
        <EditModal
          title={edit.novo ? 'Novo capítulo' : `Capítulo de ${edit.ano}`}
          sub="Aparece no mural para toda a igreja. A foto é adicionada arrastando uma imagem no card."
          fields={[
            { k: 'ano', label: 'Ano', ph: 'Ex: 2025' },
            { k: 'titulo', label: 'Título', ph: 'O que aconteceu' },
            { k: 'texto', label: 'História', area: true, big: true, ph: 'Conte esse momento' },
            { k: 'link', label: 'Link (opcional)', ph: 'https://…', hint: 'Vídeo, matéria ou álbum de fotos.' },
          ]}
          values={edit.novo ? { ano: '', titulo: '', texto: '', link: '' } : { ano: edit.ano, titulo: edit.titulo, texto: edit.texto, link: edit.link }}
          onSave={(v) => {
            if (edit.novo) {
              const nid = 'h' + (Date.now() % 100000);
              S.HISTORIA.push({ id: nid, ano: v.ano, titulo: v.titulo, texto: v.texto, link: v.link, fotoId: 'hist-' + nid });
              cexToast('Capítulo adicionado ao mural.');
            } else {
              Object.assign(edit, v); cexToast('Capítulo atualizado.');
            }
            force();
          }}
          onClose={() => setEdit(null)} />
      )}
    </div>
  );
}

Object.assign(window, { EditModal, Identidade, NossaHistoria });
