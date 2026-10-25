"use client";

import { formatarCpf } from "../lib/cpf";
import { enderecoNoBrasil } from "../lib/endereco";
import { listaFinalidades, type ContribuirCfg } from "../modules/contribuir/pix";
import { useContext, useEffect, useState, useId, useTransition } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Icon } from "../lib/icons";
import { formatCivilDate } from "../lib/internacional/formatar";
import { formatarTelefone } from "../lib/telefone";
import { PhotoPicker } from "../PhotoPicker";
import CepInput from "../CepInput";
import { nomesPosicao, useTextSize } from "../lib/text-scale";
import type { CategoriaAviso } from "../modules/define";
import { Av, M6Row, M6Sheet, MemberUiContext, contactErrors, realValue } from "./comum";
import { AppTourModal } from "./Onboarding";
import { gravarAceiteMapa } from "./AceiteMapa";
import { AVISO_CEP } from "../lib/termo-mapa";
import type { M, MemberContactInput, P } from "./tipos";

import { Botao } from "../ui/Botao";
import { Interruptor } from "../ui/Interruptor";
import { Opcao } from "../ui/Opcao";
import { Cartao } from "../ui/Cartao";
import { Linha, Lista } from "../ui/Linha";
import { Campo, Entrada } from "../ui/Campo";
import { SeletorData } from "../ui/Data";
import { useTexto, useServiceLocale, useInternationalEnabled } from "../lib/internacional/contexto";
import { LOCALES, LOCALE_COOKIE, NATIVE_LOCALE_NAMES, isLocale } from "../lib/internacional/contrato";
import { Selecao } from "../ui/Selecao";
import { useRouter } from "next/navigation";
import type { Text } from "../lib/internacional/mensagens";

// ── aba: Perfil ───────────────────────────────────────────────────────────────

/* notificações do celular (push): usado no Perfil e no primeiro acesso */
export function usePush(organizationId?: string) {
  const traduzirUi = useTexto();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");
  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  useEffect(() => {
    if (!pushSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setPushOn(!!sub))
      .catch(() => {});
  }, [pushSupported]);

  const urlBase64ToUint8Array = (base64: string) => {
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const base64Safe = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    const raw = atob(base64Safe);
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
  };

  const ligarPush = async () => {
    if (!pushSupported || !organizationId) return;
    setPushBusy(true);
    setPushMsg("");
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setPushMsg(perm === "denied" ? traduzirUi("Bloqueado no navegador. Libere nas configurações do site.") : traduzirUi("Permissão não concedida."));
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) { setPushMsg(traduzirUi("Push não configurado neste ambiente.")); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await fetch("/api/service/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId, endpoint: json.endpoint, keys: json.keys }),
      });
      setPushOn(true);
    } catch {
      setPushMsg(traduzirUi("Não foi possível ativar agora."));
    } finally {
      setPushBusy(false);
    }
  };

  const desligarPush = async () => {
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/service/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setPushOn(false);
    } catch {
      setPushMsg(traduzirUi("Não foi possível desligar agora."));
    } finally {
      setPushBusy(false);
    }
  };

  return { pushOn, pushBusy, pushMsg, pushSupported, ligarPush, desligarPush };
}

export function TabPerfil({
  person, member, organizationId, theme, setTheme, onChangePassword, onUpdateProfile, onLogout, onSwitchToPanel, view = "home", openSub, contribuir, onContribuir,
}: {
  view?: "home" | "dados" | "senha";
  /* Pix da igreja: atalho no Perfil, além da Caminhada (crítica de design 2026-10-20) */
  contribuir?: ContribuirCfg | null;
  onContribuir?: () => void;
  openSub?: (sub: string) => void;
  onLogout?: () => void;
  onSwitchToPanel?: () => void;
  person: P;
  member: M | null;
  organizationId?: string;
  theme?: "dark" | "light";
  setTheme?: (t: "dark" | "light") => void;
  onChangePassword?: (senha: string) => Promise<{ error?: string }>;
  onUpdateProfile?: (personId: string, memberId: string | null, data: MemberContactInput) => Promise<{ error?: string }>;
}) {
  const traduzirUi = useTexto();
  const locale = useServiceLocale();
  const internationalEnabled = useInternationalEnabled();
  const router = useRouter();
  const [idiomaGravando, setIdiomaGravando] = useState(false);
  const [idiomaAtualizando, atualizarIdioma] = useTransition();
  const [idiomaErro, setIdiomaErro] = useState("");
  const mudarIdioma = async (value: string) => {
    if (!internationalEnabled || !isLocale(value) || value === locale || idiomaGravando || idiomaAtualizando) return;
    setIdiomaGravando(true);
    setIdiomaErro("");
    try {
      const { data, error } = await createServiceBrowserClient().schema("service").rpc("set_my_locale", { p_locale: value });
      if (error || data !== value) throw new Error("locale_not_saved");
      document.cookie = `${LOCALE_COOKIE}=; Path=/service; Max-Age=0; SameSite=Lax`;
      document.cookie = `${LOCALE_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
      atualizarIdioma(() => router.refresh());
    } catch {
      setIdiomaErro(traduzirUi("Não foi possível salvar o idioma. Tente novamente."));
    } finally {
      setIdiomaGravando(false);
    }
  };

  const ui = useContext(MemberUiContext);
  const [textPos] = useTextSize();
  const [sair, setSair] = useState(false);

  const [editing, setEditing] = useState(false);
  const [perfil, setPerfil] = useState<MemberContactInput>({
    name: member?.name ?? person.name,
    email: realValue(member?.email),
    phone: realValue(member?.phone),
    nasc: member?.birth ?? "",
    country: member?.country,
    cep: member?.postalCode ?? "",
    rua: member?.street ?? "",
    bairro: member?.neighborhood ?? "",
    cidade: member?.city ?? "",
    estado: member?.state ?? "",
  });
  const [documentoErro, setDocumentoErro] = useState("");
  useEffect(() => {
    if (view !== "dados" || !member?.id) return;
    let ativo = true;
    createServiceBrowserClient().schema("service").rpc("my_member_cpf", { p_member: member.id }).then(({ data, error }) => {
      if (!ativo) return;
      if (error) { setDocumentoErro(traduzirUi("Não foi possível carregar o CPF agora. Os outros dados podem ser editados.")); return; }
      setPerfil((p) => ({ ...p, cpf: typeof data === "string" ? data : "" }));
    });
    return () => { ativo = false; };
  }, [view, member?.id, traduzirUi]);
  const [perfilTentou, setPerfilTentou] = useState(false);
  const perfilErros = contactErrors(perfil);

  const [perfilErroSalvar, setPerfilErroSalvar] = useState("");
  const salvarPerfil = async () => {
    if (Object.values(perfilErros).some(Boolean)) {
      setPerfilTentou(true);
      return;
    }
    if (!onUpdateProfile) return;
    setPerfilErroSalvar("");
    const { error } = await onUpdateProfile(person.id, member?.id ?? null, perfil);
    if (error) {
      setPerfilErroSalvar(error);
      return;
    }
    setEditing(false);
  };

  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [senhaMsg, setSenhaMsg] = useState("");
  const [senhaSaving, setSenhaSaving] = useState(false);
  const senhaValida = senha.length >= 6 && senha === senha2;

  const trocarSenha = async () => {
    if (!senhaValida || !onChangePassword) return;
    setSenhaSaving(true);
    setSenhaMsg("");
    const { error } = await onChangePassword(senha);
    setSenhaSaving(false);
    if (error) {
      setSenhaMsg(error);
    } else {
      setSenhaMsg(traduzirUi("Senha atualizada."));
      setSenha("");
      setSenha2("");
    }
  };

  const { pushOn, pushBusy, pushMsg, pushSupported, ligarPush, desligarPush } = usePush(organizationId);
  const [tour, setTour] = useState(false);
  /* categorias desligadas (0066); lidas do perfil, gravadas na hora */
  const [notifOff, setNotifOff] = useState<string[]>([]);
  useEffect(() => {
    let vivo = true;
    createServiceBrowserClient().schema("service").rpc("my_notifications").then(({ data }) => { if (vivo && Array.isArray(data)) setNotifOff(data as string[]); });
    return () => { vivo = false; };
  }, []);
  const trocarCategoria = (id: string) => {
    const antes = notifOff;
    const novo = notifOff.includes(id) ? notifOff.filter((x) => x !== id) : [...notifOff, id];
    setNotifOff(novo);
    createServiceBrowserClient().schema("service").rpc("set_my_notifications", { p_off: novo }).then(({ data, error }) => {
      if (error || data !== "ok") { setNotifOff(antes); ui.toast(traduzirUi("Não foi possível salvar agora. Tente de novo.")); }
    });
  };
  /* mapa da igreja (0087): nome no mapa da liderança; desligado = ponto sem nome */
  const [nomeNoMapa, setNomeNoMapa] = useState(!!member?.mapConsentAt);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- acompanha o aceite feito na folha "Quase lá" depois que os dados voltam do servidor
  useEffect(() => { setNomeNoMapa(!!member?.mapConsentAt); }, [member?.mapConsentAt]);
  const trocarNomeNoMapa = async () => {
    if (!member) return;
    const novo = !nomeNoMapa;
    setNomeNoMapa(novo);
    const erro = await gravarAceiteMapa(member.id, novo, "perfil", traduzirUi);
    if (erro) { setNomeNoMapa(!novo); ui.toast(erro); }
  };
  /* a foto saiu do primeiro acesso (v7 4.10) e mora em Meus dados */
  const [foto, setFoto] = useState<string | null>(person.photoUrl ?? null);

  /* Perfil no modelo de Ajustes do celular (S24): a lista abre telas
     próprias (Meus dados, Trocar senha, Minha família) com "voltar" no topo */
  if (view === "dados") {
    return (
      <div className="m6-sec0">
        <Cartao estilo="app" className="ob-foto">
          <PhotoPicker
            label={traduzirUi("Sua foto")}
            photoUrl={foto}
            path={`${organizationId}/kids/guardians/${person.id}`}
            onUploaded={(url) => {
              setFoto(url);
              createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
            }}
          />
          <div className="m6-meta">{traduzirUi("Aparece no lugar das iniciais.")}</div>
        </Cartao>
        {member ? (
          <Cartao estilo="app">
            {!editing ? (
              <>
                <ul className="m6-facts">
                  <li><Icon name="telefone" size={20} /><span>{formatarTelefone(realValue(member.phone))}</span></li>
                  <li><Icon name="link" size={20} /><span>{realValue(member.email)}</span></li>
                  {member.birth && <li><Icon name="presente" size={20} /><span>{traduzirUi("Aniversário · {data}", { data: formatCivilDate(member.birth, locale) })}</span></li>}
                  {(member.neighborhood || member.city) && <li><Icon name="mapapin" size={20} /><span>{[member.neighborhood, member.city, member.country].filter(Boolean).join(", ")}</span></li>}
                </ul>
                {onUpdateProfile && (
                  <div className="m6-btns"><Botao tamanho="toque" onClick={() => setEditing(true)}>{traduzirUi("Editar meus dados")}</Botao></div>
                )}
              </>
            ) : (
              <>
                {documentoErro && <p role="status" className="field-hint">{documentoErro}</p>}
              <MemberContactFields d={perfil} set={(k, v) => setPerfil((p) => ({ ...p, [k]: v }))} erros={perfilTentou ? perfilErros : null} />
                {perfilErroSalvar && <div className="m6-err">{perfilErroSalvar}</div>}
                <div className="m6-btns m6-fixo">
                  <Botao tamanho="toque" onClick={() => setEditing(false)}>{traduzirUi("Cancelar")}</Botao>
                  <Botao tamanho="toque" variante="principal" onClick={salvarPerfil}>{traduzirUi("Salvar")}</Botao>
                </div>
              </>
            )}
          </Cartao>
        ) : (
          <Cartao estilo="app"><div className="m6-meta">{traduzirUi("Sua ficha ainda não está ligada ao app. Fale com a liderança.")}</div></Cartao>
        )}
      </div>
    );
  }

  if (view === "senha") {
    return (
      <div className="m6-sec0">
        <Cartao estilo="app">
          <Campo rotulo={traduzirUi("Senha nova")}><Entrada type="password" autoComplete="new-password" placeholder={traduzirUi("Pelo menos 6 caracteres")} value={senha} onChange={(e) => setSenha(e.target.value)} /></Campo>
          <Campo rotulo={traduzirUi("Repita a senha")}><Entrada type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></Campo>
          {senhaMsg && <div className="m6-meta" style={{ marginBottom: 8 }}>{senhaMsg}</div>}
          <div className="m6-btns"><Botao tamanho="toque" variante="principal" desativado={!senhaValida || senhaSaving || !onChangePassword} onClick={trocarSenha}>{senhaSaving ? traduzirUi("Salvando...") : traduzirUi("Salvar senha nova")}</Botao></div>
        </Cartao>
      </div>
    );
  }

  const papel = onSwitchToPanel ? traduzirUi("Liderança") : traduzirUi("Membro");
  return (
    <>
      <div className="m6-sec0">
        <Cartao estilo="app" className="m6-me">
          <Av name={person.name} size="xl" photoUrl={person.photoUrl} />
          <div className="m6-rb">
            <div className="m6-ct">{person.name}</div>
            <div className="m6-meta">{papel}</div>
            {member?.firstContact ? <div className="m6-meta">{traduzirUi("Na igreja desde {data}", { data: formatCivilDate(member.firstContact, locale) })}</div> : null}
          </div>
        </Cartao>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">{traduzirUi("Você")}</div>
        <Lista>
          <M6Row ic="pessoa" t={traduzirUi("Meus dados")} s={traduzirUi("Telefone, e-mail, endereço e aniversário")} onClick={() => openSub?.("dados")} />
          <M6Row ic="kids" t={traduzirUi("Minha família")} s={traduzirUi("Filhos no Kids, check-in e eventos")} onClick={() => openSub?.("familia")} />
          {contribuir && <M6Row ic="semente" t={traduzirUi("Contribuir")} s={traduzirUi("Pix para {value0}", { value0: String(listaFinalidades(contribuir.finalidades)) })} onClick={onContribuir} />}
          <M6Row ic="historia" t={traduzirUi("Minha história")} s={traduzirUi("O que você já viveu na igreja")} onClick={() => openSub?.("minha-historia")} />
        </Lista>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">{traduzirUi("Preferências")}</div>
        <Lista>
          <M6Row ic="documento" t={traduzirUi("Tamanho do texto")} s={nomesPosicao(traduzirUi)[textPos]} onClick={ui.tamanhoTexto} />
        </Lista>
        {internationalEnabled && <Cartao estilo="app" className="m6-mt">
          <Campo rotulo={traduzirUi("Idioma")} erro={idiomaErro}
            ajuda={idiomaGravando || idiomaAtualizando ? traduzirUi("Salvando idioma…") : traduzirUi("Só muda a sua interface. O conteúdo escrito pela igreja continua como foi publicado.")}>
            <Selecao valor={locale} aoMudar={mudarIdioma} desativado={idiomaGravando || idiomaAtualizando}
              opcoes={LOCALES.map((v) => ({ v, l: NATIVE_LOCALE_NAMES[v] }))} />
          </Campo>
        </Cartao>}
        {theme && setTheme && (
          <Cartao estilo="app" className="m6-mt">
            <div className="m6-rt">{traduzirUi("Tema")}</div>
            <div className="ts-seg two" role="radiogroup" aria-label={traduzirUi("Tema")}>
              {(["light", "dark"] as const).map((m) => (
                <Opcao key={m} role="radio" aria-checked={theme === m} marcada={theme === m} onClick={() => setTheme(m)}>{m === "light" ? traduzirUi("Claro") : traduzirUi("Escuro")}</Opcao>
              ))}
            </div>
          </Cartao>
        )}
        <Lista>
          <Linha estilo="app">
            <span className="m6-ic"><Icon name="sino" size={22} /></span>
            <span className="m6-rb">
              <span className="m6-rt">{traduzirUi("Notificações")}</span>
              <span className="m6-rs">{pushMsg || (pushSupported ? (pushOn ? traduzirUi("Nada chega das 22h às 7h. O Mural chega em resumo.") : traduzirUi("Desligadas")) : traduzirUi("Disponível quando o app está instalado"))}</span>
            </span>
            <Interruptor ligado={pushOn} tamanho="toque" rotulo={traduzirUi("Notificações")} desativado={!pushSupported || pushBusy} onClick={() => (pushOn ? desligarPush() : ligarPush())} />
          </Linha>
          {/* v7 5.3 (lei 9): categorias que a pessoa desliga */}
          {pushOn && categoriasAviso(traduzirUi).map((c) => {
            const ligada = !notifOff.includes(c.id);
            return (
              <Linha estilo="app" key={c.id}>
                <span className="m6-ic" />
                <span className="m6-rb">
                  <span className="m6-rt">{c.t}</span>
                  <span className="m6-rs">{c.s}</span>
                </span>
                <Interruptor ligado={ligada} tamanho="toque" rotulo={traduzirUi("Avisos de {value0}", { value0: c.t })} onClick={() => trocarCategoria(c.id)} />
              </Linha>
            );
          })}
        </Lista>
      </div>

      {member && (
      <div className="m6-sec">
        <div className="m6-lbl">{traduzirUi("Privacidade")}</div>
        <Lista>
          <Linha estilo="app">
            <span className="m6-ic"><Icon name="mapapin" size={22} /></span>
            <span className="m6-rb">
              <span className="m6-rt">{traduzirUi("Meu nome no mapa")}</span>
              <span className="m6-rs">{nomeNoMapa ? traduzirUi("A liderança vê seu nome e a região do seu CEP. Nunca o endereço.") : traduzirUi("Você aparece só como um ponto sem nome.")}</span>
            </span>
            <Interruptor ligado={nomeNoMapa} tamanho="toque" rotulo={traduzirUi("Meu nome no mapa da liderança")} onClick={trocarNomeNoMapa} />
          </Linha>
        </Lista>
      </div>
      )}

      <div className="m6-sec">
        <div className="m6-lbl">{traduzirUi("Conta")}</div>
        <Lista>
          {onChangePassword && <M6Row ic="cadeado" t={traduzirUi("Trocar senha")} onClick={() => openSub?.("senha")} />}
          <M6Row ic="lampada" t={traduzirUi("Conheça o app")} s={traduzirUi("Um passeio de um minuto")} onClick={() => setTour(true)} />
          {onSwitchToPanel && <M6Row ic="painel" t={traduzirUi("Abrir o painel da igreja")} s={traduzirUi("Gestão de pessoas, escalas e agenda")} onClick={onSwitchToPanel} />}
        </Lista>
      </div>

      {onLogout && (
        <div className="m6-sec">
          <Lista>
            <M6Row cls="m6-danger" ic="sair" t={traduzirUi("Sair do app")} right={null} onClick={() => setSair(true)} />
          </Lista>
        </div>
      )}
      {tour && <AppTourModal onClose={() => setTour(false)} />}
      {sair && onLogout && (
        <M6Sheet onClose={() => setSair(false)}>
          <h2 className="m6-sh">{traduzirUi("Sair do app?")}</h2>
          <p className="m6-txt">{traduzirUi("Para entrar de novo, você vai precisar do seu e-mail e da sua senha.")}</p>
          <div className="m6-btns col">
            <Botao tamanho="toque" variante="perigo" onClick={onLogout}>{traduzirUi("Sair")}</Botao>
            <Botao tamanho="toque" onClick={() => setSair(false)}>{traduzirUi("Cancelar")}</Botao>
          </div>
        </M6Sheet>
      )}
    </>
  );
}

/* Identificação e contato essenciais. Aniversário e endereço são opcionais;
   CEP brasileiro só é consultado por ação explícita. */
export function MemberContactFields({ d, set, erros }: { d: MemberContactInput; set: (k: keyof MemberContactInput, v: string) => void; erros: ReturnType<typeof contactErrors> | null }) {
  const traduzirUi = useTexto();

  const fieldId = useId();
  const err = (k: keyof ReturnType<typeof contactErrors>) =>
    erros?.[k] ? <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 4 }}>{erros[k]}</div> : null;
  return (
    <div className="ob-form">
      <Campo rotulo={traduzirUi("Nome e sobrenome")} obrigatorio erro={erros?.name || undefined}>
        <Entrada id={`${fieldId}-name`} value={d.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("E-mail")} obrigatorio erro={erros?.email || undefined}>
        <Entrada id={`${fieldId}-email`} type="email" value={d.email} autoComplete="email" placeholder={traduzirUi("voce@email.com")} onChange={(e) => set("email", e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("Telefone (WhatsApp)")} obrigatorio erro={erros?.phone || undefined}>
        <Entrada id={`${fieldId}-phone`} type="tel" value={d.phone} autoComplete="tel" placeholder={traduzirUi("DDD e telefone ou +código do país")} onChange={(e) => set("phone", e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("Aniversário (opcional)")} erro={erros?.nasc || undefined}>
        <SeletorData id={`${fieldId}-nasc`} valor={d.nasc} aoMudar={(v) => set("nasc", v)} limpavel />
      </Campo>
      {d.cpf !== undefined && <Campo rotulo={traduzirUi("CPF (opcional)")} ajuda={traduzirUi("Preencha apenas se quiser informar.")} erro={erros?.cpf || undefined}>
        <Entrada id={`${fieldId}-cpf`} inputMode="numeric" autoComplete="off" value={formatarCpf(d.cpf)} onChange={(e) => set("cpf", e.target.value.replace(/\D/g, "").slice(0, 11))} />
      </Campo>}
      <details className="member-address">
        <summary>{traduzirUi("Seu endereço")}</summary>
      <div className="field">
        <label className={`field-label${enderecoNoBrasil(d.country) ? " req" : ""}`} htmlFor={`${fieldId}-cep`}>{traduzirUi("CEP ou código postal")}</label>
        <CepInput international={!enderecoNoBrasil(d.country)} brazilLookup={enderecoNoBrasil(d.country)} id={`${fieldId}-cep`}
          value={d.cep}
          onChange={(v) => set("cep", v)}
          onResult={(r) => {
            if (!r) return;
            if (r.street) set("rua", r.street);
            if (r.neighborhood) set("bairro", r.neighborhood);
            if (r.city) set("cidade", r.city);
            if (r.state) set("estado", r.state);
          }}
        />
        {enderecoNoBrasil(d.country) && <div className="field-hint">{traduzirUi(AVISO_CEP)}</div>}
        {err("cep")}
      </div>
      {enderecoNoBrasil(d.country) ? <p className="field-hint">{[d.rua, d.bairro, d.cidade, d.estado].filter(Boolean).join(" · ") || traduzirUi("O endereço será preenchido pela consulta do CEP.")}</p> : <>
      <Campo rotulo={traduzirUi("Endereço")}>
        <Entrada id={`${fieldId}-rua`} value={d.rua} autoComplete="street-address" onChange={(e) => set("rua", e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("Bairro")}>
        <Entrada id={`${fieldId}-bairro`} value={d.bairro} placeholder={traduzirUi("Onde você mora")} onChange={(e) => set("bairro", e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("Cidade")}>
        <Entrada id={`${fieldId}-cidade`} value={d.cidade} autoComplete="address-level2" onChange={(e) => set("cidade", e.target.value)} />
      </Campo>
      <Campo rotulo={traduzirUi("Estado ou região")}>
        <Entrada id={`${fieldId}-estado`} value={d.estado} autoComplete="address-level1" onChange={(e) => set("estado", e.target.value)} />
      </Campo>
      </>}
      </details>
    </div>
  );
}

/* categorias de aviso que a pessoa desliga (lei 9) */
function categoriasAviso(t: Text): { id: CategoriaAviso; t: string; s: string }[] {
  return [
    { id: "escala", t: t("Escala"), s: t("Quando você for escalado ou houver troca") },
    { id: "mural", t: t("Mural"), s: t("Publicações da igreja, em resumo") },
    { id: "mensagens", t: t("Mensagens"), s: t("Quando alguém falar com você") },
    { id: "caminhada", t: t("{Caminhada}"), s: t("Seus passos e pedidos aprovados") },
  ];
}
