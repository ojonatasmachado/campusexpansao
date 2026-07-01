/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · CAMADA PWA (instalar na tela inicial + push)
   Tudo guardado por feature-detection: no protótipo/preview os ganchos
   não quebram; em produção (Claude Code + HTTPS) ativam de verdade.
   ════════════════════════════════════════════════════════════════ */

/* hook de instalação — captura beforeinstallprompt (preparado em index.html) */
function useInstall() {
  const [ready, setReady] = useState(!!window.__cexDeferredPrompt);
  const [installed, setInstalled] = useState(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  useEffect(() => {
    const onR = () => setReady(true);
    const onI = () => { setInstalled(true); setReady(false); };
    window.addEventListener('cex-installable', onR);
    window.addEventListener('appinstalled', onI);
    return () => { window.removeEventListener('cex-installable', onR); window.removeEventListener('appinstalled', onI); };
  }, []);
  const install = async () => {
    const dp = window.__cexDeferredPrompt;
    if (dp) { dp.prompt(); try { await dp.userChoice; } catch (_) {} window.__cexDeferredPrompt = null; setReady(false); }
    else { alert('No celular: toque em Compartilhar → "Adicionar à Tela de Início".\nNo desktop: ícone de instalar na barra de endereço.'); }
  };
  return { ready, installed, install };
}

/* banner discreto na base do app desktop */
function InstallBanner() {
  const { ready, installed, install } = useInstall();
  const [hidden, setHidden] = useState(() => localStorage.getItem('cex_install_dismiss') === '1');
  if (installed || hidden) return null;
  return (
    <div className="pwa-banner">
      <span className="pwa-banner-ic">◆</span>
      <div className="pwa-banner-main">
        <b>Instale o CE.X Service</b>
        <small>Adicione à tela inicial e use como app — abre rápido e funciona offline.</small>
      </div>
      <button className="btn btn-pri btn-sm" onClick={install}>{ready ? 'Instalar' : 'Como instalar'}</button>
      <button className="pwa-banner-x" onClick={() => { setHidden(true); localStorage.setItem('cex_install_dismiss', '1'); }}>✕</button>
    </div>
  );
}

/* toggle de notificações push (membro/perfil) */
function PushToggle() {
  const supported = typeof Notification !== 'undefined';
  const [perm, setPerm] = useState(supported ? Notification.permission : 'unsupported');
  const ask = async () => {
    if (!supported) { setPerm('unsupported'); return; }
    try {
      const r = await Notification.requestPermission();
      setPerm(r);
      if (r === 'granted') { try { new Notification('CE.X Service', { body: 'Notificações ativadas. Você será avisado de escalas e avisos.', icon: './icons/icon-192.png' }); } catch (_) {} }
    } catch (_) {}
  };
  const on = perm === 'granted';
  return (
    <div className="m-card" style={{ marginTop: 14 }}>
      <div className="m-data" style={{ borderBottom: 'none', paddingTop: 0 }}>
        <div><b style={{ display: 'block' }}>Notificações push</b><small style={{ color: 'var(--muted)', fontSize: 11.5 }}>Escalas, trocas e avisos da liderança</small></div>
        <button className={`m-toggle ${on ? 'on' : ''}`} onClick={ask} title="Ativar notificações"></button>
      </div>
      {perm === 'denied' && <div style={{ fontSize: 11.5, color: 'var(--danger)', marginTop: 8 }}>Bloqueado no navegador. Libere nas configurações do site.</div>}
      {perm === 'unsupported' && <div style={{ fontSize: 11.5, color: 'var(--subtle)', marginTop: 8 }}>Disponível quando instalado como app.</div>}
    </div>
  );
}

Object.assign(window, { useInstall, InstallBanner, PushToggle });
