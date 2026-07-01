/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · CONFIGURAÇÕES
   Igreja · Ministérios & funções · Permissões (matriz) ·
   Personalização (tema/marca) · Multi-congregação.
   ════════════════════════════════════════════════════════════════ */

const CFG_TABS = [
  { id: 'igreja', label: 'Igreja' },
  { id: 'min', label: 'Ministérios & funções' },
  { id: 'operacao', label: 'Escala & presença' },
  { id: 'grupos', label: 'Grupos & Células' },
  { id: 'espacos', label: 'Espaços & Salas' },
  { id: 'perm', label: 'Permissões' },
  { id: 'acessos', label: 'Acessos por pessoa' },
  { id: 'visual', label: 'Personalização' },
  { id: 'rede', label: 'Congregações' },
];

function Field({ label, value, hint }) {
  return (
    <div className="field">
      <label className="field-label">{label}</label>
      <input className="input" defaultValue={value} />
      {hint && <div style={{ fontSize: 11, color: 'var(--subtle)', marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

function Configuracoes({ theme, setTheme, accent, setAccent }) {
  useRefresh();
  const soDelegado = !window.cexPodeEditar('config') && window.cexPodeDelegarAcesso();
  const tabsVisiveis = soDelegado ? CFG_TABS.filter((t) => t.id === 'acessos') : CFG_TABS;
  const [tab, setTab] = useState(soDelegado ? 'acessos' : 'igreja');
  const [gerirCong, setGerirCong] = useState(null);
  const [editTime, setEditTime] = useState(null);
  const ig = S.IGREJA;
  const [matriz, setMatriz] = useState(() => JSON.parse(JSON.stringify(S.MATRIZ_V2)));
  const toggleMx = (papel, acao) => setMatriz((m) => ({ ...m, [papel]: { ...m[papel], [acao]: !m[papel][acao] } }));
  const [grupos, setGrupos] = useState(() => ({ ...S.GRUPOS_CFG }));
  const saveGrupos = (g) => { setGrupos(g); Object.assign(S.GRUPOS_CFG, g); cexRefresh(); };

  const ACCENTS = S.ACCENTS;

  return (
    <div className="content wide">
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Gestão</div>
          <h1 className="ph-title">Configurações</h1>
          <p className="ph-sub">Os dados da igreja, quem pode o quê, o visual do app e as congregações da rede.</p>
        </div>
      </div>

      <div className="cfg-tabs">
        {tabsVisiveis.map((t) => <button key={t.id} className={`cfg-tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </div>

      {/* ─── IGREJA ─── */}
      {tab === 'igreja' && (
        <div className="cfg-grid2">
          <div className="cfg-card">
            <div className="cfg-card-t">Identificação</div>
            <div className="cfg-card-s">Como sua igreja aparece no app e nos comunicados.</div>
            <Field label="Nome da igreja" value={ig.nome} />
            <Field label="Responsável" value={ig.responsavel} />
            <div className="cfg-grid2" style={{ gap: '0 16px' }}>
              <Field label="CNPJ" value={ig.doc} />
              <Field label="Fundada em" value={ig.fundada} />
            </div>
          </div>
          <div className="cfg-card">
            <div className="cfg-card-t">Endereço & contato</div>
            <div className="cfg-card-s">Onde a igreja se reúne e como falar com a secretaria.</div>
            <Field label="Endereço" value={ig.endereco} />
            <div className="cfg-grid2" style={{ gap: '0 16px' }}>
              <Field label="Cidade · UF" value={ig.cidade} />
              <Field label="CEP" value={ig.cep} />
            </div>
            <div className="cfg-grid2" style={{ gap: '0 16px' }}>
              <Field label="E-mail" value={ig.email} />
              <Field label="Telefone" value={ig.tel} />
            </div>
          </div>
          <div className="cfg-card" style={{ gridColumn: '1 / -1' }}>
            <div className="cfg-card-t">Horários de culto</div>
            <div className="cfg-card-s">Aparecem na agenda e ajudam a montar as escalas.</div>
            <div className="cell-tags" style={{ gap: 8 }}>
              {ig.horarios.map((h) => <span key={h} className="tag lead"><Icon name="cultos" size={12} className="ic" /> {h}</span>)}
              <button className="tag" style={{ cursor: 'pointer', borderStyle: 'dashed', color: 'var(--olive)' }} onClick={() => { const h = window.prompt('Novo horário de culto (ex: Domingo 19h)'); if (h && h.trim()) { (ig.horarios || (ig.horarios = [])).push(h.trim()); cexRefresh(); cexToast('Horário adicionado.'); } }}>+ horário</button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MINISTÉRIOS & FUNÇÕES ─── */}
      {tab === 'min' && (
        <>
        <div className="section-divide" style={{ marginTop: 4 }}><Icon name="times" size={15} className="num" /><span className="label">Ministérios</span><span className="line"></span></div>
        <div className="cfg-card">
          <div className="cfg-card-t">Ministérios & funções</div>
          <div className="cfg-card-s">Cada ministério tem um líder e suas funções. As funções alimentam a escala e as habilidades de cada voluntário.</div>
          {S.TIMES.map((t) => {
            const lider = S.PESSOAS.find((p) => p.lider.includes(t.id));
            return (
              <div className="cfg-row" key={t.id}>
                <div className="team-mark" style={{ width: 38, height: 38 }}><TeamMark t={t} size={18} /></div>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">{t.nome} <span style={{ color: 'var(--subtle)', fontWeight: 400, fontSize: 12 }}>· líder {lider ? lider.nome.split(' ')[0] : 'a definir'}</span></div>
                  <div className="cell-tags" style={{ marginTop: 7 }}>
                    {t.funcoes.map((f) => <span key={f} className="tag">{f}</span>)}
                  </div>
                </div>
                <button className="btn btn-sec btn-sm" onClick={() => setEditTime(t.id)}>Editar</button>
              </div>
            );
          })}
          <button className="btn btn-pri btn-sm" style={{ marginTop: 18 }} onClick={() => cexCreate('time')}>+ Novo ministério</button>
        </div>
        <div className="section-divide"><Icon name="membros" size={15} className="num" /><span className="label">Papéis ministeriais</span><span className="line"></span></div>
        <PapeisCard />
        <div className="section-divide"><Icon name="pessoa" size={15} className="num" /><span className="label">Frentes / tags</span><span className="line"></span></div>
        <TagsCard />
        </>
      )}

      {/* ─── ESCALA & PRESENÇA ─── */}
      {tab === 'operacao' && (
        <>
        <div className="section-divide" style={{ marginTop: 4 }}><Icon name="escalas" size={15} className="num" /><span className="label">Como a escala roda</span><span className="line"></span></div>
        <EscalaRegrasCard />
        <StatusCriteriosCard />
        <div className="section-divide"><Icon name="cultos" size={15} className="num" /><span className="label">Presença & eventos</span><span className="line"></span></div>
        <CheckinCfgCard />
        <TiposEventoCard />
        </>
      )}

      {/* ─── PERMISSÕES ─── */}
      {tab === 'perm' && (
        <div className="cfg-card">
          <div className="cfg-card-t">Papéis & permissões</div>
          <div className="cfg-card-s">Cada funcionalidade do app aparece aqui. Toque para liberar ou bloquear por papel. Tudo que for criado no sistema entra automaticamente nesta lista.</div>
          <table className="pmx">
            <thead>
              <tr>
                <th className="pmx-fn">Funcionalidade</th>
                {S.PAPEIS_V2.map((pp) => <th key={pp.id} className="pmx-role"><span style={{ color: 'var(--olive)' }}>{pp.ic}</span> {pp.nome}</th>)}
              </tr>
            </thead>
            <tbody>
              {[...new Set(S.ACOES_V2.map((a) => a.grupo))].map((grupo) => (
                <React.Fragment key={grupo}>
                  <tr className="pmx-group"><td colSpan={5}>{grupo}</td></tr>
                  {S.ACOES_V2.filter((a) => a.grupo === grupo).map((a) => (
                    <tr key={a.id}>
                      <td className="pmx-fn">{a.nome}</td>
                      {S.PAPEIS_V2.map((pp) => {
                        const locked = pp.id === 'master';
                        const on = matriz[pp.id][a.id];
                        return (
                          <td key={pp.id}>
                            <button className={`mx-cell ${on ? 'on' : 'off'} ${locked ? 'lock' : ''}`} onClick={() => !locked && toggleMx(pp.id, a.id)} title={locked ? 'O Master sempre tem acesso total' : ''}>{on ? '✓' : '·'}</button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
            <button className="btn btn-pri btn-sm" onClick={() => { Object.assign(S.MATRIZ_V2, JSON.parse(JSON.stringify(matriz))); cexToast('Permissões salvas.'); }}>Salvar permissões</button>
          </div>
        </div>
      )}

      {/* ─── ACESSOS POR PESSOA ─── */}
      {tab === 'acessos' && <AcessosCard />}

      {/* ─── PERSONALIZAÇÃO ─── */}
      {tab === 'visual' && (
        <div className="cfg-grid2">
          <div className="cfg-card">
            <div className="cfg-card-t">Tema da interface</div>
            <div className="cfg-card-s">Modo escuro (padrão CE.X) ou modo claro em papel cream para quem prefere telas claras.</div>
            <div className="opt-row">
              <button className={`opt ${theme === 'dark' ? 'on' : ''}`} onClick={() => setTheme('dark')}>
                <div className="opt-t">◑ Escuro</div>
                <div className="opt-s">Ink profundo · padrão</div>
              </button>
              <button className={`opt ${theme === 'light' ? 'on' : ''}`} onClick={() => setTheme('light')}>
                <div className="opt-t">◐ Claro</div>
                <div className="opt-s">Papel cream CE.X</div>
              </button>
            </div>
          </div>
          <div className="cfg-card">
            <div className="cfg-card-t">Cor de destaque</div>
            <div className="cfg-card-s">A oliva é a cor da marca. As alternativas vêm todas da paleta quente CE.X.</div>
            <div className="swatch-row">
              {ACCENTS.map((a) => (
                <button key={a.id} className={`swatch ${accent === a.id ? 'on' : ''}`} style={{ background: a.hex, color: a.hex }} title={a.nome} onClick={() => setAccent(a.id)}></button>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 14 }}>Selecionado: <em style={{ color: 'var(--olive)', fontStyle: 'normal' }}>{(ACCENTS.find((a) => a.id === accent) || ACCENTS[0]).nome}</em></div>
          </div>
          <div className="cfg-card" style={{ gridColumn: '1 / -1' }}>
            <div className="cfg-card-t">Marca da sua igreja</div>
            <div className="cfg-card-s">Suba o logo da sua igreja. Ele aparece na barra lateral e no login, no lugar do CE.X, e o "Service" continua embaixo.</div>
            <ImgUpload id="igreja-logo" label="Logotipo da igreja" hint="Tamanho ideal: 480×160px (proporção 3:1), PNG com fundo transparente. Logos quadrados também funcionam." />
            <div className="cfg-row" style={{ marginTop: 8 }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Mostrar dica de senha no login</div>
                <div className="cfg-row-s">Útil só no protótipo. Desligue em produção.</div>
              </div>
              <Switch defOn />
            </div>
          </div>
        </div>
      )}

      {/* ─── ESPAÇOS & SALAS ─── */}
      {tab === 'espacos' && (
        <div className="cfg-card">
          <Espacos embed />
        </div>
      )}

      {/* ─── GRUPOS / CÉLULAS ─── */}
      {tab === 'grupos' && (
        <div className="cfg-grid2">
          <div className="cfg-card">
            <div className="cfg-card-t">Sua igreja trabalha com grupos?</div>
            <div className="cfg-card-s">Células, GCs, pequenos grupos... a estrutura de comunhão em casas. Se a sua igreja ainda não usa, deixe desligado e isso some do app.</div>
            <div className="cfg-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Habilitar grupos</div>
                <div className="cfg-row-s">{grupos.ativo ? 'Ativo — aparece nos membros e no app' : 'Desligado — oculto em todo o app'}</div>
              </div>
              <button className={`sw ${grupos.ativo ? 'on' : ''}`} onClick={() => saveGrupos({ ...grupos, ativo: !grupos.ativo })}></button>
            </div>
          </div>
          {grupos.ativo && (
            <div className="cfg-card">
              <div className="cfg-card-t">Como sua igreja chama?</div>
              <div className="cfg-card-s">Escolha um nome pronto ou personalize. É esse termo que aparece em todo o app.</div>
              <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
                {S.GRUPOS_PRESETS.map((p) => (
                  <button key={p.sigla} className={`tag ${grupos.termo === p.termo ? 'lead' : ''}`} style={{ cursor: 'pointer' }} onClick={() => saveGrupos({ ...grupos, ...p })}>{p.termo}</button>
                ))}
              </div>
              <div className="cfg-grid2" style={{ gap: '0 16px' }}>
                <div className="field"><label className="field-label">Nome (singular)</label><input className="input" value={grupos.termo} onChange={(e) => saveGrupos({ ...grupos, termo: e.target.value })} /></div>
                <div className="field"><label className="field-label">Sigla</label><input className="input" value={grupos.sigla} onChange={(e) => saveGrupos({ ...grupos, sigla: e.target.value })} /></div>
              </div>
              <div className="field"><label className="field-label">Nome (plural)</label><input className="input" value={grupos.termoP} onChange={(e) => saveGrupos({ ...grupos, termoP: e.target.value })} /></div>
            </div>
          )}
          {grupos.ativo && (
            <div className="cfg-card" style={{ gridColumn: '1 / -1' }}>
              <div className="cfg-card-t">{grupos.termoP} cadastrados · {S.GCS.length}</div>
              <div className="cfg-card-s">Cada grupo tem um líder, um dia e um bairro. Crie quantos precisar.</div>
              {S.GCS.map((g) => {
                const lider = pById(g.lider);
                return (
                  <div className="cfg-row" key={g.id}>
                    <div className="cong-mark"><Icon name="identidade" size={16} /></div>
                    <div className="cfg-row-main">
                      <div className="cfg-row-t">{g.nome}</div>
                      <div className="cfg-row-s">{g.dia} {g.hora} · {g.bairro}{lider ? ' · líder ' + lider.nome.split(' ')[0] : ''}</div>
                    </div>
                    <GerirGCBtn g={g} />
                  </div>
                );
              })}
              <button className="btn btn-pri btn-sm" style={{ marginTop: 18 }} onClick={() => cexCreate('gc')}>+ Novo {grupos.termo}</button>
            </div>
          )}
        </div>
      )}

      {/* ─── CONGREGAÇÕES ─── */}
      {tab === 'rede' && (() => {
        const matriz = S.CONGREGACOES.find((c) => c.matriz) || S.CONGREGACOES[0];
        const filhas = S.CONGREGACOES.filter((c) => !c.matriz);
        return (
        <>
        <div className="cfg-card">
          <div className="cfg-card-t">Sua igreja na rede</div>
          <div className="cfg-card-s">Toda igreja começa pela matriz — a sede cadastrada na contratação. Se houver outras unidades, você as adiciona como congregações; cada uma tem seus times e escalas, e a matriz enxerga tudo. Se sua igreja é uma só, fica só a matriz.</div>
          <div className="cong-matriz">
            <div className="cong-mark" style={{ width: 44, height: 44 }}><Icon name="identidade" size={20} /></div>
            <div className="cfg-row-main">
              <div className="cfg-row-t">{matriz ? matriz.nome : 'Matriz'} <span className="tag lead" style={{ marginLeft: 6 }}>matriz</span></div>
              <div className="cfg-row-s">{matriz ? matriz.cidade + ' · ' + matriz.membros + ' membros' : 'sede da igreja'}</div>
            </div>
            <button className="btn btn-sec btn-sm" onClick={() => setGerirCong(matriz ? matriz.id : null)}>Gerir</button>
          </div>

          <div className="cfg-card-t" style={{ marginTop: 26 }}>Outras congregações {filhas.length > 0 && '· ' + filhas.length}</div>
          {filhas.length === 0
            ? <div className="empty" style={{ padding: '20px 0' }}>Só a matriz por enquanto. <em>Adicione uma congregação quando abrir uma nova unidade.</em></div>
            : filhas.map((c) => (
              <div className="cfg-row" key={c.id}>
                <div className="cong-mark"><Icon name="globo" size={16} /></div>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">{c.nome}</div>
                  <div className="cfg-row-s">{c.cidade} · {c.membros} membros</div>
                </div>
                <button className="btn btn-sec btn-sm" onClick={() => setGerirCong(c.id)}>Gerir</button>
              </div>
            ))}
          <button className="btn btn-pri btn-sm" style={{ marginTop: 18 }} onClick={() => cexCreate('congregacao')}>+ Adicionar congregação</button>
        </div>
        </>
        );
      })()}
      {gerirCong && <CongDrawer id={gerirCong} onClose={() => setGerirCong(null)} />}
      {editTime && <MinisterioEditModal id={editTime} onClose={() => setEditTime(null)} />}
    </div>
  );
}

function Switch({ defOn }) {
  const [on, setOn] = useState(!!defOn);
  return <button className={`sw ${on ? 'on' : ''}`} onClick={() => setOn((o) => !o)}></button>;
}

/* tipos de evento configuráveis (pré-preenchem o "tipo" no cadastro de culto) */
function TiposEventoCard() {
  useRefresh();
  const [novo, setNovo] = useState('');
  const lista = S.TIPOS_EVENTO_CFG || (S.TIPOS_EVENTO_CFG = []);
  const add = () => { const v = novo.trim(); if (v && !lista.includes(v)) { lista.push(v); cexRefresh(); cexToast('Tipo "' + v + '" adicionado.'); } setNovo(''); };
  const rem = (p) => { const i = lista.indexOf(p); if (i >= 0) { lista.splice(i, 1); cexRefresh(); } };
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Tipos de evento</div>
      <div className="cfg-card-s">Os tipos que aparecem ao criar um culto ou evento. Já vêm pré-preenchidos no cadastro; se faltar algum, dá pra criar na hora.</div>
      <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
        {lista.map((p) => (
          <span key={p} className="papel-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {p}<button onClick={() => rem(p)} style={{ background: 'none', border: 'none', color: 'var(--subtle)', fontSize: 12, padding: 0 }}>✕</button>
          </span>
        ))}
        {lista.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--subtle)' }}>Nenhum tipo cadastrado.</span>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input className="input" style={{ flex: 1 }} placeholder="ex: Culto, Conferência, Vigília" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-sec" onClick={add}>Adicionar</button>
      </div>
    </div>
  );
}

/* critérios de status do voluntário (ativo / inativando / inativo) */
function StatusCriteriosCard() {
  useRefresh();
  const cfg = S.STATUS_CFG || (S.STATUS_CFG = { recusasInativando: 2, recusasInativo: 4, diasIndispInativo: 30, considerarFerias: false });
  const [, bump] = useState(0);
  const set = (k, v) => { cfg[k] = v; bump((n) => n + 1); };
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Quando um voluntário fica inativo</div>
      <div className="cfg-card-s">Cada igreja define os critérios. Assim os líderes enxergam quem está se afastando e podem fazer contato a tempo. Férias avisadas não contam.</div>
      <div className="crit-row">
        <div className="cfg-row-main">
          <div className="cfg-row-t">Marcar como <em style={{ color: 'var(--amber)', fontStyle: 'normal' }}>inativando</em></div>
          <div className="cfg-row-s">após recusar escalas seguidas</div>
        </div>
        <div className="stepper">
          <button onClick={() => set('recusasInativando', Math.max(1, cfg.recusasInativando - 1))}>−</button>
          <span>{cfg.recusasInativando}</span>
          <button onClick={() => set('recusasInativando', cfg.recusasInativando + 1)}>+</button>
        </div>
      </div>
      <div className="crit-row">
        <div className="cfg-row-main">
          <div className="cfg-row-t">Marcar como <em style={{ color: 'var(--danger)', fontStyle: 'normal' }}>inativo</em></div>
          <div className="cfg-row-s">após recusar escalas seguidas</div>
        </div>
        <div className="stepper">
          <button onClick={() => set('recusasInativo', Math.max(2, cfg.recusasInativo - 1))}>−</button>
          <span>{cfg.recusasInativo}</span>
          <button onClick={() => set('recusasInativo', cfg.recusasInativo + 1)}>+</button>
        </div>
      </div>
      <div className="crit-row">
        <div className="cfg-row-main">
          <div className="cfg-row-t">Inativo por indisponibilidade</div>
          <div className="cfg-row-s">dias seguidos marcado como indisponível</div>
        </div>
        <div className="stepper">
          <button onClick={() => set('diasIndispInativo', Math.max(7, cfg.diasIndispInativo - 7))}>−</button>
          <span>{cfg.diasIndispInativo}d</span>
          <button onClick={() => set('diasIndispInativo', cfg.diasIndispInativo + 7)}>+</button>
        </div>
      </div>
      <div className="cfg-row" style={{ borderBottom: 'none' }}>
        <div className="cfg-row-main">
          <div className="cfg-row-t">Contar período de férias avisado</div>
          <div className="cfg-row-s">{cfg.considerarFerias ? 'Férias contam como afastamento' : 'Férias avisadas não pesam no status'}</div>
        </div>
        <button className={`sw ${cfg.considerarFerias ? 'on' : ''}`} onClick={() => set('considerarFerias', !cfg.considerarFerias)}></button>
      </div>
      <div className="crit-legend">
        <span><i className="dot ok"></i> Ativo</span>
        <span><i className="dot warn"></i> Inativando — vale um contato</span>
        <span><i className="dot off"></i> Inativo</span>
      </div>
    </div>
  );
}

/* regras de geração da escala (sobrecarga, férias, modo, recusa) */
function EscalaRegrasCard() {
  useRefresh();
  const cfg = S.ESCALA_CFG || (S.ESCALA_CFG = { modo: 'assistido', maxPorEvento: 1, maxPorMes: 4, considerarFerias: true, naRecusa: 'proximo', folgaSemanas: 0 });
  const [, bump] = useState(0);
  const set = (k, v) => { cfg[k] = v; bump((n) => n + 1); cexRefresh(); };
  const MODOS = [
    ['manual', 'Manual', 'O líder monta tudo na mão.'],
    ['assistido', 'Assistida', 'O sistema sugere; o líder confirma cada nome.'],
    ['automatico', 'Automática', 'O sistema gera e já confirma, sem ação.'],
  ];
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Regras de escala</div>
      <div className="cfg-card-s">Como a escala é gerada e os limites para não sobrecarregar ninguém. Valem para o botão "Gerar" e para o modo automático.</div>

      <div className="field" style={{ marginTop: 4 }}>
        <label className="field-label">Geração</label>
        <div className="opt-row" style={{ flexWrap: 'wrap' }}>
          {MODOS.map(([k, t, s]) => (
            <button key={k} className={`opt ${cfg.modo === k ? 'on' : ''}`} onClick={() => set('modo', k)}>
              <div className="opt-t">{t}</div>
              <div className="opt-s">{s}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="crit-row">
        <div className="cfg-row-main">
          <div className="cfg-row-t">Máximo de vezes por mês</div>
          <div className="cfg-row-s">teto para não sobrecarregar a mesma pessoa</div>
        </div>
        <div className="stepper">
          <button onClick={() => set('maxPorMes', Math.max(1, cfg.maxPorMes - 1))}>−</button>
          <span>{cfg.maxPorMes}×</span>
          <button onClick={() => set('maxPorMes', cfg.maxPorMes + 1)}>+</button>
        </div>
      </div>

      <div className="crit-row">
        <div className="cfg-row-main">
          <div className="cfg-row-t">Semanas de folga após servir</div>
          <div className="cfg-row-s">descanso sugerido entre escalas (0 = sem folga)</div>
        </div>
        <div className="stepper">
          <button onClick={() => set('folgaSemanas', Math.max(0, cfg.folgaSemanas - 1))}>−</button>
          <span>{cfg.folgaSemanas}</span>
          <button onClick={() => set('folgaSemanas', cfg.folgaSemanas + 1)}>+</button>
        </div>
      </div>

      <div className="cfg-row">
        <div className="cfg-row-main">
          <div className="cfg-row-t">Respeitar período de férias</div>
          <div className="cfg-row-s">{cfg.considerarFerias ? 'Quem está de férias fica fora da geração' : 'Férias não bloqueiam a escala'}</div>
        </div>
        <button className={`sw ${cfg.considerarFerias ? 'on' : ''}`} onClick={() => set('considerarFerias', !cfg.considerarFerias)}></button>
      </div>

      <div className="field" style={{ marginTop: 14 }}>
        <label className="field-label">Quando alguém recusa (no automático)</label>
        <div className="opt-row">
          <button className={`opt ${cfg.naRecusa === 'proximo' ? 'on' : ''}`} onClick={() => set('naRecusa', 'proximo')}>
            <div className="opt-t">Chamar o próximo</div>
            <div className="opt-s">convida o próximo apto na hora</div>
          </button>
          <button className={`opt ${cfg.naRecusa === 'avisar' ? 'on' : ''}`} onClick={() => set('naRecusa', 'avisar')}>
            <div className="opt-t">Avisar o líder</div>
            <div className="opt-s">deixa a vaga aberta e notifica</div>
          </button>
        </div>
      </div>
      <div className="cfg-row" style={{ borderBottom: 'none' }}>
        <div className="cfg-row-s">Uma pessoa nunca é escalada em dois times no mesmo culto — a trava é automática.</div>
      </div>
    </div>
  );
}

/* gestão dos papéis ministeriais (Pastor, Líder, Diácono...) */
function PapeisCard() {
  useRefresh();
  const [novo, setNovo] = useState('');
  const lista = S.PAPEIS_IGREJA || [];
  const add = () => { const v = novo.trim(); if (!v) return; if (!lista.includes(v)) { lista.push(v); cexRefresh(); cexToast('Papel "' + v + '" adicionado.'); } setNovo(''); };
  const rem = (p) => { const i = lista.indexOf(p); if (i >= 0) { lista.splice(i, 1); cexRefresh(); } };
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Papéis ministeriais</div>
      <div className="cfg-card-s">Os títulos que a sua igreja reconhece. Cada igreja monta a sua lista, do jeito que organiza a liderança. Atribuídos aos membros quando exercem o papel.</div>
      <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
        {lista.map((p) => (
          <span key={p} className="papel-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            {p}<button onClick={() => rem(p)} style={{ background: 'none', border: 'none', color: 'var(--subtle)', fontSize: 12, padding: 0 }}>✕</button>
          </span>
        ))}
        {lista.length === 0 && <span style={{ fontSize: 12.5, color: 'var(--subtle)' }}>Nenhum papel cadastrado.</span>}
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <input className="input" style={{ flex: 1 }} placeholder="ex: Pastor, Diácono, Presbítero" value={novo} onChange={(e) => setNovo(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <button className="btn btn-sec" onClick={add}>Adicionar</button>
      </div>
    </div>
  );
}

/* acessos individuais por pessoa + delegação de quem pode liberar */
function AcessosCard() {
  useRefresh();
  const [q, setQ] = useState('');
  const [sel, setSel] = useState(null);
  const podeDelegar = window.cexPodeEditar('config'); // só master altera quem delega
  const rotas = S.ACESSO_ROTAS || [];
  const elenco = S.PESSOAS.filter((p) => !q || p.nome.toLowerCase().includes(q.toLowerCase()));
  const pessoa = sel ? pById(sel) : null;
  const acessos = pessoa ? (S.ACESSOS[pessoa.id] || []) : [];
  const [, bump] = useState(0);

  return (
    <div className="cfg-grid2">
      <div className="cfg-card">
        <div className="cfg-card-t">Quem pode acessar o quê</div>
        <div className="cfg-card-s">Líderes já enxergam toda a <em>Operação</em>. Aqui você abre telas extras para uma pessoa específica — Membros, Visitantes, Times… Escolha a pessoa e marque o que ela pode ver.</div>
        <div className="tb-search pp-search" style={{ marginBottom: 12 }}><span className="si"><Icon name="buscar" size={15} /></span><input placeholder="Buscar pessoa pelo nome..." value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="acesso-list">
          {elenco.slice(0, 40).map((p) => {
            const n = (S.ACESSOS[p.id] || []).length;
            return (
              <button key={p.id} className={`flag-row ${sel === p.id ? 'on' : ''}`} onClick={() => setSel(p.id)}>
                <Av nome={p.nome} size="sm" fotoId={p.volId} lead={p.lider.length > 0} />
                <div className="flag-main"><div className="flag-nome">{p.nome}</div><div className="flag-meta">{p.lider.length ? 'Líder' : 'Voluntário'}{n ? ' · ' + n + ' acesso(s) extra' : ''}</div></div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="cfg-card">
        {!pessoa && <div className="empty" style={{ padding: '30px 0' }}>Escolha uma pessoa à esquerda para liberar telas.</div>}
        {pessoa && (
          <>
            <div className="cfg-card-t">Acessos de {pessoa.nome.split(' ')[0]}</div>
            <div className="cfg-card-s">Marque as telas que {pessoa.nome.split(' ')[0]} pode abrir além do padrão do papel.</div>
            <div className="acesso-toggles">
              {rotas.map((r) => {
                const on = (S.ACESSOS[pessoa.id] || []).includes(r.id);
                return (
                  <button key={r.id} className={`acesso-tog ${on ? 'on' : ''}`} onClick={() => { S.acessoTog(pessoa.id, r.id); bump((n) => n + 1); }}>
                    <span className="acesso-tog-ic"><Icon name={CEX_ICON_FOR[r.id] || 'config'} size={15} /></span>
                    <span className="acesso-tog-l">{r.label}</span>
                    <span className={`acesso-tog-sw ${on ? 'on' : ''}`}></span>
                  </button>
                );
              })}
            </div>

            <div className="cfg-row" style={{ marginTop: 18 }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Pode liberar acessos a outras pessoas</div>
                <div className="cfg-row-s">{(S.ACESSO_DELEGADOS || []).includes(pessoa.id) ? 'É um delegado de acessos' : 'Só vê os próprios acessos'}</div>
              </div>
              <button className={`sw ${(S.ACESSO_DELEGADOS || []).includes(pessoa.id) ? 'on' : ''}`} disabled={!podeDelegar} onClick={() => { S.delegarAcessoTog(pessoa.id); bump((n) => n + 1); }}></button>
            </div>
            {!podeDelegar && <div style={{ fontSize: 11.5, color: 'var(--subtle)', marginTop: 8 }}>Só a Direção (master) define quem pode delegar acessos.</div>}
          </>
        )}
      </div>
    </div>
  );
}

/* ── FRENTES / TAGS ──────────────────────────────────────────────
   O lugar onde a igreja cria as tags (Jovens, Kids, Casais…) e o líder
   de cada frente monta o seu elenco: clica na tag e marca quem serve
   ali. A tag é só uma lente — o time (Som, Louvor) continua único. */
const TAG_CORES = ['olive', 'wheat', 'clay', 'terra', 'sand', 'amber', 'rust'];
const TAG_COR_HEX = { olive: 'var(--olive)', wheat: 'var(--wheat)', clay: 'var(--clay)', terra: 'var(--terra)', sand: 'var(--sand)', amber: 'var(--amber)', rust: 'var(--rust)' };

function TagDot({ cor, size }) {
  return <span style={{ width: size || 9, height: size || 9, borderRadius: '50%', background: TAG_COR_HEX[cor] || 'var(--olive)', flexShrink: 0, display: 'inline-block' }}></span>;
}

/* picker de elenco: marca quem serve naquela frente */
function TagElenco({ tag, onClose }) {
  const [, bump] = useState(0);
  const [q, setQ] = useState('');
  const lista = (S.PESSOAS || []).filter((p) => !q || p.nome.toLowerCase().includes(q.toLowerCase()));
  const dentro = (S.PESSOAS || []).filter((p) => S.pessoaTemTag(p, tag.id)).length;
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow"><TagDot cor={tag.cor} /> Frente · {tag.nome}</div>
          <div className="modal-title">Quem serve nos {tag.nome}</div>
          <div className="modal-sub">Marque os voluntários que fazem parte desta frente. Eles podem ser de qualquer ministério: um do Som pode servir aqui e outro não. Toque na <b>estrela</b> para definir quem é líder da frente. {dentro} marcado(s).</div>
        </div>
        <div className="modal-body">
          <div className="tb-search" style={{ marginBottom: 14 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder="Buscar voluntário…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {lista.map((p) => {
            const on = S.pessoaTemTag(p, tag.id);
            const lider = S.ehTagLider(tag.id, p.id);
            return (
              <div className={`flag-row ${on ? 'on' : ''}`} key={p.id} style={{ cursor: 'pointer' }} onClick={() => { S.togglePessoaTag(p.id, tag.id); bump((n) => n + 1); }}>
                <span className={`flag-check ${on ? 'on' : ''}`}>{on ? '✓' : ''}</span>
                <Av nome={p.nome} size="sm" self={p.self} fotoId={p.volId} />
                <div className="flag-main">
                  <div className="flag-nome">{p.nome}{lider && <span className="frente-lider-badge">★ líder</span>}</div>
                  <div className="flag-meta">{p.times.map((t) => { const tt = tById(t); return tt ? tt.nome.split(' ')[0] : ''; }).filter(Boolean).join(' · ') || 'Voluntário'}</div>
                </div>
                <button type="button" className={`frente-lider-tog ${lider ? 'on' : ''}`} title={lider ? 'Remover como líder' : 'Tornar líder da frente'} onClick={(e) => { e.stopPropagation(); S.toggleTagLider(tag.id, p.id); bump((n) => n + 1); }}>★</button>
              </div>
            );
          })}
          {lista.length === 0 && <div className="empty">Ninguém encontrado.</div>}
        </div>
        <div className="modal-foot"><button className="btn btn-pri" onClick={onClose}>Concluído</button></div>
      </div>
    </div>
  );
}

function TagsCard() {
  useRefresh();
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('wheat');
  const [editId, setEditId] = useState(null);
  const [elenco, setElenco] = useState(null);
  const lista = S.TAGS || [];
  const add = () => { const n = nome.trim(); if (!n) return; S.adicionarTag(n, cor); setNome(''); setCor('wheat'); cexToast('Frente "' + n + '" criada.'); };
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Frentes / tags</div>
      <div className="cfg-card-s">Etiquetas livres como Jovens, Kids ou Casais. Uma pessoa pode ter várias. Servem para o líder de cada frente montar o seu elenco: clique numa frente para marcar quem serve nela. Ao escalar um evento marcado com a tag, só esse elenco aparece no pool, mesmo que o time (Som, Louvor) seja o da igreja toda.</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '4px 0 14px' }}>
        {lista.map((s) => {
          const n = S.contarTag(s.id);
          return (
            <div className="cfg-row" key={s.id}>
              <div className="cong-mark" style={{ background: 'var(--ink)' }}><TagDot cor={s.cor} size={13} /></div>
              <div className="cfg-row-main">
                {editId === s.id ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <input className="input" style={{ flex: '1 1 140px' }} value={s.nome} onChange={(e) => S.renomearTag(s.id, e.target.value)} onKeyDown={(e) => e.key === 'Enter' && setEditId(null)} autoFocus />
                    <span style={{ display: 'flex', gap: 6 }}>
                      {TAG_CORES.map((c) => (
                        <button key={c} title={c} onClick={() => S.recolorirTag(s.id, c)} style={{ width: 20, height: 20, borderRadius: '50%', background: TAG_COR_HEX[c], border: s.cor === c ? '2px solid var(--white)' : '2px solid transparent', cursor: 'pointer', padding: 0 }}></button>
                      ))}
                    </span>
                    <button className="btn btn-sec btn-sm" onClick={() => setEditId(null)}>Pronto</button>
                  </div>
                ) : (
                  <>
                    <div className="cfg-row-t">{s.nome}</div>
                    <div className="cfg-row-s">{(() => { const lids = S.tagLideres(s.id).map((pid) => { const p = pById(pid); return p ? p.nome.split(' ')[0] : null; }).filter(Boolean); return <>{n} voluntário(s){lids.length ? <> · líder: <span style={{ color: 'var(--olive-soft)' }}>{lids.join(', ')}</span></> : ' · sem líder'}</>; })()}</div>
                  </>
                )}
              </div>
              {editId !== s.id && (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button className="btn btn-sec btn-sm" onClick={() => setElenco(s)}><Icon name="membros" size={13} /> Elenco</button>
                  <button className="papel-tag" style={{ border: 'none', cursor: 'pointer', color: 'var(--subtle)' }} onClick={() => setEditId(s.id)} title="Renomear / cor"><Icon name="editar" size={14} /></button>
                  <button className="papel-tag" style={{ border: 'none', cursor: 'pointer', color: 'var(--subtle)' }} onClick={() => { S.removerTag(s.id); cexToast('Frente removida.'); }} title="Remover"><Icon name="recusou" size={14} /></button>
                </div>
              )}
            </div>
          );
        })}
        {lista.length === 0 && <div className="empty" style={{ padding: '8px 0' }}>Nenhuma frente cadastrada.</div>}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input className="input" style={{ flex: '1 1 160px' }} placeholder="Nome (ex: Jovens, Casais)" value={nome} onChange={(e) => setNome(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
        <span style={{ display: 'flex', gap: 6 }}>
          {TAG_CORES.map((c) => (
            <button key={c} title={c} onClick={() => setCor(c)} style={{ width: 22, height: 22, borderRadius: '50%', background: TAG_COR_HEX[c], border: cor === c ? '2px solid var(--white)' : '2px solid transparent', cursor: 'pointer', padding: 0 }}></button>
          ))}
        </span>
        <button className="btn btn-sec" onClick={add}>Adicionar</button>
      </div>
      {elenco && <TagElenco tag={elenco} onClose={() => setElenco(null)} />}
    </div>
  );
}

/* política de check-in por QR (presença extra) */
function CheckinCfgCard() {
  useRefresh();
  const [, bump] = useState(0);
  const cfg = S.CHECKIN_CFG || (S.CHECKIN_CFG = { permitirExtra: false });
  return (
    <div className="cfg-card" style={{ marginTop: 16 }}>
      <div className="cfg-card-t">Check-in por QR Code</div>
      <div className="cfg-card-s">Cada culto ou evento tem um QR Code único. O voluntário escaneia com o celular e confirma presença pela conta logada. Abra o QR na tela das Escalas (botão “QR Check-in”) para mostrar, salvar ou imprimir.</div>
      <div className="cfg-row">
        <div className="cong-mark" style={{ background: 'var(--ink)' }}><Icon name="cultos" size={16} /></div>
        <div className="cfg-row-main">
          <div className="cfg-row-t">Presença de quem não está escalado</div>
          <div className="cfg-row-s">{cfg.permitirExtra ? 'Quem não está escalado pode fazer check-in como presença extra.' : 'Só quem está escalado consegue fazer check-in. Os demais são bloqueados.'}</div>
        </div>
        <button className={`sw ${cfg.permitirExtra ? 'on' : ''}`} onClick={() => { cfg.permitirExtra = !cfg.permitirExtra; S.salvarCheckinCfg(); bump((n) => n + 1); }}></button>
      </div>
    </div>
  );
}

/* botão + modal: gerir um grupo de comunhão (editar/remover) */
function GerirGCBtn({ g }) {
  const [open, setOpen] = useState(false);
  const [d, setD] = useState({ nome: g.nome, dia: g.dia, hora: g.hora, bairro: g.bairro, lider: g.lider || '' });
  const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  const pessoasOpts = (S.PESSOAS || []).slice().sort((a, b) => a.nome.localeCompare(b.nome));
  const salvar = () => { if (!d.nome.trim()) { cexToast('Dê um nome ao grupo.', 'warn'); return; } Object.assign(g, { nome: d.nome.trim(), dia: d.dia, hora: d.hora, bairro: d.bairro, lider: d.lider }); cexRefresh(); cexToast('Grupo atualizado.'); setOpen(false); };
  const remover = () => { if (window.confirm('Remover o grupo “' + g.nome + '”?')) { S.GCS = (S.GCS || []).filter((x) => x.id !== g.id); cexRefresh(); cexToast('Grupo removido.'); setOpen(false); } };
  return (
    <>
      <button className="btn btn-sec btn-sm" onClick={() => { setD({ nome: g.nome, dia: g.dia, hora: g.hora, bairro: g.bairro, lider: g.lider || '' }); setOpen(true); }}>Gerir</button>
      {open && (
        <div className="modal-bg" onClick={() => setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div className="modal-eyebrow">Gerir grupo</div>
              <div className="modal-title">{g.nome}</div>
              <div className="modal-sub">Nome, líder, dia, horário e bairro do grupo de comunhão.</div>
            </div>
            <div className="modal-body" style={{ display: 'block' }}>
              <div className="field"><label className="field-label">Nome</label><input className="input" value={d.nome} onChange={(e) => setD((p) => ({ ...p, nome: e.target.value }))} /></div>
              <div className="field"><label className="field-label">Líder</label>
                <select className="select" value={d.lider} onChange={(e) => setD((p) => ({ ...p, lider: e.target.value }))}>
                  <option value="">A definir</option>
                  {pessoasOpts.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                </select>
              </div>
              <div className="cfg-grid2" style={{ gap: '0 12px' }}>
                <div className="field"><label className="field-label">Dia</label>
                  <select className="select" value={d.dia} onChange={(e) => setD((p) => ({ ...p, dia: e.target.value }))}>{DIAS.map((x) => <option key={x} value={x}>{x}</option>)}</select>
                </div>
                <div className="field"><label className="field-label">Horário</label><input className="input" value={d.hora} onChange={(e) => setD((p) => ({ ...p, hora: e.target.value }))} /></div>
              </div>
              <div className="field"><label className="field-label">Bairro</label><input className="input" value={d.bairro} onChange={(e) => setD((p) => ({ ...p, bairro: e.target.value }))} /></div>
            </div>
            <div className="modal-foot"><button className="btn btn-danger" onClick={remover}>Remover</button><div style={{ flex: 1 }}></div><button className="btn btn-sec" onClick={() => setOpen(false)}>Cancelar</button><button className="btn btn-pri" onClick={salvar}>Salvar</button></div>
          </div>
        </div>
      )}
    </>
  );
}

/* editar um ministério/time (nome, ícone, líder, descrição, funções) */
function MinisterioEditModal({ id, onClose }) {
  const t = (S.TIMES || []).find((x) => x.id === id);
  const [nome, setNome] = useState(t ? t.nome : '');
  const [ic, setIc] = useState(t ? t.ic : 'times');
  const [desc, setDesc] = useState(t ? (t.desc || '') : '');
  const [liderId, setLiderId] = useState(() => { const l = (S.PESSOAS || []).find((p) => (p.lider || []).includes(id)); return l ? l.id : ''; });
  const [funcoes, setFuncoes] = useState(() => t ? [...(t.funcoes || [])] : []);
  const [nova, setNova] = useState('');
  if (!t) return null;
  const addFn = () => { const n = nova.trim(); if (!n || funcoes.includes(n)) { setNova(''); return; } setFuncoes((f) => [...f, n]); setNova(''); };
  const salvar = () => {
    if (!nome.trim()) { cexToast('Dê um nome ao ministério.', 'warn'); return; }
    t.nome = nome.trim(); t.ic = ic; t.desc = desc;
    t.funcoes = funcoes;
    t.funcoesDet = funcoes.map((nm) => { const ex = (t.funcoesDet || []).find((d) => d.nome === nm); return ex || { nome: nm, resp: '' }; });
    (S.PESSOAS || []).forEach((p) => { if ((p.lider || []).includes(id) && p.id !== liderId) p.lider = p.lider.filter((x) => x !== id); });
    if (liderId) { const l = (S.PESSOAS || []).find((p) => p.id === liderId); if (l) { l.lider = l.lider || []; if (!l.lider.includes(id)) l.lider.push(id); l.times = l.times || []; if (!l.times.includes(id)) l.times.push(id); t.lider = l.nome; } } else { t.lider = 'a definir'; }
    cexRefresh(); cexToast('Ministério atualizado.'); onClose();
  };
  const pessoasOpts = (S.PESSOAS || []).slice().sort((a, b) => a.nome.localeCompare(b.nome));
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Editar ministério</div>
          <div className="modal-title">{t.nome}</div>
          <div className="modal-sub">Nome, ícone, líder, descrição e funções. As funções alimentam a escala.</div>
        </div>
        <div className="modal-body" style={{ display: 'block' }}>
          <div className="field"><label className="field-label">Nome</label><input className="input" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div className="field"><label className="field-label">Marca / ícone</label><IconPicker value={ic} onChange={setIc} /></div>
          <div className="field"><label className="field-label">Líder</label>
            <select className="select" value={liderId} onChange={(e) => setLiderId(e.target.value)}>
              <option value="">A definir</option>
              {pessoasOpts.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="field"><label className="field-label">Descrição curta</label><input className="input" value={desc} onChange={(e) => setDesc(e.target.value)} /></div>
          <div className="field"><label className="field-label">Funções do time</label>
            <div className="cell-tags" style={{ marginBottom: 8 }}>
              {funcoes.map((f) => <span key={f} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>{f}<button onClick={() => setFuncoes((x) => x.filter((y) => y !== f))} style={{ border: 'none', background: 'none', color: 'var(--subtle)', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button></span>)}
              {funcoes.length === 0 && <span style={{ fontSize: 12, color: 'var(--subtle)' }}>Nenhuma função ainda.</span>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="input" placeholder="ex: Vocal, Câmera" value={nova} onChange={(e) => setNova(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFn()} />
              <button className="btn btn-sec btn-sm" onClick={addFn}>+ Função</button>
            </div>
          </div>
        </div>
        <div className="modal-foot"><button className="btn btn-sec" onClick={onClose}>Cancelar</button><button className="btn btn-pri" onClick={salvar}>Salvar</button></div>
      </div>
    </div>
  );
}

/* gerir uma congregação: dados + governança (mesma estrutura) */
function CongDrawer({ id, onClose }) {
  useRefresh();
  const [, bump] = useState(0);
  const c = (S.CONGREGACOES || []).find((x) => x.id === id);
  if (!c) return null;
  const set = (k, v) => { c[k] = v; bump((n) => n + 1); };
  return (
    <>
      <div className="drawer-bg" onClick={onClose}></div>
      <div className="drawer drawer-wide">
        <div className="drawer-head">
          <button className="drawer-close" onClick={onClose}>✕</button>
          <div className="ph-eyebrow" style={{ marginBottom: 8 }}>{c.matriz ? 'Matriz · rede' : 'Congregação'}</div>
          <div className="profile-name">{c.nome}</div>
          <div className="profile-role">{c.cidade} · {c.membros} membros{c.pastor ? ' · ' + c.pastor : ''}</div>
        </div>
        <div className="drawer-body">
          <div className="dsec" style={{ marginTop: 0 }}>
            <div className="dsec-title">Dados da congregação</div>
            <div className="ce-grid">
              <div className="field"><label className="field-label">Nome</label><input className="input" value={c.nome} onChange={(e) => set('nome', e.target.value)} /></div>
              <div className="field"><label className="field-label">Cidade / bairro</label><input className="input" value={c.cidade || ''} onChange={(e) => set('cidade', e.target.value)} /></div>
              <div className="field"><label className="field-label">Pastor responsável</label><input className="input" value={c.pastor || ''} onChange={(e) => set('pastor', e.target.value)} /></div>
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Governança própria</div>
            <div className="cfg-card-s" style={{ marginBottom: 12 }}>Cada congregação roda com a mesma estrutura da matriz: seus ministérios, escalas, reuniões, ensaios e eventos. A matriz enxerga tudo; o pastor local cuida da sua unidade.</div>
            <div className="cell-tags">
              {S.TIMES.map((t) => <span key={t.id} className="tag"><TeamMark t={t} size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} /> {t.nome.split(' ')[0]}</span>)}
            </div>
          </div>

          <div className="dsec">
            <div className="dsec-title">Frentes / tags</div>
            <div className="cell-tags">
              {(S.TAGS || []).map((s) => <span key={s.id} className="tag" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 7, height: 7, borderRadius: '50%', background: ({olive:'var(--olive)',wheat:'var(--wheat)',clay:'var(--clay)',terra:'var(--terra)',sand:'var(--sand)',amber:'var(--amber)',rust:'var(--rust)'}[s.cor] || 'var(--olive)') }}></span>{s.nome}</span>)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--subtle)', marginTop: 10 }}>Frentes como Jovens ou Kids puxam o elenco delas dos times da igreja. Gerencie em Ministérios &amp; funções.</div>
          </div>

          <button className="btn btn-pri" style={{ width: '100%', justifyContent: 'center' }} onClick={() => { cexRefresh(); cexToast('Congregação salva.'); onClose(); }}>Salvar congregação</button>
        </div>
      </div>
    </>
  );
}

Object.assign(window, { Configuracoes });