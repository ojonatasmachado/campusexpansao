/* ════════════════════════════════════════════════════════════════
   CE.X SERVICE · ONBOARDING (primeiro login do membro)
   Quem entra pela 1ª vez completa os dados, sobe a foto e troca a
   senha antes de acessar o app. Pulável só depois do essencial.
   ════════════════════════════════════════════════════════════════ */

function Onboarding({ membro, onDone }) {
  const [step, setStep] = useState(0);
  const [d, setD] = useState({
    nasc: membro.nasc || '', bairro: membro.bairro || '', email: membro.email || '',
    senha: '', senha2: '',
  });
  const set = (k, v) => setD((p) => ({ ...p, [k]: v }));
  const foto = useImg(membro.id);

  const finalizar = () => {
    membro.nasc = d.nasc; membro.bairro = d.bairro;
    if (d.senha && d.senha.length >= 4) membro.senha = d.senha;
    membro.onboarded = true;
    try { localStorage.setItem('cex_onboarded_' + membro.id, '1'); } catch (e) {}
    cexToast('Tudo pronto! Bem-vindo(a) ao app.');
    onDone();
  };

  const steps = [
    {
      t: 'Bem-vindo(a) à casa', s: 'Que bom ter você aqui, ' + membro.nome.split(' ')[0] + '. Vamos completar seu cadastro em um minuto.',
      body: (
        <div className="ob-welcome">
          <div className="ob-mark">◆</div>
          <div className="ob-welcome-x">Seu acesso foi liberado. Antes de começar, confirme seus dados, escolha uma foto e crie sua senha.</div>
        </div>
      ),
      ok: 'Começar →', valid: true,
    },
    {
      t: 'Seus dados', s: 'Confirme as informações para mantermos contato e celebrar suas datas.',
      body: (
        <div className="ob-form">
          <div className="field"><label className="field-label">E-mail</label><input className="input" value={d.email} onChange={(e) => set('email', e.target.value)} /></div>
          <div className="field"><label className="field-label">Aniversário</label><DatePicker value={d.nasc} onChange={(v) => set('nasc', v)} /></div>
          <div className="field"><label className="field-label">Bairro</label><input className="input" value={d.bairro} placeholder="Onde você mora" onChange={(e) => set('bairro', e.target.value)} /></div>
        </div>
      ),
      ok: 'Continuar →', valid: !!d.nasc,
    },
    {
      t: 'Sua foto', s: 'Coloque uma foto sua — aparece no lugar das iniciais. Só você pode mudar depois.',
      body: (
        <div className="ob-foto">
          <ImgUpload id={membro.id} label="Foto de perfil" hint="Toque para enviar. Opcional, mas deixa tudo com mais cara de casa." round />
        </div>
      ),
      ok: foto ? 'Continuar →' : 'Pular por agora →', valid: true,
    },
    {
      t: 'Crie sua senha', s: 'Troque a senha inicial (os 4 últimos do telefone) por uma só sua.',
      body: (
        <div className="ob-form">
          <div className="field"><label className="field-label">Nova senha</label><input className="input" type="password" value={d.senha} placeholder="ao menos 4 caracteres" onChange={(e) => set('senha', e.target.value)} /></div>
          <div className="field"><label className="field-label">Repita a senha</label><input className="input" type="password" value={d.senha2} onChange={(e) => set('senha2', e.target.value)} /></div>
          {d.senha && d.senha !== d.senha2 && <div style={{ fontSize: 12, color: 'var(--danger)' }}>As senhas não conferem.</div>}
          <div style={{ fontSize: 12, color: 'var(--subtle)' }}>Quer trocar depois? Pode pular e fazer no seu perfil.</div>
        </div>
      ),
      ok: 'Entrar no app →', valid: !d.senha || (d.senha.length >= 4 && d.senha === d.senha2),
    },
  ];
  const cur = steps[step];

  return (
    <div className="ob">
      <div className="ob-card">
        <div className="ob-progress">{steps.map((_, i) => <div key={i} className={`ob-dot ${i <= step ? 'on' : ''}`}></div>)}</div>
        <div className="ob-logo"><IgrejaLogo /></div>
        <div className="ob-eyebrow">Primeiro acesso · passo {step + 1} de {steps.length}</div>
        <h1 className="ob-title">{cur.t}</h1>
        <p className="ob-sub">{cur.s}</p>
        <div className="ob-body">{cur.body}</div>
        <div className="ob-actions">
          {step > 0 && <button className="btn btn-sec" onClick={() => setStep(step - 1)}>Voltar</button>}
          <button className="btn btn-pri" style={{ flex: 1, justifyContent: 'center' }} disabled={!cur.valid} onClick={() => step < steps.length - 1 ? setStep(step + 1) : finalizar()}>{cur.ok}</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Onboarding });
