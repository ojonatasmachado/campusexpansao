"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import CepInput, { type CepResult } from "../CepInput";
import PasswordInput from "../PasswordInput";
import { AVISO_CEP, TERMO_MAPA_VERSAO, pontosDoTermo, termoCompleto } from "../lib/termo-mapa";

import { useTexto, useServiceLocale } from "../lib/internacional/contexto";
import { Botao } from "../ui/Botao";
import { Acao } from "../ui/Acao";
/* CEP no aceite brasileiro: a igreja conhece a região da comunidade. */
export default function ConviteForm({ t, churchName }: { t: string; churchName?: string }) {
  const traduzirUi = useTexto();
  const locale = useServiceLocale();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consultandoCep, setConsultandoCep] = useState(false);
  const [brasil, setBrasil] = useState(true);
  const [pais, setPais] = useState("");
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState<CepResult>({});
  const patchEndereco = (k: keyof CepResult, v: string) => setEndereco((p) => ({ ...p, [k]: v }));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError(traduzirUi("Coloque um e-mail válido."));
    if (password.length < 6) return setError(traduzirUi("A senha precisa ter pelo menos 6 caracteres."));
    if (password !== confirm) return setError(traduzirUi("As duas senhas não são iguais."));

    if (brasil && !/^\d{5}-?\d{3}$/.test(cep.trim())) return setError(traduzirUi("Coloque o CEP com 8 números."));
    if (!brasil && pais.trim().length < 2) return setError(traduzirUi("Informe o país onde você mora."));
    if (consultandoCep) return setError(traduzirUi("Aguarde a consulta do CEP terminar."));
    if (!brasil && !endereco.city?.trim()) return setError(traduzirUi("Informe sua cidade."));
    setLoading(true);
    try {
      const res = await fetch("/api/service/members/accept-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-service-locale": locale },
        body: JSON.stringify({
          t,
          email,
          password,
          cep,
          country: brasil ? "Brasil" : pais.trim(),
          street: endereco.street,
          neighborhood: endereco.neighborhood,
          city: endereco.city,
          state: endereco.state,
          /* "Concordo e criar acesso": aceite do termo com os 3 pontos visíveis */
          termoMapa: TERMO_MAPA_VERSAO,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? traduzirUi("Não foi possível criar seu acesso. Tente de novo."));
        return;
      }
      /* lembra a igreja pra, se a sessão cair, o app mandar pro login dela */
      if (data.slug) document.cookie = `cex_church_slug=${data.slug}; path=/; max-age=31536000; samesite=lax`;
      const { error: signInError } = await createServiceBrowserClient().auth.signInWithPassword({ email: data.email ?? email, password });
      router.push(signInError ? (data.slug ? `/${data.slug}/entrar` : "/service/login") : "/service");
      router.refresh();
    } catch {
      setError(traduzirUi("Não conseguimos concluir agora. Confira sua conexão e tente novamente. Se o acesso já foi criado, entre com seu e-mail e senha."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit} noValidate>
      <label className="login-field">
        <span className="login-label">{traduzirUi("E-mail")}</span>
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
          placeholder={traduzirUi("voce@email.com")}
        />
      </label>
      <label className="login-field">
        <span className="login-label">{traduzirUi("Crie uma senha")}</span>
        <PasswordInput value={password} onChange={setPassword} autoComplete="new-password" placeholder={traduzirUi("Mínimo 6 caracteres")} />
      </label>
      <label className="login-field">
        <span className="login-label">{traduzirUi("Repita a senha")}</span>
        <PasswordInput value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </label>
      {!brasil && <label className="login-field"><span className="login-label">{traduzirUi("País")}</span><input className="login-input" autoComplete="country-name" maxLength={80} value={pais} onChange={(e) => setPais(e.target.value)} /></label>}
      <div className="login-field">
        <label className="login-label" htmlFor="convite-postal">{brasil ? traduzirUi("CEP de onde você mora") : traduzirUi("Código postal (se houver)")}</label>
        <CepInput key={brasil ? "br" : "outro"} id="convite-postal" international={!brasil} brazilLookup={brasil} value={cep} onBusyChange={setConsultandoCep} onChange={(v) => { setCep(v); if (brasil) setEndereco({}); }} onResult={(r) => { if (r) setEndereco(r); }} />
        <span className="login-help">{brasil ? traduzirUi(AVISO_CEP) : traduzirUi("Seu endereço ajuda a igreja a conhecer e cuidar das pessoas da sua região.")}</span>
        {endereco.city && <span className="login-help">{[endereco.street, endereco.neighborhood, endereco.city, endereco.state].filter(Boolean).join(" · ")}</span>}
      </div>
      <Acao className="login-country-switch" onClick={() => { setBrasil((v) => !v); setConsultandoCep(false); setCep(""); setEndereco({}); }}>{brasil ? traduzirUi("Meu endereço é fora do Brasil") : traduzirUi("Moro no Brasil")}</Acao>
      {!brasil ? (
        <label className="login-field"><span className="login-label">{traduzirUi("Cidade")}</span><input className="login-input" autoComplete="address-level2" value={endereco.city ?? ""} onChange={(e) => patchEndereco("city", e.target.value)} /></label>
      ) : null}
      {error && (
        <div className="login-alert" role="alert">
          {error}
        </div>
      )}
      <div className="login-field">
        <ul className="login-termo">
          {pontosDoTermo(churchName, traduzirUi).map((p) => <li key={p}>{p}</li>)}
        </ul>
        <details className="login-termo-completo">
          <summary>{traduzirUi("Ler o termo completo")}</summary>
          {termoCompleto(churchName, traduzirUi).map((p) => <p key={p}>{p}</p>)}
        </details>
      </div>
      <Botao tamanho="entrada" variante="principal" type="submit" desativado={loading || consultandoCep}>
        {loading ? traduzirUi("Aguarde...") : consultandoCep ? traduzirUi("Buscando endereço...") : traduzirUi("Concordo e criar acesso")}
      </Botao>
    </form>
  );
}
