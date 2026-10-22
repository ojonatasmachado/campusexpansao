"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import PasswordInput from "../../PasswordInput";

import { Botao } from "../../ui/Botao";
/* Formulário do link da igreja: nome, telefone, e-mail e senha. A conta
   nasce no servidor (/api/service/entrada); aqui só entra com a senha e
   segue pro /service, que mostra o app (regra "direto") ou a espera do
   pedido (onboarding). Com confirmação de e-mail ligada, pede pra conferir
   o e-mail antes. Markup nas classes .login-*. */

function telefoneLegivel(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

export default function EntradaForm({ codigo, igreja, direto }: { codigo: string; igreja: string; direto: boolean }) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmar, setConfirmar] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const n = nome.trim().replace(/\s+/g, " ");
    if (n.length < 2 || !n.includes(" ")) return setError("Coloque seu nome e sobrenome.");
    if (telefone.replace(/\D/g, "").length < 10) return setError("Coloque o telefone com DDD.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Coloque um e-mail válido.");
    if (senha.length < 6) return setError("A senha precisa ter pelo menos 6 caracteres.");

    setLoading(true);
    try {
      const res = await fetch("/api/service/entrada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, nome: n, telefone, email, senha }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Não conseguimos criar sua conta agora. Tente de novo.");
        return;
      }
      if (data.slug) document.cookie = `cex_church_slug=${data.slug}; path=/; max-age=31536000; samesite=lax`;
      if (data.estado === "confirmar") {
        setConfirmar(data.email ?? email);
        return;
      }
      const client = createServiceBrowserClient();
      const { error: signInError } = await client.auth.signInWithPassword({ email: data.email ?? email, password: senha });
      if (signInError) {
        router.push(data.slug ? `/${data.slug}/entrar` : "/service/login");
        return;
      }
      /* regra "direto": ativa já, antes de abrir o app */
      if (data.estado === "direto") await client.schema("service").rpc("entrada_minha");
      router.push("/service");
      router.refresh();
    } catch {
      setError("Sem conexão agora. Confira a internet e tente de novo.");
    } finally {
      setLoading(false);
    }
  };

  if (confirmar) {
    return (
      <div className="login-form" role="status">
        <div className="login-alert">
          {`Mandamos um link para ${confirmar}. Abra o e-mail, confirme a conta e depois entre com sua senha.`}
        </div>
        <span className="login-help">Não chegou? Olhe a caixa de spam ou promoções.</span>
      </div>
    );
  }

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label className="login-field">
        <span className="login-label">Nome e sobrenome</span>
        <input
          className="login-input"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          autoComplete="name"
          autoCapitalize="words"
          enterKeyHint="next"
          maxLength={120}
        />
      </label>
      <label className="login-field">
        <span className="login-label">Telefone com DDD</span>
        <input
          className="login-input"
          type="tel"
          inputMode="tel"
          value={telefoneLegivel(telefone)}
          onChange={(e) => setTelefone(e.target.value.replace(/\D/g, "").slice(0, 11))}
          autoComplete="tel-national"
          enterKeyHint="next"
          placeholder="(00) 00000-0000"
        />
      </label>
      <label className="login-field">
        <span className="login-label">E-mail</span>
        <input
          className="login-input"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          enterKeyHint="next"
          placeholder="voce@email.com"
          maxLength={200}
        />
      </label>
      <label className="login-field">
        <span className="login-label">Crie uma senha</span>
        <PasswordInput value={senha} onChange={setSenha} autoComplete="new-password" placeholder="Mínimo 6 caracteres" />
      </label>
      {error && (
        <div className="login-alert" role="alert">
          {error}
        </div>
      )}
      <Botao tamanho="entrada" variante="principal" type="submit" desativado={loading}>
        {loading ? "Aguarde..." : direto ? "Criar conta e entrar" : "Criar conta e pedir entrada"}
      </Botao>
      <span className="login-help">{`Seu nome e telefone ficam só com a liderança da ${igreja}.`}</span>
    </form>
  );
}
