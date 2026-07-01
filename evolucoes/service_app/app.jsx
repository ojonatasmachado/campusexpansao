/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · ROOT (login, roteamento, drawers, mobile, tema)
   ════════════════════════════════════════════════════════════════ */

const CRUMBS = {
  painel: 'CE.X SERVICE · PAINEL',
  membros: 'CE.X SERVICE · MEMBROS',
  pessoas: 'CE.X SERVICE · VOLUNTÁRIOS',
  times: 'CE.X SERVICE · TIMES',
  visitantes: 'CE.X SERVICE · VISITANTES',
  decisoes: 'CE.X SERVICE · DECISÕES',
  batismos: 'CE.X SERVICE · BATISMOS',
  cursos: 'CE.X SERVICE · CURSOS',
  escalas: 'CE.X SERVICE · ESCALAS',
  reunioes: 'CE.X SERVICE · REUNIÕES',
  ensaios: 'CE.X SERVICE · ENSAIOS',
  espacos: 'CE.X SERVICE · ESPAÇOS',
  quadros: 'CE.X SERVICE · QUADROS',
  cultos: 'CE.X SERVICE · AGENDA',
  comunicacao: 'CE.X SERVICE · COMUNICAÇÃO',
  conversas: 'CE.X SERVICE · CONVERSAS',
  relatorios: 'CE.X SERVICE · RELATÓRIOS',
  config: 'CE.X SERVICE · CONFIGURAÇÕES',
  identidade: 'CE.X SERVICE · IDENTIDADE',
  historia: 'CE.X SERVICE · NOSSA HISTÓRIA',
};

function App() {
  const [authed, setAuthed] = useState(false);
  const [onboardUser, setOnboardUser] = useState(null);
  const [route, setRoute] = useState('painel');
  const [cong, setCong] = useState('matriz');
  const [drawer, setDrawer] = useState(null); // {kind, id}
  const [mobile, setMobile] = useState(false);
  const [checkinReq, setCheckinReq] = useState(() => { try { const u = new URLSearchParams(location.search); const c = u.get('checkin'); return c ? { cultoId: c, token: u.get('t') } : null; } catch (e) { return null; } });
  const [theme, setTheme] = useState(() => localStorage.getItem('cex_theme') || 'dark');
  const [accent, setAccent] = useState(() => localStorage.getItem('cex_accent') || 'olive');

  const gaps = useMemo(() => computeGaps().length, []);

  /* re-render do shell quando a perspectiva muda (saudação, escopos) */
  const [, bumpView] = useState(0);
  useEffect(() => {
    const h = () => { bumpView((n) => n + 1); setRoute((r) => (window.cexPodeVer(r) ? r : window.cexPrimeiraRota())); };
    window.addEventListener('cex-view', h);
    return () => window.removeEventListener('cex-view', h);
  }, []);

  /* tema só vale dentro do app (login fica sempre escuro) */
  useEffect(() => {
    if (authed) document.body.dataset.theme = theme;
    else delete document.body.dataset.theme;
    return () => { delete document.body.dataset.theme; };
  }, [authed, theme]);

  /* cor de destaque — remapeia os tokens de oliva (todos da paleta quente CE.X) */
  useEffect(() => {
    const s = document.body.style;
    const keys = ['--olive', '--olive-soft', '--olive-deep', '--olive-dim', '--olive-line'];
    const a = (window.SVC.ACCENTS || []).find((x) => x.id === accent);
    if (!authed || accent === 'olive' || !a) { keys.forEach((k) => s.removeProperty(k)); return; }
    s.setProperty('--olive', a.hex);
    s.setProperty('--olive-soft', a.soft);
    s.setProperty('--olive-deep', a.deep);
    s.setProperty('--olive-dim', `rgba(${a.rgb},0.12)`);
    s.setProperty('--olive-line', `rgba(${a.rgb},0.30)`);
  }, [authed, accent]);

  const changeTheme = (t) => { setTheme(t); localStorage.setItem('cex_theme', t); };
  const changeAccent = (a) => { setAccent(a); localStorage.setItem('cex_accent', a); };

  window.cexAbrirCheckin = (cultoId, token) => setCheckinReq({ cultoId, token });
  if (checkinReq) return <CheckinLanding cultoId={checkinReq.cultoId} token={checkinReq.token} onDone={() => { setCheckinReq(null); try { history.replaceState(null, '', location.pathname); } catch (e) {} }} />;

  if (!authed) return <Login onEnter={(mem) => {
    if (mem && !mem.onboarded) { try { if (localStorage.getItem('cex_onboarded_' + mem.id) === '1') mem.onboarded = true; } catch (e) {} }
    if (mem && !mem.onboarded) { setOnboardUser(mem); }
    setAuthed(true);
  }} />;

  if (onboardUser) return <Onboarding membro={onboardUser} onDone={() => setOnboardUser(null)} />;

  const go = (r) => { setDrawer(null); setRoute(r); };
  window.cexGo = go;
  const openPessoa = (id) => setDrawer({ kind: 'pessoa', id });
  const openMembro = (id) => setDrawer({ kind: 'membro', id });
  const openTime = (id) => setDrawer({ kind: 'time', id });
  const openCulto = (id) => setDrawer({ kind: 'culto', id });
  const openVisitante = (id) => setDrawer({ kind: 'visitante', id });
  const openDecisao = (id) => setDrawer({ kind: 'decisao', id });
  const openBatismo = (id) => setDrawer({ kind: 'batismo', id });
  const openCurso = (id) => setDrawer({ kind: 'curso', id });
  const close = () => setDrawer(null);

  return (
    <div className="app">
      <Sidebar route={route} go={go} cong={cong} setCong={setCong} gaps={gaps} onLogout={() => setAuthed(false)} />
      <div className="main">
        <Topbar crumb={CRUMBS[route] || 'CE.X SERVICE'} onMobile={() => setMobile(true)} theme={theme} onTheme={() => changeTheme(theme === 'light' ? 'dark' : 'light')} go={go} openMembro={openMembro} openPessoa={openPessoa} openTime={openTime} />
        {route === 'painel' && <Painel go={go} openCulto={openCulto} />}
        {route === 'membros' && <Membros openMembro={openMembro} />}
        {route === 'pessoas' && <Pessoas openPessoa={openPessoa} />}
        {route === 'times' && <Times openTime={openTime} />}
        {route === 'visitantes' && <Visitantes openVisitante={openVisitante} />}
        {route === 'decisoes' && <Decisoes openDecisao={openDecisao} />}
        {route === 'batismos' && <Batismos openBatismo={openBatismo} />}
        {route === 'cursos' && <Cursos openCurso={openCurso} />}
        {route === 'escalas' && <Escalas />}
        {route === 'reunioes' && <Reunioes openPessoa={openPessoa} go={go} only="reunioes" />}
        {route === 'ensaios' && <Reunioes openPessoa={openPessoa} go={go} only="ensaios" />}
        {route === 'quadros' && <Quadros openPessoa={openPessoa} />}
        {route === 'cultos' && <Cultos openCulto={openCulto} />}
        {route === 'comunicacao' && <Comunicacao />}
        {route === 'conversas' && <Conversas />}
        {route === 'relatorios' && <Relatorios go={go} />}
        {route === 'identidade' && <Identidade />}
        {route === 'historia' && <NossaHistoria />}
        {route === 'config' && <Configuracoes theme={theme} setTheme={changeTheme} accent={accent} setAccent={changeAccent} />}
      </div>

      {drawer && drawer.kind === 'pessoa' && <PessoaDrawer id={drawer.id} onClose={close} openTime={openTime} />}
      {drawer && drawer.kind === 'membro' && <MembroDrawer id={drawer.id} onClose={close} openPessoa={openPessoa} />}
      {drawer && drawer.kind === 'time' && <TimeDrawer id={drawer.id} onClose={close} openPessoa={openPessoa} go={go} />}
      {drawer && drawer.kind === 'culto' && <CultoDrawer id={drawer.id} onClose={close} openPessoa={openPessoa} go={go} />}
      {drawer && drawer.kind === 'visitante' && <VisitanteDrawer id={drawer.id} onClose={close} openPessoa={openPessoa} />}
      {drawer && drawer.kind === 'decisao' && <DecisaoDrawer id={drawer.id} onClose={close} openMembro={openMembro} />}
      {drawer && drawer.kind === 'batismo' && <BatismoDrawer id={drawer.id} onClose={close} openMembro={openMembro} />}
      {drawer && drawer.kind === 'curso' && <CursoDrawer id={drawer.id} onClose={close} openMembro={openMembro} />}

      <button className="mob-launch" onClick={() => setMobile(true)}>◷ Ver app do membro</button>
      {mobile && <MobileOverlay onClose={() => setMobile(false)} theme={theme} setTheme={changeTheme} />}
      <InstallBanner />
      <CreateHost />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
