"use client";

/* Módulo Mural (4.1): publicações, quem leu e respostas. Saiu de
   ServiceExactApp.tsx sem mudar comportamento; o manifesto está em
   ./manifest.ts. Tipos de dados do painel: import só de tipo.
   0075: rascunho, agendamento e urgência; Boletim da semana em ./Boletim.tsx. */

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { notifyPush } from "../../lib/notify-push";
import { instantesNoFuso, partesNoFuso } from "../../lib/fuso";
import { videoDoLink } from "../../lib/video";
import { imageExtension, uploadServiceImage } from "../../lib/upload-image";
import { ImageUpload } from "../../ImageUpload";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR, joinDot, paraPublico, porPublicacao } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { Av, EmptyState, PageHead } from "../../painel/ui";
import { friendlyWriteError } from "../../painel/erros";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { ACESSO_MSG_DEFAULT, AcessoMsgModal, type AcessoMsgCfg } from "../pessoas/acesso-msg";
import type { AnnouncementReadView, AnnouncementResponseView, AnnouncementView, ChildGuardianView, ChurchView, EventView, FellowshipGroupView, MemberView, MinistryView, ModalState, PersonView, RosterAssignmentView, WallPostView } from "../../ServiceExactApp";
import { noAr, type MuralAviso } from "./estado";
import { BoletimDaSemana } from "./Boletim";
import { useTermos, type Termos } from "../../lib/vocabulario-context";

import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Janela } from "../../ui/Janela";
import { Cartao } from "../../ui/Cartao";
import { Selo, tomDaClasse } from "../../ui/Selo";
import { Linha } from "../../ui/Linha";
import { Campo, Entrada, TextoLongo } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { SeletorData, SeletorHora } from "../../ui/Data";
function ComposerModal({ church, publicos, inicial, onClose, onDone }: { church: ChurchView; publicos: MuralPublico[]; inicial?: MuralAviso; onClose: () => void; onDone: () => void }) {
  const { fuso, emSilencio, foraDoSilencio, quandoLembra } = useRelogioDaIgreja();
  const emHorarioLocal = (iso: string) => { const p = partesNoFuso(new Date(iso), fuso); return `${p.data}T${p.hora}`; };
  const instanteUnico = (data: string, hora: string) => { const candidatos = instantesNoFuso(data, hora, fuso); return candidatos.length === 1 ? candidatos[0] : null; };
  const publicoInicial = inicial ? (publicos.find((p) => p.label.toLowerCase() === (inicial.audience ?? "todos").toLowerCase())) : undefined;
  const [titulo, setTitulo] = useState(inicial?.title ?? "");
  const [msg, setMsg] = useState(inicial?.body ?? "");
  const [publico, setPublico] = useState(publicoInicial?.id ?? "");
  const [tipo, setTipo] = useState<"aviso" | "evento" | "acao">((inicial?.kind as "aviso" | "evento" | "acao" | undefined) ?? "aviso");
  const [canais, setCanais] = useState<string[]>(inicial?.publish_push === false ? [] : ["app"]);
  /* 0075: urgente muda só o destaque e a prioridade do cartão (lei 5) */
  const [urgente, setUrgente] = useState(!!inicial?.urgent);
  /* 0075: publicar agora ou agendar */
  const [quando, setQuando] = useState<"agora" | "agendar">(inicial?.status === "agendado" ? "agendar" : "agora");
  const [agDia, setAgDia] = useState(inicial?.publish_at ? emHorarioLocal(inicial.publish_at).slice(0, 10) : "");
  const [agHora, setAgHora] = useState(inicial?.publish_at ? emHorarioLocal(inicial.publish_at).slice(11, 16) : "09:00");
  /* v7 4.18: lembrar quem não viu */
  const [lembrete, setLembrete] = useState<"nao" | "24" | "48" | "data">(
    inicial?.remind_hours === 24 || inicial?.remind_hours === 48 ? (String(inicial.remind_hours) as "24" | "48") : inicial?.remind_at ? "data" : "nao",
  );
  const [lembreteData, setLembreteData] = useState(inicial?.remind_at ? emHorarioLocal(inicial.remind_at).slice(0, 16) : "");
  /* v7 4.4: destaque no Início do app até uma data, com imagem e vídeo */
  const [destacar, setDestacar] = useState(!!inicial?.highlight_until);
  const [destaqueAte, setDestaqueAte] = useState(inicial?.highlight_until ? emHorarioLocal(inicial.highlight_until).slice(0, 10) : "");
  const [imagem, setImagem] = useState<string | null>(inicial?.image_url ?? null);
  const [imagemAlt, setImagemAlt] = useState(inicial?.image_alt ?? "");
  const [video, setVideo] = useState(inicial?.video_url ?? "");
  const videoInvalido = !!video.trim() && !videoDoLink(video);
  const agendaEm = quando === "agendar" && agDia ? instanteUnico(agDia, agHora) : null;
  const [abriuEm] = useState(() => Date.now());
  const agendaPassou = !!agendaEm && agendaEm.getTime() <= abriuEm;
  /* hora em que a opção foi escolhida (24h e 48h contam a partir dela, ou da hora agendada) */
  const [lembreteBase, setLembreteBase] = useState(() => Date.now());
  const lembreteEm = (): Date | null => {
    if (lembrete === "nao") return null;
    if (lembrete === "data") return lembreteData ? instanteUnico(lembreteData.slice(0, 10), lembreteData.slice(11, 16)) : null;
    const base = quando === "agendar" ? agendaEm?.getTime() : lembreteBase;
    return base ? new Date(base + Number(lembrete) * 3600000) : null;
  };
  const [revisando, setRevisando] = useState(false);
  const revisaoRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (revisando) revisaoRef.current?.focus(); }, [revisando]);
  const voltarEdicao = () => {
    setRevisando(false);
    requestAnimationFrame(() => document.getElementById(`${fid}-pub`)?.focus());
  };
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);
  const fid = useId();
  const alvo = publicos.find((p) => p.id === publico) ?? publicos[0];
  const toggleCanal = (c: string) => setCanais((a) => (a.includes(c) ? a.filter((x) => x !== c) : [...a, c]));
  const whatsapp = canais.includes("whatsapp") && quando === "agora";

  const salvar = async (como: "publicado" | "rascunho" | "agendado") => {
    if (!publicos.some((p) => p.id === publico)) { setErro("Escolha quem recebe esta publicação."); return; }
    if (!titulo.trim()) { setErro("Dê um título para a publicação."); return; }
    // eslint-disable-next-line react-hooks/purity -- valida a hora atual no clique de salvar, fora do render
    if (como === "agendado" && (!agendaEm || agendaEm.getTime() <= Date.now())) { setErro("Escolha um horário futuro e válido no fuso da igreja."); return; }
    if (canais.includes("app") && lembrete === "data" && !lembreteEm()) { setErro("Confira a data e a hora do lembrete. Esse horário pode não existir ou se repetir na mudança de fuso."); return; }
    const fimDestaque = destacar && destaqueAte ? instanteUnico(destaqueAte, "23:59") : null;
    if (destacar && destaqueAte && !fimDestaque) { setErro("Confira a data de término do destaque."); return; }
    /* o WhatsApp abre já com o texto (precisa ser no toque, antes de esperar o banco) */
    if (como === "publicado" && whatsapp) window.open(`https://wa.me/?text=${encodeURIComponent(`${titulo.trim()}\n\n${msg.trim()}`)}`, "_blank", "noopener");
    setSalvando(true);
    setErro("");
    const sb = createServiceBrowserClient().schema("service");
    const agora = new Date().toISOString();
    const base = { organization_id: church.organizationId, church_id: church.id, title: titulo.trim(), body: msg.trim() || null, audience: alvo.label, author: "Liderança", when_label: "agora" };
    const quandoLembrar = canais.includes("app") ? lembreteEm() : null;
    const relativo = canais.includes("app") && (lembrete === "24" || lembrete === "48") && como !== "publicado";
    const comLembrete = relativo
      ? { remind_hours: Number(lembrete), remind_at: null, remind_to: alvo.memberIds }
      : quandoLembrar ? { remind_at: foraDoSilencio(quandoLembrar).toISOString(), remind_to: alvo.memberIds } : inicial ? { remind_at: null, remind_hours: null } : {};
    const comDestaque = destacar && destaqueAte
      ? { highlight_until: new Date(fimDestaque!.getTime() + 59000).toISOString(), image_url: imagem, image_alt: imagem ? imagemAlt.trim() : null, video_url: video.trim() || null }
      : inicial ? { highlight_until: null } : {};
    /* 0075: estado, agendamento e urgência */
    const novos = {
      status: como,
      publish_at: como === "agendado" ? agendaEm!.toISOString() : null,
      publish_to: como === "publicado" ? null : alvo.memberIds,
      publish_push: canais.includes("app"),
      urgent: urgente,
      ...(como === "publicado" && inicial ? { created_at: agora } : {}),
    };
    const gravar = (row: Record<string, unknown>) => (inicial ? sb.from("announcements").update(row).eq("id", inicial.id) : sb.from("announcements").insert(row));
    /* um destaque por vez: o novo encerra o anterior (o agendado encerra quando entrar no ar) */
    if (como === "publicado" && destacar && destaqueAte) {
      let q = sb.from("announcements").update({ highlight_until: agora }).eq("church_id", church.id).gt("highlight_until", agora);
      if (inicial) q = q.neq("id", inicial.id);
      await q;
    }
    let { error } = await gravar({ ...base, kind: tipo, ...comLembrete, ...comDestaque, ...novos });
    /* antes da migração 0075 não há rascunho, agendamento nem urgência */
    if (error && /status|urgent|publish_|remind_hours/i.test(error.message)) {
      if (como !== "publicado" || inicial) {
        setSalvando(false);
        setErro("Rascunho e agendamento ainda não estão disponíveis nesta versão do banco. Publique agora.");
        return;
      }
      const { remind_hours: _rh, ...semRelativo } = comLembrete as Record<string, unknown>;
      void _rh;
      ({ error } = await gravar({ ...base, kind: tipo, ...semRelativo, ...comDestaque }));
      if (!error && urgente) avisar("Publicado, mas a marca de urgente ainda não está disponível.", "warn");
    }
    /* antes da migração 0063 as colunas do destaque não existem */
    if (error && destacar && /highlight|image_|video_/i.test(error.message)) {
      setSalvando(false);
      setErro("O destaque ainda não está disponível nesta versão do banco. Publique sem destacar.");
      return;
    }
    /* antes da migração 0062 as colunas do lembrete não existem: publica sem ele e avisa */
    if (error && quandoLembrar && /remind/i.test(error.message)) {
      ({ error } = await gravar({ ...base, kind: tipo }));
      if (!error) avisar("Publicado, mas o lembrete ainda não está disponível.", "warn");
    }
    /* antes da migração 0049 a coluna "kind" não existe: publica sem o tipo */
    if (error && /kind/i.test(error.message)) ({ error } = await gravar(base));
    if (error) { setSalvando(false); setErro(friendlyWriteError(error.message)); return; }
    if (como === "publicado") {
      if (canais.includes("app")) notifyPush(church.organizationId, alvo.memberIds, titulo.trim(), msg.trim() || "Nova publicação no Mural.", "mural");
      avisar("Publicado no Mural.");
    } else if (como === "agendado") {
      avisar(`Agendado: vai ao ar ${quandoLembra(agendaEm!)}.`);
    } else {
      avisar("Rascunho salvo. Só a liderança vê.");
    }
    /* fecha antes do refresh (onDone atualiza a lista) */
    if (telaRef.current) await telaRef.current.fechar();
    onDone();
  };
  const retrato = JSON.stringify({ titulo, msg, publico, tipo, canais: [...canais].sort(), urgente, quando, agDia, agHora, lembrete, lembreteData, destacar, destaqueAte, imagem, imagemAlt, video });
  const [retratoInicial] = useState(retrato);
  const falta = [
    !titulo.trim() && "título",
    !publicos.some((p) => p.id === publico) && "quem recebe",
    canais.length === 0 && "por onde enviar",
    quando === "agendar" && !agDia && "dia da publicação",
    quando === "agendar" && agDia && !agendaEm && "um horário válido no fuso da igreja",
    agendaPassou && "um horário que ainda não passou",
    canais.includes("app") && lembrete === "data" && !lembreteData && "data do lembrete",
    destacar && !destaqueAte && "até quando destacar",
    destacar && !!imagem && !imagemAlt.trim() && "o que a imagem mostra",
    destacar && videoInvalido && "link do vídeo válido",
  ].filter(Boolean) as string[];
  const lembra = lembreteEm();
  return (
    <FormScreen
      ref={telaRef}
      eyebrow="Mural"
      title={revisando ? "Revisar publicação" : inicial?.status === "agendado" ? "Publicação agendada" : inicial ? "Rascunho" : "Nova publicação"}
      saveLabel={revisando ? (quando === "agendar" ? "Agendar" : "Publicar") : "Revisar publicação"}
      secondary={revisando ? { label: "Voltar à edição", onClick: voltarEdicao } : { label: "Salvar rascunho", onClick: () => void salvar("rascunho"), disabled: !titulo.trim() || !publicos.some((p) => p.id === publico) }}
      saving={salvando}
      missing={falta}
      dirty={retrato !== retratoInicial}
      error={erro}
      onSave={() => { if (revisando) void salvar(quando === "agendar" ? "agendado" : "publicado"); else { setErro(""); setRevisando(true); } }}
      onClose={onClose}
    >
      {revisando ? (
        <div ref={revisaoRef} tabIndex={-1} aria-label="Resumo da publicação">
          <FormSection title="Confira quem recebe">
            <p className="mural-revisao-publico"><strong>{alvo?.label}</strong> · {plural(alvo?.memberIds.length ?? 0, "pessoa")}</p>
            <p>{quando === "agendar" && agendaEm ? `Vai ao ar ${quandoLembra(agendaEm)}.` : "Entra no Mural assim que você publicar."}</p>
            <p>{canais.includes("app") ? "Notificação pelo app, respeitando preferências e horário de silêncio." : "Sem notificação pelo app."}</p>
            {whatsapp && <p>O WhatsApp abrirá com o texto para você escolher a conversa.</p>}
            {quando === "agendar" && canais.includes("whatsapp") && <p>O agendamento não envia pelo WhatsApp.</p>}
            {lembra && canais.includes("app") && <p>Lembrete: {quandoLembra(foraDoSilencio(lembra))}.</p>}
            {urgente && <p>Marcada como urgente.</p>}
            {destacar && destaqueAte && <p>Destaque no Início até {formatDateBR(destaqueAte)}. Substitui o destaque anterior quando entrar no ar.</p>}
          </FormSection>
          <FormSection title={KIND_LABEL[tipo]}>
            <h3 className="mural-revisao-titulo">{titulo}</h3>
            {msg && <p className="mural-revisao-texto">{msg}</p>}
            {destacar && imagem && <p>Imagem: {imagemAlt}</p>}
            {destacar && video && <p className="mural-revisao-texto">Vídeo: {video}</p>}
          </FormSection>
        </div>
      ) : <>
      <FormSection title="Publicação">
        <Campo rotulo="Título" obrigatorio id={`${fid}-tit`}>
          <Entrada aria-required="true" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Ensaio geral no sábado" />
        </Campo>
        <Campo rotulo="Mensagem" id={`${fid}-msg`}>
          <TextoLongo value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Chegada às 15h45, no templo principal." />
        </Campo>
      </FormSection>

      <FormSection title="Quem recebe">
        <Campo rotulo="Para quem" id={`${fid}-pub`}>
          <Selecao valor={publico} aoMudar={setPublico} vazio="Escolha quem recebe"
            opcoes={publicos.map((p) => ({ v: p.id, l: `${p.label} · ${plural(p.memberIds.length, "pessoa")}` }))} />
        </Campo>
      </FormSection>

      <details className="fs-sec mural-opcoes" open={tipo !== "aviso" || urgente}>
        <summary className="fs-sec-t">Tipo e urgência</summary>
        <div className="field">
          <div className="field-label" id={`${fid}-tipo`}>Tipo</div>
          <div className="fs-chips" role="group" aria-labelledby={`${fid}-tipo`}>
            {(["aviso", "evento", "acao"] as const).map((k) => (
              <Opcao key={k} marcada={tipo === k} estilo="seg-chip" aria-pressed={tipo === k} onClick={() => setTipo(k)}>{KIND_LABEL[k]}</Opcao>
            ))}
          </div>
          {tipo === "evento" && <div className="field-hint">No app, a pessoa responde Vou ou Não vou.</div>}
        </div>
        <div className="field">
          <div className="field-label" id={`${fid}-urg`}>Urgência</div>
          <div className="fs-chips" role="group" aria-labelledby={`${fid}-urg`}>
            <Opcao marcada={!urgente} estilo="seg-chip" aria-pressed={!urgente} onClick={() => setUrgente(false)}>Normal</Opcao>
            <Opcao marcada={urgente} estilo="seg-chip" aria-pressed={urgente} onClick={() => setUrgente(true)}>Urgente</Opcao>
          </div>
          {urgente && <div className="field-hint">Aparece marcada como urgente e vem primeiro no Início do app. A notificação segue o horário de sempre.</div>}
        </div>
      </details>
      <details className="fs-sec mural-opcoes" open={canais.includes("whatsapp") || !canais.includes("app") || lembrete !== "nao"}>
        <summary className="fs-sec-t">Notificações e compartilhamento</summary>
        <div className="field">
          <div className="field-label" id={`${fid}-canal`}>Por onde</div>
          <div className="fs-chips" role="group" aria-labelledby={`${fid}-canal`}>
            {([["app", "App e notificação"], ["whatsapp", "WhatsApp"]] as const).map(([id, l]) => (
              <Opcao key={id} marcada={canais.includes(id)} estilo="seg-chip" aria-pressed={canais.includes(id)} onClick={() => toggleCanal(id)}>{l}</Opcao>
            ))}
          </div>
          {canais.includes("whatsapp") && <div className="field-hint">{quando === "agendar" ? "O WhatsApp só abre quando você publica agora. Para a semana toda, use o Boletim da semana." : "O WhatsApp abre com o texto pronto para você mandar nos grupos da igreja."}</div>}
        </div>
        {canais.includes("app") && (
          <div className="field">
            <div className="field-label" id={`${fid}-lemb`}>Lembrar quem não viu</div>
            <div className="fs-chips" role="group" aria-labelledby={`${fid}-lemb`}>
              {([["nao", "Não lembrar"], ["24", "Em 24h"], ["48", "Em 48h"], ["data", "Numa data"]] as const).map(([k, l]) => (
                <Opcao key={k} marcada={lembrete === k} estilo="seg-chip" aria-pressed={lembrete === k} onClick={() => { setLembrete(k); setLembreteBase(Date.now()); }}>{l}</Opcao>
              ))}
            </div>
            {lembrete === "data" && <input className="input" type="datetime-local" style={{ marginTop: 8 }} value={lembreteData} onChange={(e) => setLembreteData(e.target.value)} aria-label="Data e hora do lembrete" />}
            {lembra && <div className="field-hint">{`Uma notificação ${quandoLembra(foraDoSilencio(lembra))} só para quem ainda não abriu.${emSilencio(lembra) ? " Entre 22h e 7h ninguém recebe aviso, então vai às 7h." : ""}`}</div>}
            {!lembra && quando === "agendar" && lembrete !== "nao" && lembrete !== "data" && <div className="field-hint">{`Conta a partir da hora em que a publicação entrar no ar.`}</div>}
          </div>
        )}
      </details>
      <details className="fs-sec mural-opcoes" open={quando === "agendar"}>
        <summary className="fs-sec-t">{quando === "agendar" ? "Publicação agendada" : "Agendamento: publicar agora"}</summary>
        <div className="field">
          <div className="fs-chips" role="group" aria-label="Quando publicar">
            <Opcao marcada={quando === "agora"} estilo="seg-chip" aria-pressed={quando === "agora"} onClick={() => setQuando("agora")}>Agora</Opcao>
            <Opcao marcada={quando === "agendar"} estilo="seg-chip" aria-pressed={quando === "agendar"} onClick={() => setQuando("agendar")}>Agendar</Opcao>
          </div>
        </div>
        {quando === "agendar" && (
          <>
            <div className="mural-agenda-campos">
              <Campo rotulo="Dia" obrigatorio id={`${fid}-agd`}><SeletorData valor={agDia} aoMudar={setAgDia} /></Campo>
              <Campo rotulo="Hora" id={`${fid}-agh`}><SeletorHora valor={agHora} aoMudar={setAgHora} /></Campo>
            </div>
            {agendaEm && !agendaPassou && (
              <div className="field-hint">{`Vai ao ar ${quandoLembra(agendaEm)}, com alguns minutos de diferença. Até lá, só a liderança vê.${canais.includes("app") && emSilencio(agendaEm) ? " A notificação espera até as 7h, quando acaba o horário de silêncio." : ""}`}</div>
            )}
            {quando === "agendar" && agDia && !agendaEm && <p className="field-error">Esse horário não existe ou se repete na mudança de fuso. Escolha outro horário.</p>}
            {agendaPassou && <p className="field-error">Esse horário já passou. Escolha outro ou publique agora.</p>}
          </>
        )}
      </details>

      <details className="fs-sec mural-opcoes" open={destacar}>
        <summary className="fs-sec-t">Destaque no Início do app</summary>
        <div className="field">
          <div className="fs-chips" role="group" aria-label="Destaque no Início do app">
            <Opcao marcada={!destacar} estilo="seg-chip" aria-pressed={!destacar} onClick={() => setDestacar(false)}>Não destacar</Opcao>
            <Opcao marcada={destacar} estilo="seg-chip" aria-pressed={destacar} onClick={() => setDestacar(true)}>Destacar até…</Opcao>
          </div>
        </div>
        {destacar && (
          <>
            <Campo rotulo="Até o dia" obrigatorio id={`${fid}-ate`}><SeletorData valor={destaqueAte} aoMudar={setDestaqueAte} /></Campo>
            <ImageUpload label="Imagem (opcional)" hint="Formato 16:9. Aparece no alto do cartão." url={imagem} aspectRatio={16 / 9}
              onUpload={async (file) => { setImagem(await uploadServiceImage(createServiceBrowserClient(), file, `${church.organizationId}/mural/${Date.now()}.${imageExtension(file)}`)); }}
              onRemove={() => { setImagem(null); setImagemAlt(""); }} />
            {imagem && <Campo rotulo="O que a imagem mostra" obrigatorio id={`${fid}-alt`}><Entrada aria-required="true" value={imagemAlt} onChange={(e) => setImagemAlt(e.target.value)} placeholder="Para quem usa leitor de tela. Ex.: Jovens no retiro de 2025" /></Campo>}
            <Campo rotulo="Vídeo (link do YouTube ou do Instagram)" id={`${fid}-vid`} erro={videoInvalido ? "Cole um link do YouTube ou do Instagram." : undefined}>
              <Entrada value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
            </Campo>
            <div className="field-hint">{quando === "agendar" ? "Um destaque por vez: quando esta entrar no ar, substitui o que estiver no Início." : "Um destaque por vez: este substitui o que estiver no Início agora."}</div>
          </>
        )}
      </details>
      </>}
    </FormScreen>
  );
}

function VerQuemLeuButton({ aviso, reads, people }: { aviso: AnnouncementView; reads: AnnouncementReadView[]; people: PersonView[] }) {
  const [open, setOpen] = useState(false);
  const readerIds = new Set(reads.filter((r) => r.announcement_id === aviso.id).map((r) => r.person_id));
  const leram = people.filter((p) => readerIds.has(p.id));
  const naoLeram = people.filter((p) => !readerIds.has(p.id));
  return (
    <>
      <Botao compacto onClick={() => setOpen(true)}>Ver quem leu</Botao>
      {open && (
        <Janela sobretitulo="Confirmação de leitura" titulo={aviso.title} texto={<>{leram.length} de {people.length} já leram este aviso.</>} aoFechar={() => setOpen(false)}
          rodape={<Botao variante="principal" onClick={() => setOpen(false)}>Fechar</Botao>}>
              <div className="dsec-title" style={{ marginBottom: 8 }}>Leram · {leram.length}</div>
              {leram.map((p) => (
                <div className="flag-row" key={p.id} style={{ cursor: "default" }}>
                  <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                  <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
                  <span style={{ marginLeft: "auto", color: "var(--olive)" }}><Icon name="ok" size={16} /></span>
                </div>
              ))}
              {naoLeram.length > 0 && <div className="dsec-title" style={{ margin: "14px 0 8px" }}>Ainda não leram · {naoLeram.length}</div>}
              {naoLeram.map((p) => (
                <div className="flag-row is-off" key={p.id} style={{ cursor: "default" }}>
                  <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                  <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
                  <span className="cand-fit busy" style={{ marginLeft: "auto" }}>pendente</span>
                </div>
              ))}
        </Janela>
      )}
    </>
  );
}

/* Mural (S38): um nome só, "Nova publicação" com público, canais e tipo, e o
   alcance de verdade (quem leu sobre quem devia receber). */
type MuralPublico = { id: string; label: string; memberIds: string[] };
const KIND_LABEL: Record<string, string> = { aviso: "Aviso", evento: "Evento", acao: "Pedido de ação" };
function publicosDoMural({ members, ministries, fellowshipGroups, childGuardians, termo }: {
  termo: Termos["termo"];
  members: MemberView[]; ministries: MinistryView[]; fellowshipGroups: FellowshipGroupView[]; childGuardians: ChildGuardianView[];
}): MuralPublico[] {
  const membroDe = (personIds: Set<string>) => members.filter((m) => m.volunteerId && personIds.has(m.volunteerId)).map((m) => m.id);
  const voluntarios = new Set(ministries.flatMap((min) => min.people.map((p) => p.personId)));
  const pais = new Set(childGuardians.map((g) => g.guardian_person_id));
  return [
    { id: "todos", label: "Todos", memberIds: members.map((m) => m.id) },
    { id: "membros", label: "Membros", memberIds: members.filter((m) => m.situation === "membro").map((m) => m.id) },
    { id: "voluntarios", label: termo("voluntario", { plural: true }), memberIds: membroDe(voluntarios) },
    ...ministries.map((min) => ({ id: `time:${min.id}`, label: `Time ${min.name}`, memberIds: membroDe(new Set(min.people.map((p) => p.personId))) })),
    ...fellowshipGroups.map((g) => ({ id: `grupo:${g.id}`, label: `${termo("grupo")} ${g.name}`, memberIds: members.filter((m) => m.groupId === g.id).map((m) => m.id) })),
    { id: "pais-kids", label: "Pais do Kids", memberIds: membroDe(pais) },
  ].filter((p, i) => i === 0 || p.memberIds.length > 0 || p.id === "pais-kids");
}

export function Comunicacao({
  announcements,
  announcementReads,
  announcementResponses = [],
  wallPosts,
  ministries,
  people,
  members = [],
  fellowshipGroups = [],
  childGuardians = [],
  church,
  events = [],
  roster = [],
}: {
  announcements: AnnouncementView[];
  announcementReads: AnnouncementReadView[];
  announcementResponses?: AnnouncementResponseView[];
  wallPosts: WallPostView[];
  ministries: MinistryView[];
  people: PersonView[];
  members?: MemberView[];
  fellowshipGroups?: FellowshipGroupView[];
  childGuardians?: ChildGuardianView[];
  church?: ChurchView;
  events?: EventView[];
  roster?: RosterAssignmentView[];
  setModal: (modal: ModalState) => void;
}) {
  const { dataPublicacao, quandoPublicado, quandoLembra } = useRelogioDaIgreja();
  const { termo } = useTermos();
  const router = useRouter();
  /* true: nova publicação; um aviso: continuar o rascunho ou o agendamento */
  const [compose, setCompose] = useState<boolean | MuralAviso>(false);
  const [boletim, setBoletim] = useState(false);
  const todos = announcements as MuralAviso[];
  const noArAgora = todos.filter(noAr);
  const pendentes = todos.filter((a) => !noAr(a)).sort((a, b) => (a.status === b.status ? (a.publish_at ?? a.created_at ?? "").localeCompare(b.publish_at ?? b.created_at ?? "") : a.status === "agendado" ? -1 : 1));
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const excluir = async (a: MuralAviso) => {
    const { error } = await createServiceBrowserClient().schema("service").from("announcements").delete().eq("id", a.id);
    setExcluindo(null);
    if (error) { avisar(friendlyWriteError(error.message), "warn"); return; }
    avisar(a.status === "agendado" ? "Agendamento excluído." : "Rascunho excluído.");
    router.refresh();
  };
  const [msgCfgOpen, setMsgCfgOpen] = useState(false);
  const publicos = publicosDoMural({ members, ministries, fellowshipGroups, childGuardians, termo });
  const publicoDe = (a: AnnouncementView) => publicos.find((p) => p.label.toLowerCase() === (a.audience ?? "todos").toLowerCase()) ?? publicos[0];
  const acessoMsgCfg: AcessoMsgCfg = { ...ACESSO_MSG_DEFAULT, ...(church?.settings?.acessoMsgCfg ?? {}) };
  const personDoMembro = new Map(members.map((m) => [m.id, m.volunteerId]));

  const [agoraIso] = useState(() => new Date().toISOString());
  const lembrar = (a: AnnouncementView, faltam: string[]) => {
    if (!church?.organizationId || faltam.length === 0) return;
    notifyPush(church.organizationId, faltam, a.title, "Tem uma publicação nova no Mural da igreja.", "mural");
    avisar(`Lembrete enviado a ${plural(faltam.length, "pessoa")}.`);
  };

  return (
    <div className="content wide">
      <PageHead
        title="Mural"
        eyebrow="Comunicação"
        help="Publicações para a igreja toda ou para um grupo. Quem recebe vê no app, e você acompanha quem leu."
        action={<>
          {church && <Botao onClick={() => setBoletim(true)}><Icon name="whatsapp" size={14} /> Boletim da semana</Botao>}
          <Botao variante="principal" onClick={() => setCompose(true)}>+ Nova publicação</Botao>
        </>}
      />
      {pendentes.length > 0 && (
        <section className="mural-pend" aria-labelledby="mural-pend-t">
          <h2 className="dsec-title" id="mural-pend-t">{`Ainda não publicadas · ${pendentes.length}`}</h2>
          <div className="mural-list">
            {pendentes.map((a) => (
              <Cartao como="article" className="mural-item mural-item-pend" key={a.id}>
                <div className="panel-body">
                  <div className="mural-top">
                    <Selo tom={tomDaClasse(a.status === "agendado" ? "chip-solid" : "chip-neutral")}>{a.status === "agendado" && a.publish_at ? `Vai ao ar ${quandoLembra(new Date(a.publish_at))}` : "Rascunho"}</Selo>
                    {a.urgent && <Selo tom="pendente">Urgente</Selo>}
                    <span className="mural-meta">{joinDot(paraPublico(a.audience), KIND_LABEL[a.kind ?? "aviso"])}</span>
                  </div>
                  <h3 className="mural-t">{a.title}</h3>
                  {a.body && <p className="mural-txt mural-txt-curto">{a.body}</p>}
                  <div className="mural-acts">
                    {excluindo === a.id ? (
                      <>
                        <span className="mural-conf">{a.status === "agendado" ? "Excluir o agendamento?" : "Excluir o rascunho?"}</span>
                        <Botao compacto onClick={() => setExcluindo(null)}>Manter</Botao>
                        <Botao variante="perigo" compacto onClick={() => void excluir(a)}>Excluir</Botao>
                      </>
                    ) : (
                      <>
                        <Botao compacto onClick={() => setCompose(a)}>{a.status === "agendado" ? "Editar" : "Continuar"}</Botao>
                        <Botao variante="discreto" compacto onClick={() => setExcluindo(a.id)}>Excluir</Botao>
                      </>
                    )}
                  </div>
                </div>
              </Cartao>
            ))}
          </div>
          <h2 className="dsec-title mural-pub-t">Publicadas</h2>
        </section>
      )}
      <div className="mural-list">
        {noArAgora.length === 0 && <EmptyState title="Nada no Mural ainda" text="O que você publicar aparece aqui e no app de quem você escolher." action={{ label: "Nova publicação", onClick: () => setCompose(true) }} />}
        {porPublicacao(noArAgora).map((a) => {
          const pub = publicoDe(a);
          const leitores = new Set(announcementReads.filter((r) => r.announcement_id === a.id).map((r) => r.person_id));
          const leram = pub.memberIds.filter((id) => { const p = personDoMembro.get(id); return p && leitores.has(p); });
          const faltam = pub.memberIds.filter((id) => !leram.includes(id));
          const total = pub.memberIds.length;
          const pct = total ? Math.round((leram.length / total) * 100) : 0;
          const resp = announcementResponses.filter((r) => r.announcement_id === a.id);
          return (
            <Cartao como="article" className="mural-item" key={a.id}>
              <div className="panel-body">
                <div className="mural-top">
                  <Selo>{KIND_LABEL[a.kind ?? "aviso"] ?? "Aviso"}</Selo>
                  {a.urgent && <Selo tom="pendente">Urgente</Selo>}
                  {a.highlight_until && a.highlight_until > agoraIso && <Selo>{`Em destaque até ${dataPublicacao(a.highlight_until)}`}</Selo>}
                  <span className="mural-meta">{joinDot(paraPublico(pub.label), quandoPublicado(a.created_at), quandoPublicado(a.created_at) !== dataPublicacao(a.created_at) && dataPublicacao(a.created_at))}</span>
                </div>
                <h3 className="mural-t">{a.title}</h3>
                {a.body && <p className="mural-txt">{a.body}</p>}
                <div className="mural-reach">
                  <div className="mural-reach-n">{`Vista por ${leram.length} de ${plural(total, "pessoa")}`}{a.remind_at && !a.reminded_at && faltam.length > 0 ? ` · lembrete ${quandoLembra(new Date(a.remind_at))} para ${plural(faltam.length, "pessoa")}` : a.reminded_at ? ` · lembrete enviado em ${dataPublicacao(a.reminded_at)}` : ""}</div>
                  <div className="dist-bar"><div className="dist-bar-fill" style={{ width: `${pct}%` }} /></div>
                  {a.kind === "evento" && <div className="mural-reach-n">{plural(resp.filter((r) => r.response === "vou").length, "vai", "vão")} · {resp.filter((r) => r.response === "nao").length} não</div>}
                </div>
                <div className="mural-acts">
                  {faltam.length > 0 && <Botao compacto onClick={() => lembrar(a, faltam)}>Lembrar {plural(faltam.length, "pessoa")}</Botao>}
                  <VerQuemLeuButton aviso={a} reads={announcementReads} people={people.filter((p) => pub.memberIds.some((id) => personDoMembro.get(id) === p.id))} />
                </div>
              </div>
            </Cartao>
          );
        })}
      </div>

      {wallPosts.length > 0 && (
        <Cartao style={{ marginTop: 22 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="kids" size={14} /> Recados para os pais do Kids</span></div>
          <div className="panel-body flush">
            {wallPosts.map((post) => (
              <Linha key={post.id}>
                <div className="mini-main">
                  <div className="mini-title">{post.body}</div>
                  <div className="mini-sub">{joinDot(post.author || "Liderança", formatDateBR(post.created_at))}</div>
                </div>
              </Linha>
            ))}
          </div>
        </Cartao>
      )}

      {church && (
        <Cartao style={{ marginTop: 22 }}>
          <div className="panel-head"><span className="panel-title"><Icon name="whatsapp" size={14} /> Automáticas</span></div>
          <div className="panel-body">
            <div className="contato-banner" style={{ margin: 0 }}>
              <div className="contato-main"><div className="contato-t">Boas-vindas pelo WhatsApp</div><div className="contato-s">O texto que abre pronto quando você envia o acesso a um membro novo.</div></div>
              <Botao compacto onClick={() => setMsgCfgOpen(true)}>Ajustar</Botao>
            </div>
          </div>
        </Cartao>
      )}
      {msgCfgOpen && church && <AcessoMsgModal church={church} cfg={acessoMsgCfg} onClose={() => setMsgCfgOpen(false)} onRefresh={() => router.refresh()} />}
      {compose && church && <ComposerModal key={compose === true ? "novo" : compose.id} church={church} publicos={publicos} inicial={compose === true ? undefined : compose} onClose={() => setCompose(false)} onDone={() => { setCompose(false); router.refresh(); }} />}
      {boletim && church && <BoletimDaSemana church={church} avisos={noArAgora} events={events} roster={roster} ministries={ministries} people={people} onClose={() => setBoletim(false)} />}
    </div>
  );
}

