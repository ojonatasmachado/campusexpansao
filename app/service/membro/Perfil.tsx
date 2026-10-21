"use client";

import { formatarCpf } from "../lib/cpf";
import { enderecoNoBrasil } from "../lib/endereco";
import { listaFinalidades, type ContribuirCfg } from "../modules/contribuir/pix";
import { useContext, useEffect, useState, useId } from "react";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { Icon } from "../lib/icons";
import { formatDateBR } from "../lib/date";
import { formatarTelefone } from "../lib/telefone";
import { PhotoPicker } from "../PhotoPicker";
import CepInput from "../CepInput";
import { NOMES_POSICAO, useTextSize } from "../lib/text-scale";
import { useTermos } from "../lib/vocabulario-context";
import type { CategoriaAviso } from "../modules/define";
import { Av, M6Row, M6Sheet, MemberUiContext, contactErrors, realValue } from "./comum";
import { AppTourModal } from "./Onboarding";
import type { M, MemberContactInput, P } from "./tipos";

// ── aba: Perfil ───────────────────────────────────────────────────────────────

/* notificações do celular (push): usado no Perfil e no primeiro acesso */
export function usePush(organizationId?: string) {
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
        setPushMsg(perm === "denied" ? "Bloqueado no navegador. Libere nas configurações do site." : "Permissão não concedida.");
        return;
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) { setPushMsg("Push não configurado neste ambiente."); return; }
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
      setPushMsg("Não foi possível ativar agora.");
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
      setPushMsg("Não foi possível desligar agora.");
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
      if (error) { setDocumentoErro("Não foi possível carregar o CPF agora. Os outros dados podem ser editados."); return; }
      setPerfil((p) => ({ ...p, cpf: typeof data === "string" ? data : "" }));
    });
    return () => { ativo = false; };
  }, [view, member?.id]);
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
      setSenhaMsg("Senha atualizada.");
      setSenha("");
      setSenha2("");
    }
  };

  const { pushOn, pushBusy, pushMsg, pushSupported, ligarPush, desligarPush } = usePush(organizationId);
  const [tour, setTour] = useState(false);
  const { comTermos: ct } = useTermos();
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
      if (error || data !== "ok") { setNotifOff(antes); ui.toast("Não foi possível salvar agora. Tente de novo."); }
    });
  };
  /* a foto saiu do primeiro acesso (v7 4.10) e mora em Meus dados */
  const [foto, setFoto] = useState<string | null>(person.photoUrl ?? null);

  /* Perfil no modelo de Ajustes do celular (S24): a lista abre telas
     próprias (Meus dados, Trocar senha, Minha família) com "voltar" no topo */
  if (view === "dados") {
    return (
      <div className="m6-sec0">
        <div className="m6-card ob-foto">
          <PhotoPicker
            label="Sua foto"
            photoUrl={foto}
            path={`${organizationId}/kids/guardians/${person.id}`}
            onUploaded={(url) => {
              setFoto(url);
              createServiceBrowserClient().schema("service").from("people").update({ photo_url: url }).eq("id", person.id);
            }}
          />
          <div className="m6-meta">Aparece no lugar das iniciais.</div>
        </div>
        {member ? (
          <div className="m6-card">
            {!editing ? (
              <>
                <ul className="m6-facts">
                  <li><Icon name="telefone" size={20} /><span>{formatarTelefone(realValue(member.phone))}</span></li>
                  <li><Icon name="link" size={20} /><span>{realValue(member.email)}</span></li>
                  {member.birth && <li><Icon name="presente" size={20} /><span>Aniversário · {formatDateBR(member.birth)}</span></li>}
                  {(member.neighborhood || member.city) && <li><Icon name="mapapin" size={20} /><span>{[member.neighborhood, member.city, member.country].filter(Boolean).join(", ")}</span></li>}
                </ul>
                {onUpdateProfile && (
                  <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => setEditing(true)}>Editar meus dados</button></div>
                )}
              </>
            ) : (
              <>
                {documentoErro && <p role="status" className="field-hint">{documentoErro}</p>}
              <MemberContactFields d={perfil} set={(k, v) => setPerfil((p) => ({ ...p, [k]: v }))} erros={perfilTentou ? perfilErros : null} />
                {perfilErroSalvar && <div className="m6-err">{perfilErroSalvar}</div>}
                <div className="m6-btns m6-fixo">
                  <button className="m6-btn sec" type="button" onClick={() => setEditing(false)}>Cancelar</button>
                  <button className="m6-btn pri" type="button" onClick={salvarPerfil}>Salvar</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="m6-card"><div className="m6-meta">Sua ficha ainda não está ligada ao app. Fale com a liderança.</div></div>
        )}
      </div>
    );
  }

  if (view === "senha") {
    return (
      <div className="m6-sec0">
        <div className="m6-card">
          <div className="field"><label className="field-label">Senha nova</label><input className="input" type="password" autoComplete="new-password" placeholder="Pelo menos 6 caracteres" value={senha} onChange={(e) => setSenha(e.target.value)} /></div>
          <div className="field"><label className="field-label">Repita a senha</label><input className="input" type="password" autoComplete="new-password" value={senha2} onChange={(e) => setSenha2(e.target.value)} /></div>
          {senhaMsg && <div className="m6-meta" style={{ marginBottom: 8 }}>{senhaMsg}</div>}
          <div className="m6-btns"><button className="m6-btn pri" type="button" disabled={!senhaValida || senhaSaving || !onChangePassword} onClick={trocarSenha}>{senhaSaving ? "Salvando..." : "Salvar senha nova"}</button></div>
        </div>
      </div>
    );
  }

  const papel = onSwitchToPanel ? "Liderança" : "Membro";
  return (
    <>
      <div className="m6-sec0">
        <div className="m6-card m6-me">
          <Av name={person.name} size="xl" photoUrl={person.photoUrl} />
          <div className="m6-rb">
            <div className="m6-ct">{person.name}</div>
            <div className="m6-meta">{papel}</div>
            {member?.firstContact ? <div className="m6-meta">Na igreja desde {formatDateBR(member.firstContact)}</div> : null}
          </div>
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Você</div>
        <div className="m6-list">
          <M6Row ic="pessoa" t="Meus dados" s="Telefone, e-mail, endereço e aniversário" onClick={() => openSub?.("dados")} />
          <M6Row ic="kids" t="Minha família" s="Filhos no Kids, check-in e eventos" onClick={() => openSub?.("familia")} />
          {contribuir && <M6Row ic="semente" t="Contribuir" s={`Pix para ${listaFinalidades(contribuir.finalidades)}`} onClick={onContribuir} />}
          <M6Row ic="historia" t="Minha história" s="O que você já viveu na igreja" onClick={() => openSub?.("minha-historia")} />
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Preferências</div>
        <div className="m6-list">
          <M6Row ic="documento" t="Tamanho do texto" s={NOMES_POSICAO[textPos]} onClick={ui.tamanhoTexto} />
        </div>
        {theme && setTheme && (
          <div className="m6-card m6-mt">
            <div className="m6-rt">Tema</div>
            <div className="ts-seg two" role="radiogroup" aria-label="Tema">
              {(["light", "dark"] as const).map((m) => (
                <button key={m} type="button" role="radio" aria-checked={theme === m} className={theme === m ? "on" : ""} onClick={() => setTheme(m)}>{m === "light" ? "Claro" : "Escuro"}</button>
              ))}
            </div>
          </div>
        )}
        <div className="m6-list">
          <div className="m6-row">
            <span className="m6-ic"><Icon name="sino" size={22} /></span>
            <span className="m6-rb">
              <span className="m6-rt">Notificações</span>
              <span className="m6-rs">{pushMsg || (pushSupported ? (pushOn ? "Nada chega das 22h às 7h. O Mural chega em resumo." : "Desligadas") : "Disponível quando o app está instalado")}</span>
            </span>
            <button type="button" role="switch" aria-checked={pushOn} aria-label="Notificações" className={`m6-tg${pushOn ? " on" : ""}`} disabled={!pushSupported || pushBusy} onClick={() => (pushOn ? desligarPush() : ligarPush())} />
          </div>
          {/* v7 5.3 (lei 9): categorias que a pessoa desliga */}
          {pushOn && CATEGORIAS_AVISO.map((c) => {
            const ligada = !notifOff.includes(c.id);
            return (
              <div className="m6-row" key={c.id}>
                <span className="m6-ic" />
                <span className="m6-rb">
                  <span className="m6-rt">{ct(c.t)}</span>
                  <span className="m6-rs">{ct(c.s)}</span>
                </span>
                <button type="button" role="switch" aria-checked={ligada} aria-label={`Avisos de ${ct(c.t)}`} className={`m6-tg${ligada ? " on" : ""}`} onClick={() => trocarCategoria(c.id)} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-lbl">Conta</div>
        <div className="m6-list">
          {onChangePassword && <M6Row ic="cadeado" t="Trocar senha" onClick={() => openSub?.("senha")} />}
          <M6Row ic="lampada" t="Conheça o app" s="Um passeio de um minuto" onClick={() => setTour(true)} />
          {onSwitchToPanel && <M6Row ic="painel" t="Abrir o painel da igreja" s="Gestão de pessoas, escalas e agenda" onClick={onSwitchToPanel} />}
        </div>
      </div>

      {onLogout && (
        <div className="m6-sec">
          <div className="m6-list">
            <M6Row cls="m6-danger" ic="sair" t="Sair do app" right={null} onClick={() => setSair(true)} />
          </div>
        </div>
      )}
      {tour && <AppTourModal onClose={() => setTour(false)} />}
      {sair && onLogout && (
        <M6Sheet onClose={() => setSair(false)}>
          <h2 className="m6-sh">Sair do app?</h2>
          <p className="m6-txt">Para entrar de novo, você vai precisar do seu e-mail e da sua senha.</p>
          <div className="m6-btns col">
            <button className="m6-btn danger" type="button" onClick={onLogout}>Sair</button>
            <button className="m6-btn sec" type="button" onClick={() => setSair(false)}>Cancelar</button>
          </div>
        </M6Sheet>
      )}
    </>
  );
}

/* Identificação e contato essenciais. Aniversário e endereço são opcionais;
   CEP brasileiro só é consultado por ação explícita. */
export function MemberContactFields({ d, set, erros }: { d: MemberContactInput; set: (k: keyof MemberContactInput, v: string) => void; erros: ReturnType<typeof contactErrors> | null }) {
  const fieldId = useId();
  const err = (k: keyof ReturnType<typeof contactErrors>) =>
    erros?.[k] ? <div style={{ fontSize: "var(--fs-app-13)", color: "var(--danger)", marginTop: 4 }}>{erros[k]}</div> : null;
  return (
    <div className="ob-form">
      <div className="field">
        <label className="field-label req" htmlFor={`${fieldId}-name`}>Nome e sobrenome</label>
        <input id={`${fieldId}-name`} className="input" value={d.name} autoComplete="name" onChange={(e) => set("name", e.target.value)} />
        {err("name")}
      </div>
      <div className="field">
        <label className="field-label req" htmlFor={`${fieldId}-email`}>E-mail</label>
        <input id={`${fieldId}-email`} className="input" type="email" value={d.email} autoComplete="email" placeholder="voce@email.com" onChange={(e) => set("email", e.target.value)} />
        {err("email")}
      </div>
      <div className="field">
        <label className="field-label req" htmlFor={`${fieldId}-phone`}>Telefone (WhatsApp)</label>
        <input id={`${fieldId}-phone`} className="input" type="tel" value={d.phone} autoComplete="tel" placeholder="DDD e telefone ou +código do país" onChange={(e) => set("phone", e.target.value)} />
        {err("phone")}
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-nasc`}>Aniversário (opcional)</label>
        <input id={`${fieldId}-nasc`} className="input" type="date" value={d.nasc} onChange={(e) => set("nasc", e.target.value)} />
        {err("nasc")}
      </div>
      {d.cpf !== undefined && <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-cpf`}>CPF (opcional)</label>
        <input id={`${fieldId}-cpf`} className="input" inputMode="numeric" autoComplete="off" value={formatarCpf(d.cpf)} onChange={(e) => set("cpf", e.target.value.replace(/\D/g, "").slice(0, 11))} />
        <div className="field-hint">Preencha apenas se quiser informar.</div>
        {err("cpf")}
      </div>}
      <details className="member-address">
        <summary>Seu endereço</summary>
      <div className="field">
        <label className={`field-label${enderecoNoBrasil(d.country) ? " req" : ""}`} htmlFor={`${fieldId}-cep`}>CEP ou código postal</label>
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
        {err("cep")}

      </div>
      {enderecoNoBrasil(d.country) ? <p className="field-hint">{[d.rua, d.bairro, d.cidade, d.estado].filter(Boolean).join(" · ") || "O endereço será preenchido pela consulta do CEP."}</p> : <>
      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-rua`}>Endereço</label>
        <input id={`${fieldId}-rua`} className="input" value={d.rua} autoComplete="street-address" onChange={(e) => set("rua", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-bairro`}>Bairro</label>
        <input id={`${fieldId}-bairro`} className="input" value={d.bairro} placeholder="Onde você mora" onChange={(e) => set("bairro", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-cidade`}>Cidade</label>
        <input id={`${fieldId}-cidade`} className="input" value={d.cidade} autoComplete="address-level2" onChange={(e) => set("cidade", e.target.value)} />
      </div>
      <div className="field">
        <label className="field-label" htmlFor={`${fieldId}-estado`}>Estado ou região</label>
        <input id={`${fieldId}-estado`} className="input" value={d.estado} autoComplete="address-level1" onChange={(e) => set("estado", e.target.value)} />
      </div>
      </>}
      </details>
    </div>
  );
}

/* categorias de aviso que a pessoa desliga (lei 9) */
export const CATEGORIAS_AVISO: { id: CategoriaAviso; t: string; s: string }[] = [
  { id: "escala", t: "Escala", s: "Quando você for escalado ou houver troca" },
  { id: "mural", t: "Mural", s: "Publicações da igreja, em resumo" },
  { id: "mensagens", t: "Mensagens", s: "Quando alguém falar com você" },
  { id: "caminhada", t: "{Caminhada}", s: "Seus passos e pedidos aprovados" },
];
