"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import AuthShell from "../AuthShell";
import PasswordInput from "../PasswordInput";

type Fase = "carregando" | "pronto" | "invalido" | "feito";
const RECOVERY_FLAG = "cex_recovery";

/* A pessoa chega aqui pelo link do e-mail, sem precisar da senha antiga: o
   link traz a autorização depois do # (access_token/refresh_token), que vira
   sessão aqui mesmo. Funciona em qualquer navegador ou aparelho. Quem já
   está logado (ex: veio do próprio app) também pode trocar a senha.
   Casca AuthShell (service-v5.css) com a marca da igreja do aparelho. */
export default function NovaSenhaForm({
  loginHref,
  churchName,
  logoUrl,
}: {
  loginHref: string;
  churchName?: string | null;
  logoUrl?: string | null;
}) {
  const [fase, setFase] = useState<Fase>("carregando");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const iniciou = useRef(false);
  useEffect(() => {
    /* uma vez só (em dev o efeito roda duas vezes e o link é de uso único) */
    if (iniciou.current) return;
    iniciou.current = true;

    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const access = hash.get("access_token");
    const refresh = hash.get("refresh_token");
    const linkComErro = hash.has("error") || hash.has("error_code");
    /* tira a autorização (ou o erro) da barra de endereço e do histórico antes
       de qualquer espera */
    if (window.location.hash) window.history.replaceState(null, "", window.location.pathname);

    const supabase = createServiceBrowserClient();
    (async () => {
      if (linkComErro) return setFase("invalido");
      if (access && refresh) {
        const { error: sessionError } = await supabase.auth.setSession({ access_token: access, refresh_token: refresh });
        if (sessionError) return setFase("invalido");
        /* marca que ESTA aba chegou por um link de recuperação: recarregar a
           página não perde o formulário */
        try { sessionStorage.setItem(RECOVERY_FLAG, "1"); } catch { /* segue sem a marca */ }
        return setFase("pronto");
      }
      /* sem link: só vale se esta aba já tinha chegado por um (recarregou a
         página). Abrir o endereço direto num aparelho com alguém logado não
         pode virar "trocar a senha dessa pessoa sem saber a atual". */
      let veioDeLink = false;
      try { veioDeLink = sessionStorage.getItem(RECOVERY_FLAG) === "1"; } catch { /* sem sessionStorage */ }
      const { data } = veioDeLink ? await supabase.auth.getUser() : { data: { user: null } };
      setFase(data.user ? "pronto" : "invalido");
    })();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");
    if (password !== confirm) return setError("As duas senhas não são iguais.");
    setLoading(true);
    const { error: updateError } = await createServiceBrowserClient().auth.updateUser({ password });
    setLoading(false);
    if (updateError) {
      const igual = updateError.code === "same_password" || /different from the old/i.test(updateError.message);
      return setError(igual ? "Escolha uma senha diferente da atual." : "Não foi possível salvar a senha. Tente de novo.");
    }
    try { sessionStorage.removeItem(RECOVERY_FLAG); } catch { /* nada a limpar */ }
    setFase("feito");
  };

  const shell = { churchName, logoUrl, eyebrow: "Senha nova" };

  if (fase === "carregando") {
    return <AuthShell {...shell} title="Conferindo o seu link..." />;
  }

  if (fase === "invalido") {
    return (
      <AuthShell
        {...shell}
        title="Este link não vale mais"
        subtitle="O link de troca de senha expirou ou já foi usado. Volte para o login e toque de novo em Esqueci minha senha."
      >
        <Link href={loginHref} className="login-btn">Voltar para o login</Link>
      </AuthShell>
    );
  }

  if (fase === "feito") {
    return (
      <AuthShell {...shell} title="Senha alterada" subtitle="Sua senha nova já está valendo. Use ela na próxima vez que entrar.">
        {/* carga completa da página (não router.push): a sessão acabou de nascer neste aparelho */}
        <button className="login-btn" type="button" onClick={() => window.location.assign("/service")}>
          Entrar no app →
        </button>
      </AuthShell>
    );
  }

  return (
    <AuthShell {...shell} title="Crie uma senha nova" subtitle="Use pelo menos 6 caracteres. Depois é só entrar com ela.">
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <label className="login-field">
          <span className="login-label">Senha nova</span>
          <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
        </label>
        <label className="login-field">
          <span className="login-label">Repita a senha</span>
          <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
        </label>
        {error && (
          <div className="login-alert" role="alert">
            {error}
          </div>
        )}
        <button className="login-btn" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar senha nova"}
        </button>
      </form>
    </AuthShell>
  );
}
