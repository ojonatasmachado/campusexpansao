/* ════════════════════════════════════════════════════════════════
   CE.X ADMIN · COMPONENTES DE PRÉVIA
   Réplicas fiéis do que aparece no site, para o admin mostrar
   exatamente como o item vai ficar publicado.
   ════════════════════════════════════════════════════════════════ */
const { useState: _useStateP } = React;

/* Arte automática CE.X: bloco escuro com o "X" gigante na cor da categoria */
function AutoArt({ accent, label, height = 150, big = false }) {
  return (
    <div className="pv-art" style={{ height }}>
      <div className="pv-art-grid"></div>
      <div className="pv-art-x" style={{ color: accent, opacity: big ? 0.16 : 0.13, fontSize: big ? 360 : 190 }}>X</div>
      {label && <div className="pv-art-mark" style={{ color: accent }}>◆ {label}</div>}
    </div>
  );
}

/* Mídia do card: imagem enviada OU arte automática */
function CardMedia({ item, height = 150, big = false, labelOverride }) {
  const label = labelOverride || (item.shelf || item.level || item.type || '').toUpperCase();
  if (item.image) {
    return (
      <div className="pv-art" style={{ height, backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
        {label && <div className="pv-art-mark" style={{ color: '#EDE6D3', background: 'rgba(14,17,13,.55)', padding: '4px 10px', borderRadius: 100, backdropFilter: 'blur(6px)' }}>◆ {label}</div>}
      </div>
    );
  }
  return <AutoArt accent={item.accent} label={label} height={height} big={big} />;
}

/* meta do material: "5 mensagens · Editável · PDF" */
function matMeta(item) {
  const n = item.messages ? `${item.messages} mensagens` : (item.pages ? `${item.pages} páginas` : null);
  const f = (item.formatos && item.formatos.length) ? item.formatos : [item.format || 'PDF'];
  const editavel = f.includes('Editável') ? 'Editável' : null;
  const prim = item.format || f.find((x) => x !== 'Editável') || 'PDF';
  return [n, editavel, prim].filter(Boolean).join(' · ');
}

/* nome + meta de um conteúdo, para a lista "o que vem dentro" */
function contentName(c) {
  if (c.name) return c.name;
  if (c.kind === 'word') return 'Documento de texto';
  if (c.kind === 'pdf') return c.file ? c.file.replace(/\.pdf$/i, '') : 'PDF';
  if (c.kind === 'ppt') return 'Apresentação de slides';
  return 'Conteúdo';
}
function contentMeta(c) {
  if (c.kind === 'word') return [c.messages ? `${c.messages} mensagens` : null, c.pages ? `${c.pages} páginas` : null, c.delivery === 'word' ? 'Word + PDF' : 'PDF'].filter(Boolean).join(' · ');
  if (c.kind === 'pdf') return `PDF${c.pages ? ` · ${c.pages} páginas` : ''}`;
  if (c.kind === 'ppt') return `Slides · ${c.slides} telas`;
  return '';
}

/* ───────── ARTE POR MODELO (A/B/C/D · sistema de banners) ─────────
   O miolo do card muda conforme item.model; a cor vem da estante. */
function ModelArt({ item, height = 220 }) {
  const ac = item.accent;
  const etiqueta = (item.shelf || '').toUpperCase();
  const eb = { fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 7 };
  const code = { fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--subtle)', letterSpacing: '.08em' };
  const big = item.big || item.messages || item.pages || '';

  // D · FOTO — usa a imagem se houver, senão gradiente da cor
  if (item.model === 'D') {
    const bg = item.image
      ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : { background: `radial-gradient(120% 80% at 30% 20%, ${ac} 0%, var(--ink) 62%)` };
    return (
      <div style={{ height, position: 'relative', overflow: 'hidden', ...bg }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,17,13,.15),rgba(14,17,13,.9))' }}></div>
        <div style={{ position: 'absolute', inset: 0, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div style={{ ...eb, color: 'var(--cream-soft)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 38, lineHeight: .92, letterSpacing: '-.035em', color: 'var(--white)', textWrap: 'balance' }}>{item.title}</div>
        </div>
      </div>
    );
  }

  // C · NÚMERO
  if (item.model === 'C') {
    return (
      <div style={{ height, padding: 20, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--ink)', backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px)', backgroundSize: '100% 38px' }}>
        <div style={{ ...eb, color: 'var(--sand)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 78, lineHeight: .8, color: ac, letterSpacing: '-.05em' }}>{big}</span>
          <span style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{item.bigLabel || ''}</span>
        </div>
        <div style={{ fontFamily: 'var(--sans)', fontWeight: 700, fontSize: 24, lineHeight: 1, letterSpacing: '-.02em', color: 'var(--cream)' }}>{item.title}</div>
      </div>
    );
  }

  // B · BLOCO — faixa de cor cheia, texto em tinta escura
  if (item.model === 'B') {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', background: 'var(--ink)' }}>
        <div style={{ background: ac, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ ...eb, color: 'var(--ink)' }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
          <span style={{ ...code, color: 'rgba(14,17,13,.5)' }}>{item.code}</span>
        </div>
        <div style={{ flex: 1, padding: 20, display: 'flex', alignItems: 'flex-end' }}>
          <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 38, lineHeight: .92, letterSpacing: '-.035em', color: 'var(--cream)', textWrap: 'balance' }}>{item.title}</div>
        </div>
      </div>
    );
  }

  // A · TIPOGRÁFICO (padrão)
  return (
    <div style={{ height, padding: 20, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: 'var(--ink)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ ...eb, color: ac }}><span style={{ fontSize: 9 }}>◆</span>{etiqueta}</div>
        <span style={code}>{item.code}</span>
      </div>
      <div style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 44, lineHeight: .9, letterSpacing: '-.035em', color: 'var(--cream)', textWrap: 'balance' }}>{item.title}</div>
    </div>
  );
}

/* ───────── CARD DE MATERIAL (catálogo) ───────── */
function MaterialCard({ item }) {
  return (
    <div className="pv-mcard" style={{ width: 300 }}>
      <ModelArt item={item} height={220} />
      <div className="pv-mcard-foot" style={{ margin: 0, padding: '16px 20px', borderTop: '.5px solid var(--border)' }}>
        <div>
          <div className="pv-mcard-meta" style={{ margin: '0 0 10px' }}>{matMeta(item)}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="pv-mcard-price">R$ {item.price}</span>
            <span className="pv-mcard-link">Ver material →</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────── CARD DE CURSO (catálogo, regra de cor do brief) ───────── */
function CourseCard({ item }) {
  return (
    <div className="pv-ccard">
      <div className="pv-ccard-core">
        <div className="pv-ccard-top">
          <span className="pv-ccard-level" style={{ color: item.accent }}>◆ {item.level}</span>
          {item.aoVivo && <span className="pv-ccard-live" style={{ background: item.accent }}>● AO VIVO</span>}
        </div>
        <div className="pv-ccard-title">{item.title}</div>
        <div className="pv-ccard-desc">{item.desc}</div>
      </div>
      <div className="pv-ccard-foot">
        <div className="pv-ccard-metarow">
          <span className="pv-dot" style={{ background: item.accent }}></span>
          {item.weeks} semanas{item.mentoria ? ' · Mentoria inclusa' : ''}
        </div>
        <div className="pv-ccard-botrow">
          <span style={{ color: item.accent }}>ETAPA {String(item.etapa).padStart(2, '0')}</span>
          <span className="pv-ccard-link">Detalhes →</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── CARD DE MENTORIA ───────── */
function MentoriaCard({ item }) {
  return (
    <div className="pv-ccard">
      <div className="pv-ccard-core">
        <div className="pv-ccard-top">
          <span className="pv-ccard-level" style={{ color: item.accent }}>◇ MENTORIA</span>
          <span className="pv-ccard-live" style={{ background: item.accent }}>● ACOMPANHADA</span>
        </div>
        <div className="pv-ccard-title">{item.title}</div>
        <div className="pv-ccard-desc">{item.desc}</div>
      </div>
      <div className="pv-ccard-foot">
        <div className="pv-ccard-metarow">
          <span className="pv-dot" style={{ background: item.accent }}></span>
          {item.formato}
        </div>
        <div className="pv-ccard-botrow">
          <span style={{ color: item.accent }}>{item.cadencia}</span>
          <span className="pv-ccard-link">Quero participar →</span>
        </div>
      </div>
    </div>
  );
}

/* ───────── CARD DE EVENTO ───────── */
function EventoCard({ item }) {
  return (
    <div className="pv-mcard">
      <div className="pv-mcard-mediawrap">
        <CardMedia item={item} labelOverride="EVENTO" />
      </div>
      <div className="pv-mcard-body">
        <div className="pv-mcard-eyebrow" style={{ color: item.accent }}>◆ {item.data}</div>
        <div className="pv-mcard-title">{item.title}</div>
        <div className="pv-mcard-meta">{item.local} · {item.vagas} vagas</div>
        <div className="pv-mcard-foot">
          <span className="pv-mcard-price" style={{ fontSize: 14 }}>{item.inscritos} inscritos</span>
          <span className="pv-mcard-link">Garantir vaga →</span>
        </div>
      </div>
    </div>
  );
}

function CatalogCardPreview({ item }) {
  if (item.type === 'material') return <MaterialCard item={item} />;
  if (item.type === 'curso') return <CourseCard item={item} />;
  if (item.type === 'mentoria') return <MentoriaCard item={item} />;
  if (item.type === 'evento') return <EventoCard item={item} />;
  return null;
}

/* ───────── PÁGINA DE DETALHE (mini, como o visitante vê) ───────── */
function DetailPreview({ item }) {
  const isMaterial = item.type === 'material';
  const isCurso = item.type === 'curso';
  const isMentoria = item.type === 'mentoria';
  const isEvento = item.type === 'evento';
  const meta = [item.messages ? `${item.messages} mensagens` : null, item.pages ? `${item.pages} páginas` : null, item.format].filter(Boolean).join(' · ');

  return (
    <div className="pv-detail">
      <div className="pv-detail-nav">
        <span className="pv-detail-logo">CE<span className="pv-ol">.X</span></span>
        <span className="pv-detail-navlinks">Início · Materiais · Cursos · Sobre</span>
      </div>
      {isMaterial
        ? <ModelArt item={item} height={180} />
        : <CardMedia item={item} height={180} big labelOverride={item.level || item.type} />}
      <div className="pv-detail-body">
        <div className="pv-detail-eyebrow" style={{ color: item.accent }}>
          {isCurso ? `◆ ${item.level} · ETAPA ${String(item.etapa).padStart(2, '0')} DE ${item.totalEtapas}` :
           isMentoria ? '◇ MENTORIA ACOMPANHADA' :
           isEvento ? `◆ ${item.data}` :
           `◆ ${item.shelf}`}
          {(isCurso) && <span className="pv-ccard-live" style={{ background: item.accent, marginLeft: 10 }}>● AO VIVO</span>}
        </div>
        <h1 className="pv-detail-title">{item.title}</h1>
        <p className="pv-detail-promise">{item.desc}</p>

        {isMaterial && (
          <>
            {item.paraQuem && (<>
              <div className="pv-detail-sec">◆ Pra quem é</div>
              <p className="pv-detail-promise" style={{ fontSize: 13 }}>{item.paraQuem}</p>
            </>)}
            <div className="pv-detail-sec">◆ O que vem dentro</div>
            {(item.contents || []).length > 0 ? (
              <ul className="pv-detail-list pv-contents">
                {item.contents.map((c, i) => (
                  <li key={i}>
                    <strong style={{ color: 'var(--cream)' }}>{contentName(c)}</strong>
                    {c.note ? <span style={{ color: 'var(--muted)' }}> — {c.note}</span> : null}
                    <span className="pv-content-meta">{contentMeta(c)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className="pv-detail-list"><li>{meta}</li></ul>
            )}
            {(item.beneficios || []).filter(Boolean).length > 0 && (
              <ul className="pv-detail-list" style={{ marginTop: 4 }}>
                {(item.beneficios || []).filter(Boolean).map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            )}
            {(item.messageList || []).some((m) => m && m.nome) && (<>
              <div className="pv-detail-sec">◆ As {item.messages} mensagens</div>
              <ul className="pv-detail-list">
                {item.messageList.filter((m) => m && m.nome).map((m, i) => (
                  <li key={i}>
                    <span style={{ color: item.accent, fontFamily: 'var(--mono)', marginRight: 8 }}>{String(i + 1).padStart(2, '0')}</span>
                    <strong style={{ color: 'var(--cream)' }}>{m.nome}</strong>
                    {m.desc ? <span style={{ color: 'var(--muted)' }}> · {m.desc}</span> : null}
                  </li>
                ))}
              </ul>
            </>)}
            {(item.faq || []).some((f) => f && f.q) && (<>
              <div className="pv-detail-sec">◆ Perguntas frequentes</div>
              <div className="pv-faq">
                {item.faq.filter((f) => f && f.q).map((f, i) => (
                  <div key={i}>
                    <div className="pv-faq-q">{f.q}</div>
                    {f.a && <div className="pv-faq-a">{f.a}</div>}
                  </div>
                ))}
              </div>
            </>)}
            {(item.tags || []).length > 0 && (
              <div className="pv-tags">{item.tags.map((t, i) => <span className="pv-tag" key={i}>{t}</span>)}</div>
            )}
            <div className="pv-detail-buybar">
              <span className="pv-detail-price">R$ {item.price}</span>
              <span className="pv-detail-buy">COMPRAR →</span>
            </div>
            <div className="pv-detail-hot">Abre Hotmart: <code>{item.hotmart}</code></div>
          </>
        )}

        {(isCurso) && (
          <>
            {item.paraQuem && (<>
              <div className="pv-detail-sec">◆ Pra quem é</div>
              <p className="pv-detail-promise" style={{ fontSize: 13 }}>{item.paraQuem}</p>
            </>)}
            <div className="pv-detail-sec">◆ Ementa por semana</div>
            <ul className="pv-detail-list">
              {item.ementa.map((e, i) => <li key={i}><span style={{ color: item.accent, fontFamily: 'var(--mono)', marginRight: 8 }}>S{i + 1}</span>{e}</li>)}
            </ul>
            <div className="pv-detail-sec">◆ Como é</div>
            <p className="pv-detail-promise" style={{ fontSize: 13 }}>{item.weeks} semanas de encontros ao vivo · mentoria inclusa · conduzido por {item.mentor}.</p>
            <div className="pv-detail-buybar">
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>{item.proximaTurma} · vaga limitada</span>
              <span className="pv-detail-buy" style={{ background: item.accent }}>Entrar na lista de espera →</span>
            </div>
          </>
        )}

        {isMentoria && (
          <>
            <div className="pv-detail-sec">◆ Como funciona</div>
            <ul className="pv-detail-list">
              <li>{item.formato}</li>
              <li>{item.cadencia}</li>
              <li>Conduzida por {item.mentor}</li>
            </ul>
            <div className="pv-detail-buybar">
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--muted)' }}>Vagas limitadas</span>
              <span className="pv-detail-buy" style={{ background: item.accent }}>Quero ser mentorado →</span>
            </div>
          </>
        )}

        {isEvento && (
          <>
            <div className="pv-detail-sec">◆ O evento</div>
            <ul className="pv-detail-list">
              <li>{item.data}</li>
              <li>{item.local}</li>
              <li>{item.vagas} vagas · {item.inscritos} inscritos</li>
            </ul>
            <div className="pv-detail-buybar">
              <span className="pv-detail-price" style={{ fontSize: 18 }}>Inscrições abertas</span>
              <span className="pv-detail-buy">Garantir vaga →</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────── BANNER DE DIVULGAÇÃO (1:1 Instagram) ───────── */
function BannerPreview({ item }) {
  const isMaterial = item.type === 'material';
  const isCurso = item.type === 'curso';
  const tag = isCurso ? item.level : isMaterial ? item.shelf : item.type === 'mentoria' ? 'Mentoria' : 'Evento';
  const model = isMaterial ? (item.model || 'A') : 'A';
  const big = item.big || item.messages || item.pages;
  const bg = (model === 'D' && isMaterial)
    ? (item.image
        ? { backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
        : { background: `radial-gradient(120% 80% at 28% 18%, ${item.accent} 0%, var(--ink) 60%)` })
    : null;
  return (
    <div className="pv-banner" style={bg || undefined}>
      {model === 'D' && isMaterial && <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg,rgba(14,17,13,.2),rgba(14,17,13,.85))' }}></div>}
      <div className="pv-art-grid"></div>
      {model !== 'D' && <div className="pv-banner-x" style={{ color: item.accent }}>X</div>}
      <div className="pv-banner-top">
        <span className="pv-detail-logo" style={{ fontSize: 24 }}>CE<span className="pv-ol">.X</span></span>
        {isCurso && <span className="pv-ccard-live" style={{ background: item.accent }}>● AO VIVO</span>}
      </div>
      <div className="pv-banner-mid">
        {model === 'B' ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: item.accent, color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', padding: '6px 10px', borderRadius: 4, marginBottom: 14 }}>◆ {String(tag).toUpperCase()}</div>
        ) : (
          <div className="pv-banner-eyebrow" style={{ color: model === 'D' ? 'var(--cream-soft)' : item.accent }}>◆ {String(tag).toUpperCase()}</div>
        )}
        {model === 'C' && big && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
            <span style={{ fontFamily: 'var(--sans)', fontWeight: 800, fontSize: 80, lineHeight: .8, color: item.accent, letterSpacing: '-.05em' }}>{big}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--muted)' }}>{item.bigLabel || ''}</span>
          </div>
        )}
        <div className="pv-banner-title">{item.title}</div>
        <div className="pv-banner-desc">{item.desc}</div>
      </div>
      <div className="pv-banner-bot">
        <span>
          {isMaterial ? `PDF EDITÁVEL · R$ ${item.price}` :
           isCurso ? `${item.weeks} SEMANAS · MENTORIA INCLUSA` :
           item.type === 'mentoria' ? String(item.formato).toUpperCase() :
           String(item.data).toUpperCase()}
        </span>
        <span style={{ color: item.accent }}>
          {isMaterial ? 'campusexpansao.com →' : isCurso ? 'LISTA DE ESPERA ABERTA →' : 'INSCREVA-SE →'}
        </span>
      </div>
    </div>
  );
}

Object.assign(window, { AutoArt, CardMedia, MaterialCard, CourseCard, MentoriaCard, EventoCard, CatalogCardPreview, DetailPreview, BannerPreview });
