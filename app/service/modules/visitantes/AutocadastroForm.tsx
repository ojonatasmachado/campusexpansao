"use client";

import { useRef, useState, type FormEvent } from "react";
import AuthShell from "../../AuthShell";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { COMO_CONHECEU, digitosTelefone, mascaraTelefone } from "./autocadastro";

import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
type Campo = "nome" | "tel" | "email" | "consent";
type Erros = Partial<Record<Campo, string>>;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* Formulário público do visitante (/[slug]/visita). Casca AuthShell, campos
   .login-*. Valida aqui para responder rápido; a RPC valida de novo. */
export default function AutocadastroForm({
  slug,
  churchName,
  logoUrl,
  interesses,
}: {
  slug: string;
  churchName: string;
  logoUrl: string | null;
  interesses: { v: string; l: string }[];
}) {
  const [nome, setNome] = useState("");
  const [tel, setTel] = useState("");
  const [email, setEmail] = useState("");
  const [como, setComo] = useState("");
  const [convidou, setConvidou] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);
  const [erros, setErros] = useState<Erros>({});
  const [falha, setFalha] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [feito, setFeito] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const validar = (): Erros => {
    const e: Erros = {};
    if (nome.trim().length < 2) e.nome = "Digite seu nome.";
    const d = digitosTelefone(tel);
    if (d.length !== 10 && d.length !== 11) e.tel = "Confira o número com DDD. Exemplo: (11) 9 1234-5678.";
    if (email.trim() && !EMAIL_RE.test(email.trim())) e.email = "Confira o e-mail ou deixe em branco.";
    if (!consent) e.consent = "Para enviar, marque a autorização de contato.";
    return e;
  };

  const focarPrimeiro = (e: Erros) => {
    const ordem: Campo[] = ["nome", "tel", "email", "consent"];
    const primeiro = ordem.find((k) => e[k]);
    if (primeiro) formRef.current?.querySelector<HTMLElement>(`[name="${primeiro}"]`)?.focus();
  };

  const enviar = async (ev: FormEvent) => {
    ev.preventDefault();
    if (enviando) return;
    setFalha(null);
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) {
      focarPrimeiro(e);
      return;
    }
    setEnviando(true);
    const { data, error } = await createServiceBrowserClient()
      .schema("service")
      .rpc("visitante_autocadastro", {
        p_slug: slug,
        p_name: nome.trim(),
        p_phone: tel,
        p_email: email.trim() || null,
        p_heard_from: como || null,
        p_invited_by: convidou.trim() || null,
        p_interests: marcados,
        p_consent: consent,
      });
    setEnviando(false);
    const r = error ? "erro" : String(data);
    /* "repetido" = o mesmo telefone acabou de enviar (toque duplo, voltar e
       enviar de novo): para a pessoa, já deu certo */
    if (r === "ok" || r === "repetido") {
      setFeito(nome.trim().split(" ")[0]);
      window.scrollTo({ top: 0 });
      return;
    }
    const porCampo: Record<string, Erros> = {
      nome: { nome: "Digite seu nome." },
      telefone: { tel: "Confira o número com DDD. Exemplo: (11) 9 1234-5678." },
      email: { email: "Confira o e-mail ou deixe em branco." },
      consentimento: { consent: "Para enviar, marque a autorização de contato." },
    };
    if (porCampo[r]) {
      setErros(porCampo[r]);
      focarPrimeiro(porCampo[r]);
      return;
    }
    setFalha(
      r === "fechado"
        ? "Este link parou de receber cadastros. Procure alguém da recepção."
        : r === "limite"
          ? "Muitos cadastros chegaram ao mesmo tempo. Espere um minuto e envie de novo."
          : "Não deu para enviar agora. Confira sua internet e tente de novo.",
    );
  };

  if (feito) {
    return (
      <AuthShell
        logoUrl={logoUrl}
        churchName={churchName}
        eyebrow="Contato recebido"
        title={`Obrigado, ${feito}`}
        subtitle={`Alguém da ${churchName} vai falar com você pelo WhatsApp nos próximos dias. Que bom que você veio.`}
        footer="Pode fechar esta página."
      />
    );
  }

  const toggle = (v: string) => setMarcados((m) => (m.includes(v) ? m.filter((x) => x !== v) : [...m, v]));
  const erroDe = (k: Campo) =>
    erros[k] ? (
      <span className="vis-err" id={`vis-${k}-err`}>
        {erros[k]}
      </span>
    ) : null;
  const aria = (k: Campo) => (erros[k] ? { "aria-invalid": true, "aria-describedby": `vis-${k}-err` } : {});

  return (
    <AuthShell
      logoUrl={logoUrl}
      churchName={churchName}
      eyebrow="Primeira visita"
      title="Que bom ter você aqui"
      subtitle="Deixe seu contato para a gente te conhecer melhor. Leva menos de um minuto."
    >
      <form ref={formRef} className="login-form vis-form" onSubmit={enviar} noValidate>
        <label className="login-field">
          <span className="login-label">Seu nome</span>
          <input
            className="login-input"
            name="nome"
            autoComplete="name"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={120}
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            {...aria("nome")}
          />
          {erroDe("nome")}
        </label>

        <label className="login-field">
          <span className="login-label">WhatsApp</span>
          <input
            className="login-input"
            name="tel"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            enterKeyHint="next"
            placeholder="(11) 9 1234-5678"
            value={tel}
            onChange={(e) => setTel(mascaraTelefone(e.target.value))}
            {...aria("tel")}
          />
          {erroDe("tel")}
        </label>

        <label className="login-field">
          <span className="login-label">
            E-mail <span className="vis-opt">opcional</span>
          </span>
          <input
            className="login-input"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            enterKeyHint="next"
            maxLength={160}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            {...aria("email")}
          />
          {erroDe("email")}
        </label>

        <label className="login-field">
          <span className="login-label">
            Como conheceu a igreja? <span className="vis-opt">opcional</span>
          </span>
          <span className="vis-sel">
          <select className="login-input" name="como" value={como} onChange={(e) => setComo(e.target.value)}>
            <option value="">Escolha uma opção</option>
            {COMO_CONHECEU.map((o) => (
              <option key={o.v} value={o.v}>
                {o.l}
              </option>
            ))}
          </select>
          </span>
        </label>

        <label className="login-field">
          <span className="login-label">
            Quem te convidou? <span className="vis-opt">opcional</span>
          </span>
          <input
            className="login-input"
            name="convidou"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            maxLength={120}
            placeholder="Nome de quem te chamou"
            value={convidou}
            onChange={(e) => setConvidou(e.target.value)}
          />
        </label>

        <fieldset className="login-field vis-fs">
          <legend className="login-label">
            Quer saber mais sobre <span className="vis-opt">opcional</span>
          </legend>
          <div className="vis-chips">
            {interesses.map((o) => {
              const on = marcados.includes(o.v);
              return (
                <Opcao key={o.v} marcada={on} estilo="chip-toggle" className="vis-chip" aria-pressed={on} onClick={() => toggle(o.v)}>
                  {o.l}
                </Opcao>
              );
            })}
          </div>
        </fieldset>

        <div className="login-field">
          <label className={`vis-consent${erros.consent ? " err" : ""}`}>
            <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} {...aria("consent")} />
            <span>
              Autorizo a {churchName} a guardar meu nome e contato para falar comigo sobre a igreja. Meus dados não são
              compartilhados com ninguém de fora, e posso pedir para apagar quando quiser.
            </span>
          </label>
          {erroDe("consent")}
        </div>

        {falha ? (
          <div className="login-alert" role="alert">
            {falha}
          </div>
        ) : null}

        <Botao tamanho="entrada" variante="principal" className="vis-send" type="submit" desativado={enviando}>
          {enviando ? "Enviando..." : "Enviar meu contato"}
        </Botao>
      </form>
    </AuthShell>
  );
}
