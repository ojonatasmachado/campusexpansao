'use client'
import { useState, useTransition } from 'react'
import { completeAdminSetup } from '../../actions'
import Logo from '../../../../components/Logo'

export default function SetupAccessClient({
  token,
  invite,
}: {
  token: string
  invite: { name: string; username: string } | null
}) {
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!invite) {
    return (
      <div className="login">
        <div className="login-grid" />
        <div className="login-x">X</div>
        <div className="login-card">
          <div className="login-logo"><Logo /></div>
          <div className="login-eyebrow">◆ CONVITE</div>
          <h1 className="login-title">Link inválido ou expirado</h1>
          <p className="login-sub">Esse link de configuração já foi usado, expirou ou não existe. Peça ao administrador master pra gerar um novo.</p>
        </div>
        <div className="login-foot">CE.X · Campus Expansão · campusexpansao.com</div>
      </div>
    )
  }

  const submit = () => {
    if (pending) return
    if (pw.length < 8) { setErr('A senha precisa ter pelo menos 8 caracteres.'); return }
    if (pw !== pw2) { setErr('As senhas não são iguais.'); return }
    setErr('')
    startTransition(async () => {
      const ok = await completeAdminSetup(token, pw)
      if (ok) {
        setDone(true)
        window.setTimeout(() => { window.location.href = '/admin' }, 700)
      } else {
        setErr('Não foi possível configurar o acesso. O link pode ter expirado — peça um novo.')
      }
    })
  }

  return (
    <div className="login">
      <div className="login-grid" />
      <div className="login-x">X</div>
      <div className={`login-card${err ? ' shake' : ''}`}>
        <div className="login-logo"><Logo /></div>
        <div className="login-eyebrow">◆ CONFIGURAR ACESSO</div>
        <h1 className="login-title">Bem-vindo(a), {invite.name || invite.username}</h1>
        <p className="login-sub">Escolha a sua senha de acesso ao painel interno. Usuário: <strong>{invite.username}</strong></p>
        {done ? (
          <p className="login-sub">Tudo certo, entrando...</p>
        ) : (
          <>
            <input className="login-input" type="password" value={pw} placeholder="Nova senha (mín. 8 caracteres)"
              autoFocus autoComplete="new-password" onChange={(e) => setPw(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            <input className="login-input" type="password" value={pw2} placeholder="Confirme a senha"
              autoComplete="new-password" onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submit()} />
            {err && <p className="login-sub" style={{ color: 'var(--rust, #9C5A33)' }}>{err}</p>}
            <button className="login-btn" onClick={submit} disabled={pending}>
              {pending ? 'Configurando...' : 'Definir senha e entrar →'}
            </button>
          </>
        )}
      </div>
      <div className="login-foot">CE.X · Campus Expansão · campusexpansao.com</div>
    </div>
  )
}
