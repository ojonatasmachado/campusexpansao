"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createServiceBrowserClient } from "../lib/supabase-browser";

type Fase = "carregando" | "pronto" | "invalido" | "feito";
const RECOVERY_FLAG = "cex_recovery";

/* A pessoa chega aqui pelo link do e-mail, sem precisar da senha antiga: o
   link traz a autorização depois do # (access_token/refresh_token), que vira
   sessão aqui mesmo. Funciona em qualquer navegador ou aparelho. Quem já
   está logado (ex: veio do próprio app) também pode trocar a senha. */
export default function NovaSenhaForm({ loginHref }: { loginHref: string }) {
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

  if (fase === "carregando") {
    return <p className="t-body" style={{ color: "var(--light)", marginTop: 12 }}>Conferindo o seu link...</p>;
  }

  if (fase === "invalido") {
    return (
      <>
        <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>Este link não vale mais</h1>
        <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
          O link de troca de senha expirou ou já foi usado. Volte ao login e toque de novo em Esqueci minha senha.
        </p>
        <Link href={loginHref} className="btn btn-primary btn-lg" style={{ marginTop: 24 }}>Voltar ao login →</Link>
      </>
    );
  }

  if (fase === "feito") {
    return (
      <>
        <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>Senha alterada</h1>
        <p className="t-body" style={{ color: "var(--light)", marginTop: 10 }}>
          Sua senha nova já está valendo. Use ela na próxima vez que entrar.
        </p>
        {/* carga completa da página (não router.push): a sessão acabou de nascer neste aparelho */}
        <button className="btn btn-primary btn-lg" type="button" style={{ marginTop: 24 }} onClick={() => window.location.assign("/service")}>
          Entrar no app →
        </button>
      </>
    );
  }

  return (
    <>
      <h1 className="t-h1" style={{ color: "var(--cream)", marginTop: 12 }}>Crie uma senha nova</h1>
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 16, marginTop: 24 }}>
        <label className="field">
          <span className="field-label req">Senha nova</span>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
        </label>
        <label className="field">
          <span className="field-label req">Repita a senha</span>
          <input className="input" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </label>
        {error && <p className="field-error">{error}</p>}
        <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Salvar senha nova"}
        </button>
      </form>
    </>
  );
}
