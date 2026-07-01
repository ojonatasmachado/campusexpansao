/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · FORMULÁRIOS DE CRIAÇÃO (CreateHost + FormModal)
   Os botões "+ Novo ___" disparam cexCreate('membro'|'time'|...).
   Aqui o registro é criado de verdade em window.SVC e as listas
   se atualizam (cexRefresh). Linguagem amigável.
   ════════════════════════════════════════════════════════════════ */

/* ─── DATE PICKER (dia + mês, sem digitar) ─── */
const DP_MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const DP_MESES_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DP_DIAS_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function DatePicker({ value, onChange }) {
  // value = "DD mmm" (ex "12 mar")
  const parse = () => {
    if (!value) return { d: null, m: 0 };
    const p = value.split(' ');
    const mi = DP_MESES.findIndex((x) => x.toLowerCase() === (p[1] || '').toLowerCase());
    return { d: parseInt(p[0], 10) || null, m: mi < 0 ? 0 : mi };
  };
  const init = parse();
  const [open, setOpen] = useState(false);
  const [mes, setMes] = useState(init.m);
  const dia = init.d;
  const pick = (d) => { onChange(d + ' ' + DP_MESES[mes].toLowerCase()); setOpen(false); };
  return (
    <div className="dp">
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={value ? '' : 'dp-ph'}>{value ? `${dia} de ${DP_MESES_FULL[mes]}` : 'Escolher dia e mês'}</span>
        <span className="dp-ic">▾</span>
      </button>
      {open && (
        <div className="dp-pop">
          <div className="dp-head">
            <button type="button" onClick={() => setMes((m) => (m + 11) % 12)}>‹</button>
            <span>{DP_MESES_FULL[mes]}</span>
            <button type="button" onClick={() => setMes((m) => (m + 1) % 12)}>›</button>
          </div>
          <div className="dp-grid">
            {Array.from({ length: DP_DIAS_MES[mes] }, (_, i) => i + 1).map((d) => (
              <button type="button" key={d} className={`dp-day ${dia === d && init.m === mes ? 'on' : ''}`} onClick={() => pick(d)}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── seletor de ícone (popup, ícones SVG da identidade) ─── */
const ICON_OPCOES = ['times', 'louvor', 'recepcao', 'kids', 'midia', 'diaconia', 'intercessao', 'oracao', 'pessoa', 'membros', 'cultos', 'agenda', 'comunicacao', 'conversas', 'cursos', 'tarefas', 'espacos', 'quadros', 'sino', 'globo', 'batismos', 'decisoes', 'enviar', 'relatorios'];
function IconPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const valido = value && window.CEX_ICONS && window.CEX_ICONS[value];
  return (
    <div className="dp">
      <button type="button" className="iconpick-trigger" onClick={() => setOpen((o) => !o)}>
        <span className="iconpick-cur"><Icon name={valido ? value : 'times'} size={18} /></span>
        <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)' }}>{valido ? 'Trocar ícone' : 'Escolher ícone'}</span>
        <span className="dp-ic">▾</span>
      </button>
      {open && (
        <div className="iconpick-pop">
          <div className="icon-pick">
            {ICON_OPCOES.map((nome) => (
              <button type="button" key={nome} className={`icon-opt ${value === nome ? 'on' : ''}`} title={nome} onClick={() => { onChange(nome); setOpen(false); }}><Icon name={nome} size={18} /></button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── editor de funções (nome + responsabilidade, reutilizáveis) ─── */
function FuncoesEditor({ value, onChange }) {
  // value = array de { nome, resp }
  const lista = Array.isArray(value) ? value : [];
  const [nome, setNome] = useState('');
  const [resp, setResp] = useState('');
  // funções já usadas em outros times (reutilizar)
  const sugeridas = [];
  (S.TIMES || []).forEach((t) => (t.funcoesDet || []).forEach((fd) => {
    if (fd.nome && !sugeridas.some((s) => s.nome === fd.nome) && !lista.some((l) => l.nome === fd.nome)) sugeridas.push(fd);
  }));
  const add = (n, r) => {
    const nn = (n || nome).trim(); if (!nn) return;
    if (lista.some((l) => l.nome.toLowerCase() === nn.toLowerCase())) return;
    onChange([...lista, { nome: nn, resp: (r != null ? r : resp).trim() }]);
    setNome(''); setResp('');
  };
  const rem = (i) => onChange(lista.filter((_, x) => x !== i));
  return (
    <div className="func-ed">
      {lista.length > 0 && (
        <div className="func-list">
          {lista.map((fn, i) => (
            <div className="func-item" key={i}>
              <div className="func-item-main">
                <div className="func-item-nome">{fn.nome}</div>
                {fn.resp && <div className="func-item-resp">{fn.resp}</div>}
              </div>
              <button type="button" className="ce-x" onClick={() => rem(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      {sugeridas.length > 0 && (
        <div className="func-sug">
          <span className="func-sug-t">Reaproveitar:</span>
          {sugeridas.slice(0, 8).map((fd, i) => <button type="button" key={i} className="seg-chip" onClick={() => add(fd.nome, fd.resp)}>+ {fd.nome}</button>)}
        </div>
      )}
      <div className="func-add">
        <input className="input" placeholder="Nome da função (ex: Vocal)" value={nome} onChange={(e) => setNome(e.target.value)} />
        <input className="input" placeholder="Responsabilidade específica (opcional)" value={resp} onChange={(e) => setResp(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button type="button" className="btn btn-sec btn-sm" onClick={() => add()}>+ Adicionar função</button>
      </div>
    </div>
  );
}

/* ─── recorrência padrão (usada em toda a ferramenta) ─── */
const RECOR_OPTS = [
  { v: 'semanal', l: 'Semanal' },
  { v: 'quinzenal', l: 'Quinzenal' },
  { v: 'mensal', l: 'Mensal' },
  { v: 'bimestral', l: 'Bimestral' },
  { v: 'trimestral', l: 'Trimestral' },
  { v: 'eventual', l: 'Eventual' },
];

/* ─── time picker (rola hora e minuto, passo de 15min) ─── */
function TimePicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const p = (value || '').match(/(\d{1,2})[h:](\d{2})/);
  const hh = p ? +p[1] : 19;
  const mm = p ? +p[2] : 0;
  const set = (h, m) => onChange(String(h).padStart(2, '0') + 'h' + String(m).padStart(2, '0'));
  return (
    <div className="dp">
      <button type="button" className="dp-trigger" onClick={() => setOpen((o) => !o)}>
        <span className={value ? '' : 'dp-ph'}>{value || 'Escolher horário'}</span>
        <span className="dp-ic">▾</span>
      </button>
      {open && (
        <div className="dp-pop tp-pop">
          <div className="tp-col">
            <div className="tp-col-h">Hora</div>
            <div className="tp-scroll">
              {Array.from({ length: 24 }, (_, h) => h).map((h) => (
                <button type="button" key={h} className={`tp-opt ${hh === h ? 'on' : ''}`} onClick={() => set(h, mm)}>{String(h).padStart(2, '0')}</button>
              ))}
            </div>
          </div>
          <div className="tp-col">
            <div className="tp-col-h">Min</div>
            <div className="tp-scroll">
              {[0, 15, 30, 45].map((m) => (
                <button type="button" key={m} className={`tp-opt ${mm === m ? 'on' : ''}`} onClick={() => { set(hh, m); setOpen(false); }}>{String(m).padStart(2, '0')}</button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── repertório (louvores: nome, ordem, tom, youtube, cifra) ─── */
function RepertorioEditor({ value, onChange }) {
  const lista = Array.isArray(value) ? value : [];
  const [titulo, setTitulo] = useState('');
  const [tom, setTom] = useState('');
  const [youtube, setYoutube] = useState('');
  const [cifra, setCifra] = useState('');
  const add = () => { if (!titulo.trim()) return; onChange([...lista, { titulo: titulo.trim(), tom: tom.trim(), youtube: youtube.trim(), cifra: cifra.trim() }]); setTitulo(''); setTom(''); setYoutube(''); setCifra(''); };
  const rem = (i) => onChange(lista.filter((_, x) => x !== i));
  const move = (i, d) => { const j = i + d; if (j < 0 || j >= lista.length) return; const c = lista.slice(); const t = c[i]; c[i] = c[j]; c[j] = t; onChange(c); };
  return (
    <div className="anx">
      {lista.length > 0 && (
        <div className="setlist-list" style={{ marginBottom: 12 }}>
          {lista.map((s, i) => (
            <div className="setlist-row" key={i}>
              <span className="setlist-n">{String(i + 1).padStart(2, '0')}</span>
              <span className="setlist-titulo">{s.titulo}</span>
              {s.tom && <span className="setlist-tom">{s.tom}</span>}
              {s.youtube && <span className="setlist-link">vídeo</span>}
              {s.cifra && <span className="setlist-link">cifra</span>}
              <span className="setlist-ord">
                <button type="button" className="setlist-mv" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                <button type="button" className="setlist-mv" disabled={i === lista.length - 1} onClick={() => move(i, 1)}>↓</button>
                <button type="button" className="setlist-x" onClick={() => rem(i)}>✕</button>
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="setlist-add">
        <input className="input" placeholder="Nome do louvor" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <input className="input setlist-tom-in" placeholder="Tom" value={tom} onChange={(e) => setTom(e.target.value)} />
        <input className="input" placeholder="Link do YouTube" value={youtube} onChange={(e) => setYoutube(e.target.value)} />
        <input className="input" placeholder="Link do CifraClub" value={cifra} onChange={(e) => setCifra(e.target.value)} />
        <button type="button" className="btn btn-sec btn-sm" onClick={add}>+ Louvor</button>
      </div>
    </div>
  );
}

/* ─── anexos: links (YouTube/CifraClub/...) + arquivos ─── */
function AnexosEditor({ value, onChange }) {
  const lista = Array.isArray(value) ? value : [];
  const [link, setLink] = useState('');
  const ref = useRef(null);
  const tipoDe = (url) => /youtu/i.test(url) ? 'YouTube' : /cifraclub/i.test(url) ? 'CifraClub' : /spotify/i.test(url) ? 'Spotify' : 'Link';
  const addLink = () => { const u = link.trim(); if (!u) return; onChange([...lista, { kind: 'link', tipo: tipoDe(u), url: u, nome: u.replace(/^https?:\/\/(www\.)?/, '').slice(0, 40) }]); setLink(''); };
  const addArquivo = (file) => { if (!file) return; onChange([...lista, { kind: 'file', tipo: (file.name.split('.').pop() || 'arquivo').toUpperCase(), nome: file.name }]); };
  const rem = (i) => onChange(lista.filter((_, x) => x !== i));
  return (
    <div className="anx">
      {lista.length > 0 && (
        <div className="anx-list">
          {lista.map((a, i) => (
            <div className="anx-item" key={i}>
              <span className="anx-tag">{a.kind === 'file' ? '▣' : '▷'} {a.tipo}</span>
              <span className="anx-nome">{a.nome}</span>
              <button type="button" className="ce-x" onClick={() => rem(i)}>✕</button>
            </div>
          ))}
        </div>
      )}
      <div className="anx-add">
        <input className="input" placeholder="Colar link (YouTube, CifraClub, Spotify...)" value={link} onChange={(e) => setLink(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLink())} />
        <button type="button" className="btn btn-sec btn-sm" onClick={addLink}>+ Link</button>
        <button type="button" className="btn btn-sec btn-sm" onClick={() => ref.current && ref.current.click()}>▣ Arquivo</button>
        <input ref={ref} type="file" hidden onChange={(e) => addArquivo(e.target.files[0])} />
      </div>
    </div>
  );
}

/* ─── people picker: busca + ministérios inteiros/parciais ─── */
function PeoplePicker({ value, onChange }) {
  const sel = Array.isArray(value) ? value : [];
  const [q, setQ] = useState('');
  const tog = (pid) => onChange(sel.includes(pid) ? sel.filter((x) => x !== pid) : [...sel, pid]);
  const togTime = (tid, on) => {
    const ids = S.PESSOAS.filter((p) => p.times.includes(tid)).map((p) => p.id);
    onChange(on ? sel.filter((x) => !ids.includes(x)) : [...new Set([...sel, ...ids])]);
  };
  const timeAllIn = (tid) => { const ids = S.PESSOAS.filter((p) => p.times.includes(tid)).map((p) => p.id); return ids.length > 0 && ids.every((i) => sel.includes(i)); };
  const filtrados = S.PESSOAS.filter((p) => !q || p.nome.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="pp">
      <div className="pp-times">
        {S.TIMES.map((t) => { const on = timeAllIn(t.id); return (
          <button type="button" key={t.id} className={`seg-chip ${on ? 'on' : ''}`} onClick={() => togTime(t.id, on)}><TeamMark t={t} size={13} style={{ verticalAlign: '-2px' }} /> {t.nome.split(' ')[0]}</button>
        ); })}
      </div>
      <div className="tb-search pp-search"><span className="si">⌕</span><input placeholder="Buscar pessoa pelo nome..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="pp-list">
        {filtrados.map((p) => {
          const on = sel.includes(p.id);
          return (
            <button type="button" className={`flag-row ${on ? 'on' : ''}`} key={p.id} onClick={() => tog(p.id)}>
              <span className={`flag-check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
              <Av nome={p.nome} size="sm" fotoId={p.volId} />
              <div className="flag-main"><div className="flag-nome">{p.nome}</div><div className="flag-meta">{p.times.map((t) => { const tt = tById(t); return tt ? tt.nome.split(' ')[0] : ''; }).filter(Boolean).join(' · ') || 'Sem time'}</div></div>
            </button>
          );
        })}
      </div>
      <div className="pp-count">{sel.length} selecionada(s)</div>
    </div>
  );
}

/* ─── campo genérico ─── */
function FField({ f, value, set }) {
  if (f.type === 'area')
    return <textarea className="textarea" value={value || ''} placeholder={f.ph} onChange={(e) => set(e.target.value)} style={f.big ? { minHeight: 110 } : null} />;
  if (f.type === 'select')
    return (
      <select className="select" value={value || ''} onChange={(e) => set(e.target.value)}>
        {f.ph && <option value="">{f.ph}</option>}
        {f.options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    );
  if (f.type === 'toggle')
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button type="button" className={`sw ${value ? 'on' : ''}`} onClick={() => set(!value)}></button>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>{value ? (f.onLabel || 'Sim') : (f.offLabel || 'Não')}</span>
      </div>
    );
  if (f.type === 'checks') {
    const arr = value || [];
    const tog = (v) => set(arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
    return (
      <div className="seg-check">
        {f.options.length === 0 && <span style={{ fontSize: 12, color: 'var(--subtle)' }}>Nenhuma opção ainda.</span>}
        {f.options.map((o) => <button type="button" key={o.v} className={`seg-chip ${arr.includes(o.v) ? 'on' : ''}`} onClick={() => tog(o.v)}>{o.l}</button>)}
      </div>
    );
  }
  if (f.type === 'date') {
    return <DatePicker value={value} onChange={set} />;
  }
  if (f.type === 'time') {
    return <TimePicker value={value} onChange={set} />;
  }
  if (f.type === 'anexos') {
    return <AnexosEditor value={value} onChange={set} />;
  }
  if (f.type === 'repertorio') {
    return <RepertorioEditor value={value} onChange={set} />;
  }
  if (f.type === 'people') {
    return <PeoplePicker value={value} onChange={set} />;
  }
  if (f.type === 'icon') {
    return <IconPicker value={value} onChange={set} />;
  }
  if (f.type === 'funcoes') {
    return <FuncoesEditor value={value} onChange={set} />;
  }
  if (f.type === 'tags') {
    return <input className="input" value={value || ''} placeholder={f.ph} onChange={(e) => set(e.target.value)} />;
  }
  return <input className="input" value={value || ''} placeholder={f.ph} onChange={(e) => set(e.target.value)} />;
}

function FormModal({ title, sub, fields, initial, saveLabel, onSave, onClose }) {
  const [v, setV] = useState(initial);
  const [err, setErr] = useState('');
  const set = (k, val) => setV((p) => ({ ...p, [k]: val }));
  const go = () => {
    const vis = fields.filter((f) => !f.showIf || f.showIf(v));
    const faltando = vis.filter((f) => f.req && !String(v[f.k] || '').trim());
    if (faltando.length) { setErr('Preencha: ' + faltando.map((f) => f.label).join(', ')); return; }
    onSave(v); onClose();
  };
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Criar</div>
          <div className="modal-title">{title}</div>
          {sub && <div className="modal-sub">{sub}</div>}
        </div>
        <div className="modal-body">
          {fields.filter((f) => !f.showIf || f.showIf(v)).map((f) => (
            <div className={`field ${f.half ? 'field-half' : ''}`} key={f.k}>
              <label className="field-label">{f.label}{f.req && <span style={{ color: 'var(--olive)' }}> *</span>}</label>
              <FField f={f} value={v[f.k]} set={(val) => set(f.k, val)} />
              {f.hint && <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>{f.hint}</div>}
            </div>
          ))}
          {err && <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 4 }}>{err}</div>}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" onClick={onClose}>Cancelar</button>
          <button className="btn btn-pri" onClick={go}>{saveLabel || 'Criar'}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── esquemas por tipo ─── */
const ANO = new Date().getFullYear();
function schema(kind, opts) {
  const G = (S.grp && S.grp()) || { ativo: true, termo: 'Grupo', termoP: 'Grupos' };
  const pessoasOpts = S.PESSOAS.map((p) => ({ v: p.id, l: p.nome }));
  const gcOpts = [{ v: '', l: 'Sem ' + G.termo + ' ainda' }, ...S.GCS.map((g) => ({ v: g.id, l: g.nome }))];
  const cursoOpts = S.CURSOS.map((c) => ({ v: c.id, l: c.nome }));

  if (kind === 'membro') return {
    title: 'Novo membro', sub: 'Cadastro de quem já é da casa. Os dados completos liberam o acesso ao app.', saveLabel: 'Adicionar membro',
    fields: [
      { k: 'nome', label: 'Nome completo', type: 'text', req: true, ph: 'Como a pessoa se chama' },
      { k: 'tel', label: 'Telefone (WhatsApp)', type: 'text', half: true, req: true, ph: '(11) 9...', hint: 'Os 4 últimos dígitos viram a senha inicial do app.' },
      { k: 'email', label: 'E-mail', type: 'text', half: true, req: true, ph: 'usado para entrar no app' },
      { k: 'nasc', label: 'Aniversário', type: 'date', half: true },
      ...(G.ativo ? [{ k: 'gc', label: G.termo, type: 'select', half: true, options: gcOpts }] : []),
      { k: 'bairro', label: 'Bairro', type: 'text', half: true, ph: 'Onde mora' },
      { k: 'papel', label: 'Cargo ministerial (opcional)', type: 'select', half: true, options: [{ v: '', l: 'Nenhum' }, ...((S.PAPEIS_IGREJA || []).map((p) => ({ v: p, l: p })))] },
    ],
    initial: { nome: opts.nome || '', tel: opts.tel || '', email: '', nasc: '', gc: '', bairro: '', papel: '' },
    save: (v) => {
      const tel = v.tel.replace(/\D/g, '');
      S.MEMBROS.unshift({ id: cexId('m'), nome: v.nome, tel: v.tel, email: v.email, nasc: v.nasc, desde: String(ANO), situacao: 'membro', gc: v.gc, bairro: v.bairro, familia: v.nome.split(' ').slice(-1)[0], papel: v.papel || null, volId: null, jornada: [1, 0, 0, 0, 0], senha: tel.slice(-4) });
      return v.nome.split(' ')[0] + ' foi cadastrado. Acesso pelo e-mail, senha = 4 últimos do telefone.';
    },
  };

  if (kind === 'visitante') {
    const eventoOpts = (S.CULTOS || []).map((c) => {
      const d = c.data && c.data !== 'a definir' ? c.data : c.dia;
      return { v: c.nome + ' · ' + d, l: c.nome + ' · ' + d };
    });
    return {
    title: 'Novo visitante', sub: 'Quem chegou pela primeira vez. Entra no acompanhamento e qualquer um da equipe pode dar seguimento.', saveLabel: 'Registrar visitante',
    fields: [
      { k: 'nome', label: 'Nome', type: 'text', req: true, ph: 'Quem visitou' },
      { k: 'tel', label: 'Telefone', type: 'text', half: true, ph: '(11) 9...' },
      { k: 'origem', label: 'Como chegou', type: 'select', half: true, options: ['Convite de membro', 'Instagram', 'Indicação', 'Evangelismo', 'Tomou decisão no culto', 'Passava na rua'].map((o) => ({ v: o, l: o })) },
      { k: 'visitou', label: 'Visitou em', type: 'select', options: eventoOpts.length ? eventoOpts : [{ v: 'Culto', l: 'Culto' }], hint: 'Escolha o culto/evento da primeira vez. A agenda alimenta esta lista.' },
    ],
    initial: { nome: '', tel: '', origem: 'Convite de membro', visitou: (S.CULTOS[0] ? S.CULTOS[0].nome : 'Culto') },
    save: (v) => {
      S.VISITANTES.unshift({ id: cexId('v'), nome: v.nome, tel: v.tel, etapa: 'novo', visitou: v.visitou, resp: null, due: 'Hoje', dueSt: 'soon', origem: v.origem, resposta: null,
        historico: [{ when: 'Hoje', txt: 'Primeira visita registrada · ' + v.visitou + '.', by: 'Recepção', ol: true }] });
      return v.nome.split(' ')[0] + ' está no acompanhamento.';
    },
    };
  }

  if (kind === 'culto') {
    const tipoOpts = (S.TIPOS_EVENTO_CFG || ['Culto']).map((t) => ({ v: t, l: t }));
    tipoOpts.push({ v: '__novo', l: '+ Outro tipo (criar)' });
    const timeOpts = (S.TIMES || []).map((t) => ({ v: t.id, l: t.nome }));
    return {
    title: 'Novo culto ou evento', sub: 'Agenda da igreja: o que é, quando acontece, quem serve e o cronograma.', saveLabel: 'Criar na agenda',
    fields: [
      { k: 'nome', label: 'Nome', type: 'text', req: true, ph: 'ex: Culto da Manhã, Conferência de Jovens' },
      { k: 'tipo', label: 'Tipo de evento', type: 'select', half: true, options: tipoOpts, hint: 'Configure os tipos em Configurações → Tipos de evento.' },
      { k: 'tipoNovo', label: 'Novo tipo (se escolheu "Outro")', type: 'text', half: true, ph: 'nome do novo tipo' },
      { k: 'local', label: 'Local', type: 'text', half: true, ph: 'Templo, Anexo...' },
      { k: 'dia', label: 'Dia da semana', type: 'select', half: true, options: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((o) => ({ v: o, l: o })) },
      { k: 'data', label: 'Data', type: 'text', half: true, ph: 'ex: 29 jun' },
      { k: 'hora', label: 'Horário de início', type: 'text', half: true, ph: 'ex: 19h00' },
      { k: 'recorrencia', label: 'Recorrência', type: 'select', half: true, options: RECOR_OPTS },
      { k: 'slot', label: 'Faixa da escala', type: 'select', half: true, hint: 'Liga à disponibilidade dos voluntários.', options: (S.FAIXAS || []).map((f) => ({ v: f.v, l: f.l })) },
      { k: 'times', label: 'Times necessários', type: 'checks', options: timeOpts, hint: 'Quais ministérios precisam servir neste evento.' },
      { k: 'tags', label: 'Frentes (tags)', type: 'checks', options: (S.TAGS || []).map((t) => ({ v: t.id, l: t.nome })), hint: 'Marque se este evento é de uma frente (Jovens, Kids…). Ao montar a escala, só o elenco da frente aparece no pool. Deixe vazio para a igreja toda.' },
      { k: 'cronograma', label: 'Etapas do cronograma', type: 'tags', ph: 'Abertura, Louvor, Palavra', hint: 'Só os nomes, separados por vírgula. A duração e o horário de cada etapa você ajusta depois — o horário é somado automaticamente a partir do início.' },
    ],
    initial: { nome: '', tipo: (S.TIPOS_EVENTO_CFG || ['Culto'])[0], tipoNovo: '', local: 'Templo', dia: 'Domingo', data: '', hora: '', recorrencia: 'semanal', slot: 'manha', times: [], tags: [], cronograma: '' },
    save: (v) => {
      let tipo = v.tipo;
      if (tipo === '__novo' && v.tipoNovo.trim()) { tipo = v.tipoNovo.trim(); if (!S.TIPOS_EVENTO_CFG.includes(tipo)) S.TIPOS_EVENTO_CFG.push(tipo); }
      const cronograma = (v.cronograma || '').split(',').map((s) => s.trim()).filter(Boolean).map((bloco) => {
        const mt = bloco.match(/^(\d{1,2}[h:]\d{0,2})\s+(.*)$/);
        return { hora: '', dur: 15, item: mt ? mt[2] : bloco, cat: 'outro' };
      });
      S.CULTOS.push({ id: cexId('c'), dia: v.dia, data: v.data || 'a definir', hora: v.hora || 'a definir', nome: v.nome, tipo, slot: v.slot, local: v.local, recorrencia: v.recorrencia, times: v.times || [], tags: v.tags || [], cronograma });
      return v.nome + ' está na agenda.';
    },
    };
  }

  if (kind === 'time') return {
    title: 'Novo time / ministério', sub: 'Crie o ministério e já conte o propósito dele — é isso que conecta voluntários.', saveLabel: 'Criar ministério',
    fields: [
      { k: 'nome', label: 'Nome do ministério', type: 'text', req: true, ph: 'ex: Louvor & Adoração' },
      { k: 'ic', label: 'Marca / ícone', type: 'icon' },
      { k: 'liderId', label: 'Líder', type: 'select', half: true, ph: 'Quem lidera', options: pessoasOpts },
      { k: 'desc', label: 'Descrição curta', type: 'text', ph: 'Uma linha sobre o time' },
      { k: 'funcoesDet', label: 'Funções do time', type: 'funcoes', hint: 'Cada função tem um nome e a responsabilidade. Reaproveite as de outros times.' },
      { k: 'proposito', label: 'Propósito', type: 'area', ph: 'Por que esse time existe?' },
      { k: 'comoTrabalha', label: 'Como o time trabalha', type: 'area', ph: 'Ensaios, rotina, dinâmica' },
      { k: 'chegada', label: 'Horário de chegada', type: 'text', ph: 'ex: 1h antes do culto' },
      { k: 'responsabilidades', label: 'O que se espera', type: 'tags', ph: 'Pontualidade, preparo...', hint: 'Separe por vírgula.' },
      { k: 'preReqs', label: 'Cursos pré-requisito', type: 'checks', options: cursoOpts, hint: 'Cursos que o voluntário precisa concluir antes de servir.' },
      { k: 'aberto', label: 'Recebendo voluntários?', type: 'toggle', onLabel: 'Aberto a novos', offLabel: 'Equipe completa' },
    ],
    initial: { nome: '', ic: 'times', liderId: '', desc: '', funcoesDet: [], proposito: '', comoTrabalha: '', chegada: '', responsabilidades: '', preReqs: [], aberto: true },
    save: (v) => {
      const id = cexId('t');
      const lider = v.liderId ? pById(v.liderId) : null;
      const funcoesDet = v.funcoesDet || [];
      const funcoes = funcoesDet.map((f) => f.nome);
      S.TIMES.push({ id, nome: v.nome, lider: lider ? lider.nome : 'a definir', voluntarios: lider ? 1 : 0, ic: v.ic, desc: v.desc, funcoes, funcoesDet });
      S.TIMES_INFO[id] = {
        proposito: v.proposito, chegada: v.chegada, comoTrabalha: v.comoTrabalha,
        responsabilidades: (v.responsabilidades || '').split(',').map((s) => s.trim()).filter(Boolean),
        preReqs: v.preReqs || [], aberto: !!v.aberto,
      };
      if (lider) { if (!lider.lider.includes(id)) lider.lider.push(id); if (!lider.times.includes(id)) lider.times.push(id); }
      return v.nome + ' foi criado.';
    },
  };

  if (kind === 'grupo') return {
    title: 'Novo grupo de cursos', sub: 'Uma trilha de formação que reúne cursos relacionados.', saveLabel: 'Criar grupo',
    fields: [
      { k: 'nome', label: 'Nome do grupo', type: 'text', req: true, ph: 'ex: Discipulado, Família' },
      { k: 'desc', label: 'Descrição', type: 'text', ph: 'Do que se trata' },
    ],
    initial: { nome: '', desc: '' },
    save: (v) => { S.CURSO_GRUPOS.push({ id: cexId('g'), nome: v.nome, desc: v.desc }); return 'Grupo "' + v.nome + '" criado.'; },
  };

  if (kind === 'curso') return {
    title: 'Novo curso', sub: 'Defina o grupo, o tipo e o que a pessoa precisa concluir antes de se inscrever.', saveLabel: 'Criar curso',
    fields: [
      { k: 'nome', label: 'Nome do curso', type: 'text', req: true, ph: 'ex: Fundamentos da Fé' },
      { k: 'grupo', label: 'Grupo', type: 'select', half: true, options: (S.CURSO_GRUPOS || []).map((g) => ({ v: g.id, l: g.nome })) },
      { k: 'tipo', label: 'Tipo', type: 'select', half: true, options: [{ v: 'trilha', l: 'Trilha (módulos)' }, { v: 'conteudo', l: 'Conteúdo no app' }, { v: 'presencial', l: 'Presencial' }] },
      { k: 'nivel', label: 'Nível', type: 'text', half: true, ph: 'ex: Entrada, Discipulado' },
      { k: 'cor', label: 'Cor', type: 'select', half: true, options: [{ v: 'olive', l: 'Oliva' }, { v: 'wheat', l: 'Trigo' }, { v: 'clay', l: 'Clay' }] },
      { k: 'desc', label: 'Descrição', type: 'area', ph: 'Para quem é e o que vão aprender' },
      { k: 'preReqs', label: 'Pré-requisitos para se inscrever', type: 'checks', options: cursoOpts, hint: 'Cursos que a pessoa precisa concluir antes deste.' },
    ],
    initial: { nome: '', grupo: opts.grupo || (S.CURSO_GRUPOS[0] && S.CURSO_GRUPOS[0].id) || 'entrada', tipo: 'trilha', nivel: 'Entrada', cor: 'olive', desc: '', preReqs: [] },
    save: (v) => {
      S.CURSOS.push({ id: cexId('cs'), nome: v.nome, tipo: v.tipo, nivel: v.nivel, cor: v.cor, desc: v.desc,
        capa: ({ trilha: 'Trilha', conteudo: 'Conteúdo no app', presencial: 'Presencial' })[v.tipo] + ' · novo',
        modulos: [], matriculados: 0, concluintes: 0, grupo: v.grupo, preReqs: v.preReqs || [] });
      return 'Curso "' + v.nome + '" criado.';
    },
  };

  if (kind === 'gc') {
    const g = (S.grp && S.grp()) || { termo: 'Grupo' };
    return {
      title: 'Novo ' + g.termo, sub: 'Um grupo que se reúne numa casa. Defina líder, dia e bairro.', saveLabel: 'Criar ' + g.termo,
      fields: [
        { k: 'nome', label: 'Nome do grupo', type: 'text', req: true, ph: 'ex: ' + g.termo + ' Vila Aurora' },
        { k: 'lider', label: 'Líder', type: 'select', half: true, ph: 'Quem lidera', options: pessoasOpts },
        { k: 'dia', label: 'Dia', type: 'select', half: true, options: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((o) => ({ v: o, l: o })) },
        { k: 'hora', label: 'Horário', type: 'text', half: true, ph: 'ex: 20h' },
        { k: 'bairro', label: 'Bairro', type: 'text', half: true, ph: 'Onde se reúne' },
      ],
      initial: { nome: '', lider: '', dia: 'Terça', hora: '20h', bairro: '' },
      save: (v) => { S.GCS.push({ id: cexId('gc'), nome: v.nome, lider: v.lider, dia: v.dia, hora: v.hora, bairro: v.bairro }); return v.nome + ' criado.'; },
    };
  }

  if (kind === 'congregacao') {
    return {
      title: 'Nova congregação', sub: 'Uma nova unidade da rede, ligada à matriz. Terá seus próprios times e escalas.', saveLabel: 'Adicionar congregação',
      fields: [
        { k: 'nome', label: 'Nome da congregação', type: 'text', req: true, ph: 'ex: CE.X Zona Leste' },
        { k: 'cidade', label: 'Cidade / bairro', type: 'text', half: true, ph: 'Onde fica' },
        { k: 'pastor', label: 'Pastor responsável', type: 'text', half: true, ph: 'Quem lidera' },
      ],
      initial: { nome: '', cidade: '', pastor: '' },
      save: (v) => { S.CONGREGACOES.push({ id: cexId('cong'), nome: v.nome, cidade: v.cidade, membros: 0, matriz: false, pastor: v.pastor }); return v.nome + ' entrou na rede.'; },
    };
  }

  if (kind === 'ensaio') {
    return {
      title: 'Novo ensaio', sub: 'Louvor, teatro, dança, coreografia… Escolha quem participa e anexe o material certo: repertório (com tom e cifra) para música, vídeos e documentos para o resto.', saveLabel: 'Criar ensaio',
      fields: [
        { k: 'titulo', label: 'Nome do ensaio', type: 'text', req: true, ph: 'ex: Ensaio do Louvor, Ensaio da peça de Natal' },
        { k: 'tipo', label: 'Tipo de ensaio', type: 'select', half: true, options: [
          { v: 'louvor', l: 'Louvor / música' }, { v: 'teatro', l: 'Teatro' }, { v: 'danca', l: 'Dança' },
          { v: 'coreografia', l: 'Coreografia' }, { v: 'geral', l: 'Geral' }, { v: 'outro', l: 'Outro' },
        ] },
        { k: 'publico', label: 'Quem participa (música)', type: 'select', half: true, showIf: (v) => v.tipo === 'louvor' || v.tipo === 'geral', options: [{ v: 'musicos', l: 'Só músicos' }, { v: 'ministros', l: 'Só ministros' }, { v: 'todos', l: 'Time todo' }], hint: 'Atalho para ensaios de música. Nos demais, escolha as pessoas manualmente abaixo.' },
        { k: 'data', label: 'Dia', type: 'date', half: true, hint: 'Escolha no calendário.' },
        { k: 'hora', label: 'Horário', type: 'time', half: true },
        { k: 'local', label: 'Local', type: 'text', half: true, ph: 'Templo, Sala 2...' },
        { k: 'recorrencia', label: 'Recorrência', type: 'select', half: true, options: RECOR_OPTS },
        { k: 'vezes', label: 'Quantas vezes (se eventual)', type: 'text', half: true, ph: 'ex: 3', hint: 'Deixe vazio para uma vez só.' },
        { k: 'presentes', label: 'Participantes', type: 'people', hint: 'Monte a lista manualmente — pessoa a pessoa ou por time inteiro. Serve para qualquer ensaio: louvor, teatro, dança, coreografia.' },
        { k: 'repertorio', label: 'Repertório (louvores, tom, cifra, vídeo)', type: 'repertorio', hint: 'Para ensaios de música. Defina a ordem com ↑ ↓.' },
        { k: 'anexos', label: 'Materiais (vídeos, documentos, roteiros)', type: 'anexos', hint: 'Links do YouTube ou arquivos — útil para teatro, dança e coreografia.' },
        { k: 'obs', label: 'Observação', type: 'area', ph: 'Detalhes do ensaio' },
      ],
      initial: { titulo: '', tipo: 'louvor', publico: 'todos', data: '', hora: '16h00', local: 'Templo', recorrencia: 'semanal', vezes: '', presentes: [], repertorio: [], anexos: [], obs: '' },
      save: (v) => {
        const presentes = v.presentes || [];
        const times = [...new Set(S.PESSOAS.filter((p) => presentes.includes(p.id)).flatMap((p) => p.times))];
        const soMusica = v.tipo === 'louvor' || v.tipo === 'geral';
        S.ENSAIOS.push({
          id: cexId('e'), titulo: v.titulo, tipo: v.tipo, time: times[0] || null, times,
          presentes, data: v.data || 'a definir', hora: v.hora, local: v.local,
          recorrencia: v.recorrencia, publico: soMusica ? v.publico : null, vezes: v.vezes ? +v.vezes : null,
          repertorio: v.repertorio || [], anexos: v.anexos || [], obs: v.obs,
        });
        return 'Ensaio "' + v.titulo + '" criado.';
      },
    };
  }

  if (kind === 'sala') {
    return {
      title: 'Nova sala / espaço', sub: 'Um espaço físico da igreja, com a capacidade de pessoas. Ele fica disponível para reservas de reuniões, eventos, treinamentos, cursos e ensaios.', saveLabel: 'Criar sala',
      fields: [
        { k: 'nome', label: 'Nome do espaço', type: 'text', req: true, ph: 'ex: Sala 3, Salão de festas' },
        { k: 'capacidade', label: 'Capacidade (pessoas)', type: 'text', half: true, ph: 'ex: 30' },
        { k: 'local', label: 'Onde fica', type: 'text', half: true, ph: 'ex: 1º andar, Anexo' },
        { k: 'recursos', label: 'Recursos disponíveis', type: 'tags', ph: 'Som, Projeção, Piano', hint: 'Separe por vírgula.' },
      ],
      initial: { nome: '', capacidade: '', local: '', recursos: '' },
      save: (v) => {
        S.SALAS.push({ id: cexId('s'), nome: v.nome, capacidade: parseInt(v.capacidade, 10) || 0, local: v.local || '', recursos: (v.recursos || '').split(',').map((s) => s.trim()).filter(Boolean) });
        return 'Sala "' + v.nome + '" criada.';
      },
    };
  }

  if (kind === 'board') {
    const timeOpts = [{ v: '', l: 'Geral (liderança)' }, ...(S.TIMES || []).map((t) => ({ v: t.id, l: t.nome }))];
    return {
      title: 'Novo quadro', sub: 'Um quadro de tarefas para organizar o trabalho de um time ou da liderança.', saveLabel: 'Criar quadro',
      fields: [
        { k: 'nome', label: 'Nome do quadro', type: 'text', req: true, ph: 'ex: Louvor · Julho' },
        { k: 'time', label: 'Time dono', type: 'select', half: true, options: timeOpts, hint: 'Geral fica visível à liderança.' },
        { k: 'desc', label: 'Descrição', type: 'text', half: true, ph: 'Para que serve' },
      ],
      initial: { nome: '', time: '', desc: '' },
      save: (v) => { S.BOARDS.push({ id: cexId('bd'), nome: v.nome, escopo: v.time ? 'time' : 'geral', time: v.time || null, desc: v.desc, colunas: S.COLUNAS_PADRAO.slice() }); return 'Quadro "' + v.nome + '" criado.'; },
    };
  }

  return null;
}

/* ─── host único (renderizado no App) ─── */
function CreateHost() {
  const [cur, setCur] = useState(null); // {kind, opts}
  useEffect(() => {
    const h = (e) => setCur({ kind: e.detail.kind, opts: e.detail.opts });
    window.addEventListener('cex-create', h);
    return () => window.removeEventListener('cex-create', h);
  }, []);
  if (!cur) return null;
  const sc = schema(cur.kind, cur.opts);
  if (!sc) { setCur(null); return null; }
  return (
    <FormModal
      title={sc.title} sub={sc.sub} fields={sc.fields} initial={sc.initial} saveLabel={sc.saveLabel}
      onSave={(v) => { const msg = sc.save(v); cexRefresh(); cexToast(msg || 'Criado.'); }}
      onClose={() => setCur(null)} />
  );
}

Object.assign(window, { FormModal, CreateHost, FField, DatePicker, TimePicker, PeoplePicker, AnexosEditor, RepertorioEditor, RECOR_OPTS });
