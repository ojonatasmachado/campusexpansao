"use client";

import { telefoneValido } from "../../lib/telefone";
import { formatarTelefone, telefoneParaGravar } from "../../lib/telefone";
import { nomeComparavel, possivelDuplicado } from "../../lib/pessoas";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { Fragment, useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { DEFAULT_ICON } from "../../lib/icons";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { isCivilDate } from "../../lib/date";

import { useTermos } from "../../lib/vocabulario-context";
import { FormScreen, type FormScreenHandle } from "../form/FormScreen";
import { friendlyWriteError } from "../erros";
import { OUTRO_LOCAL, findPersonByName, normalize, openMemberInviteWhatsapp, timelineEventPayload, weekdayShortFromDate } from "../comum";
import { FField } from "../campos";
import type { ChurchView, MemberView, MinistryView, ModalState, PersonView, RoomView } from "../tipos";

export function findMinistryByName(ministries: MinistryView[], value: string) {
  const term = normalize(value);
  if (!term) return null;
  return ministries.find((ministry) => normalize(ministry.name) === term || normalize(ministry.name).includes(term)) ?? null;
}

export function findRoomByName(rooms: RoomView[], value: string) {
  const term = normalize(value);
  if (!term) return null;
  return rooms.find((room) => normalize(room.name) === term || normalize(room.name).includes(term)) ?? null;
}

/* Resolve o campo "local" (select de sala + opção "Outro" com endereço livre)
   pros formulários genéricos. Mesma regra em qualquer módulo : sala cadastrada
   dá room_id + nome real; "Outro" dá só o endereço digitado, sem room_id. */
export function resolveLocalField(localValue: string, enderecoValue: string, rooms: RoomView[]): { name: string; roomId: string | null } | null {
  if (localValue === OUTRO_LOCAL) {
    const address = enderecoValue.trim();
    return address ? { name: address, roomId: null } : null;
  }
  const room = findRoomByName(rooms, localValue);
  return room ? { name: room.name, roomId: room.id } : null;
}

export function ServiceModal({
  modal,
  church,
  people,
  ministries,
  rooms = [],
  currentPersonId = null,
  currentRole = "membro",
  members = [],
  onClose,
}: {
  modal: NonNullable<ModalState>;
  church?: ChurchView;
  people: PersonView[];
  members?: MemberView[];
  ministries: MinistryView[];
  rooms?: RoomView[];
  currentPersonId?: string | null;
  currentRole?: "master" | "pastor" | "lider" | "membro";
  onClose: () => void;
}) {
  const { todayISO } = useRelogioDaIgreja();
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  /* id de cada campo: o rótulo aponta para o controle (clicar no rótulo foca o campo) */
  const fid = useId();
  const COM_ID = new Set(["text", "area", "select", "date", "time", "toggle"]);
  const idDo = (k: string) => `${fid}-${k}`;
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      modal.formFields
        .filter((f): f is typeof f & { value?: string } => "value" in f && !!(f as { value?: string }).value)
        .map((f) => [f.k, (f as { value?: string }).value as string]),
    )
  );
  const [valoresIniciais] = useState(values);
  /* na tela de formulário, fechar passa pelo FormScreen para tirar a entrada do histórico */
  const telaRef = useRef<FormScreenHandle>(null);
  const fecharTudo = async () => { if (telaRef.current) await telaRef.current.fechar(); else onClose(); };
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  /* aviso de possível duplicado já mostrado para este nome + telefone: o segundo toque cadastra mesmo assim */
  const [dupVisto, setDupVisto] = useState("");

  async function save() {
    setError("");
    if (!modal.action) {
      void fecharTudo();
      return;
    }
    const action = modal.action;
    if (!church?.organizationId || !church.id) {
      setError("Nenhuma igreja foi encontrada para vincular este registro.");
      return;
    }

    const supabase = createServiceBrowserClient();
    const value = (field: string) => values[field]?.trim() ?? "";
    const namedPerson = (field: string) => findPersonByName(people, value(field));
    const namedMinistry = (field: string) => findMinistryByName(ministries, value(field));
    const namedRoom = (field: string) => findRoomByName(rooms, value(field));
    let result: { error: { message: string } | null } = { error: null };

    setSaving(true);
    if (action.kind === "member") {
      if (value("nome").split(/\s+/).length < 2) { setSaving(false); setError("Coloque nome e sobrenome."); return; }
      if (!telefoneValido(value("tel"))) { setSaving(false); setError("Coloque o telefone com DDD: o convite do app vai por WhatsApp."); return; }
      const dup = possivelDuplicado([...members, ...people], value("nome"), value("tel"));
      const chaveDup = `${nomeComparavel(value("nome"))}|${value("tel").replace(/\D/g, "")}`;
      if (dup && dupVisto !== chaveDup) {
        setSaving(false);
        setDupVisto(chaveDup);
        setError(`Pode ser alguém já cadastrado: ${dup.pessoa.name}${dup.pessoa.phone ? `, ${formatarTelefone(dup.pessoa.phone)}` : ""} tem ${dup.motivo === "telefone" ? "o mesmo telefone" : "o mesmo nome"}. Confira em Pessoas. Se for outra pessoa, toque em "${modal.saveLabel || "Salvar"}" de novo.`);
        return;
      }
      /* aba do WhatsApp aberta ainda no clique (antes do primeiro await),
         senão o navegador bloqueia; recebe o convite quando o membro existir */
      const conviteTab = window.open("", "_blank");
      const { data: newMember, error: memberError } = await supabase.schema("service").from("members").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        phone: telefoneParaGravar(value("tel")),
        email: value("email") || null,
        birth: value("nasc") || null,
        neighborhood: value("bairro") || null,
        postal_code: value("cep") || null,
        street: value("rua") || null,
        city: value("cidade") || null,
        state: value("estado") || null,
        situation: "membro",
        journey: [1, 0, 0, 0, 0],
      }).select("id").single();
      result = { error: memberError };
      if (!memberError && newMember && action.visitorId) {
        await supabase.schema("service").from("visitors").update({ member_id: newMember.id }).eq("id", action.visitorId);
      }
      if (!memberError && newMember) {
        await supabase.schema("service").from("timeline_events").insert(
          timelineEventPayload(church.organizationId, newMember.id, "decisao", "Decisão por Jesus"),
        );
        const { error: conviteError } = await openMemberInviteWhatsapp({
          memberId: newMember.id,
          name: value("nome"),
          phone: value("tel"),
          churchName: church.nome ?? "sua igreja",
          template: church.settings?.acessoMsgCfg?.mensagem,
          tab: conviteTab,
        });
        if (conviteError) avisar(`Membro cadastrado, mas o convite não saiu: ${conviteError} Use "Enviar acesso pelo WhatsApp" na ficha dele.`, "warn");
      } else {
        conviteTab?.close();
      }
    } else if (action.kind === "event") {
      if (!value("nome")) { setSaving(false); setError(ct("Digite o nome do {culto}.")); return; }
      const eventLocal = resolveLocalField(value("local"), value("endereco"), rooms);
      if (!eventLocal) { setSaving(false); setError(value("local") === OUTRO_LOCAL ? "Digite o endereço do espaço." : "Selecione um espaço já cadastrado em Configurações → Espaços e Salas."); return; }
      const eventDate = value("data");
      const eventTime = value("hora").replace("h", ":");
      if (!isCivilDate(eventDate)) { setSaving(false); setError("Informe uma data válida com dia, mês e ano."); return; }
      if (!/^([01]\d|2[0-3])[h:]([0-5]\d)$/.test(eventTime)) { setSaving(false); setError("Informe o horário de início."); return; }
      const { data: eventRow, error: eventError } = await supabase.schema("service").from("events").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        kind: value("tipo") || "Culto",
        event_date: eventDate,
        weekday: weekdayShortFromDate(eventDate),
        time: eventTime,
        location: eventLocal.name,
        room_id: eventLocal.roomId,
        ministries: [],
      }).select("id").single();
      if (eventError || !eventRow) {
        result = { error: eventError };
      } else {
        if (eventLocal.roomId && eventDate) {
          await supabase.schema("service").from("reservations").insert({
            organization_id: church.organizationId,
            room_id: eventLocal.roomId,
            title: value("nome"),
            kind: "culto",
            reserved_date: eventDate,
            start_time: eventTime,
            source_type: "evento",
            source_id: eventRow.id,
          });
        }
        result = { error: null };
      }
    } else if (action.kind === "ministry") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do time."); return; }
      result = await supabase.schema("service").from("ministries").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        icon: value("icon") || DEFAULT_ICON,
        description: value("desc") || value("proposito") || null,
        profile: { recebendoVoluntarios: value("aberto") === "true" },
      });
    } else if (action.kind === "decision") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome da pessoa.");
        return;
      }
      result = await supabase.schema("service").from("decisions").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        phone: value("tel") || null,
        service_name: value("culto") || null,
        responsible_id: namedPerson("responsavel")?.id ?? null,
        happened_on: todayISO(),
        kind: "decisao",
        status: "novo",
      });
    } else if (action.kind === "baptismClass") {
      if (!value("label")) {
        setSaving(false);
        setError("Digite o nome da turma.");
        return;
      }
      const baptismLocal = resolveLocalField(value("local"), value("endereco"), rooms);
      if (!baptismLocal) { setSaving(false); setError(value("local") === OUTRO_LOCAL ? "Digite o endereço do espaço." : "Selecione um espaço já cadastrado em Configurações → Espaços e Salas."); return; }
      result = await supabase.schema("service").from("baptism_classes").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        label: value("label"),
        baptism_date: value("data") || null,
        location: baptismLocal.name,
        room_id: baptismLocal.roomId,
        pastor: value("pastor") || null,
        status: "aberta",
        open_enrollment: true,
      });
    } else if (action.kind === "course") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome do curso.");
        return;
      }
      result = await supabase.schema("service").from("courses").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        level: value("nivel") || null,
        description: value("desc") || null,
        kind: value("tipo") || "trilha",
        category: value("nivel") || "discipulado",
        color: "clay",
      });
    } else if (action.kind === "board") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome do quadro.");
        return;
      }
      result = await supabase.schema("service").from("boards").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        ministry_id: namedMinistry("time")?.id ?? null,
        description: value("desc") || null,
        scope: namedMinistry("time") ? "time" : "geral",
        columns: [
          { id: "todo", nome: "A fazer" },
          { id: "doing", nome: "Em andamento" },
          { id: "done", nome: "Concluído" },
        ],
      });
    } else if (action.kind === "card") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título do card.");
        return;
      }
      const assignee = namedPerson("responsavel");
      result = await supabase.schema("service").from("cards").insert({
        organization_id: church.organizationId,
        board_id: action.boardId,
        column_id: action.columnId,
        title: value("titulo"),
        due: value("prazo") || null,
        assignees: assignee ? [assignee.id] : [],
        priority: "media",
        source_type: "manual",
      });
    } else if (action.kind === "visitor") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome do visitante.");
        return;
      }
      result = await supabase.schema("service").from("visitors").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        phone: value("tel") || null,
        origin: value("origem") || null,
        visited_on: value("visitou") || null,
        stage: "novo",
        due: "1º contato",
        due_status: "soon",
      });
    } else if (action.kind === "rehearsal") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título do ensaio.");
        return;
      }
      const ministry = namedMinistry("time");
      const rehearsalLocal = resolveLocalField(value("local"), value("endereco"), rooms);
      if (!rehearsalLocal) { setSaving(false); setError(value("local") === OUTRO_LOCAL ? "Digite o endereço do espaço." : "Selecione um espaço já cadastrado em Configurações → Espaços e Salas."); return; }
      result = await supabase.schema("service").from("rehearsals").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("titulo"),
        rehearsal_date: value("data") || null,
        time: value("hora") || null,
        location: rehearsalLocal.name,
        room_id: rehearsalLocal.roomId,
        ministry_id: ministry?.id ?? null,
        kind: value("tipo") || "louvor",
        recurrence: value("recorrencia") || "eventual",
        attendees: [],
        repertoire: [],
        attachments: [],
      });
    } else if (action.kind === "announcement") {
      if (!value("titulo")) {
        setSaving(false);
        setError("Digite o título do aviso.");
        return;
      }
      result = await supabase.schema("service").from("announcements").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("titulo"),
        body: value("msg") || null,
        audience: value("publico") || "todos",
        author: "Liderança",
        when_label: "agora",
      });
    } else if (action.kind === "wallPost") {
      if (!value("msg")) {
        setSaving(false);
        setError("Digite a mensagem do mural.");
        return;
      }
      result = await supabase.schema("service").from("wall_posts").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        body: value("msg"),
        audience: value("publico") || "todos",
        author: "Liderança",
        channels: ["app"],
      });
    } else if (action.kind === "room") {
      if (!value("nome")) {
        setSaving(false);
        setError("Digite o nome da sala.");
        return;
      }
      result = await supabase.schema("service").from("rooms").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        capacity: Number.parseInt(value("capacidade"), 10) || null,
        location: value("local") || null,
        resources: value("recursos") ? value("recursos").split(",").map((item) => item.trim()).filter(Boolean) : [],
        allows_meetings: value("permiteReuniao") !== "false",
      });
    } else if (action.kind === "kidsClass") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome da turma."); return; }
      const payload = {
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        min_age_months: value("min") ? Number.parseInt(value("min"), 10) : null,
        max_age_months: value("max") ? Number.parseInt(value("max"), 10) : null,
        capacity: value("capacidade") ? Number.parseInt(value("capacidade"), 10) : null,
        accent: value("cor") || "wheat",
        room_id: namedRoom("sala")?.id ?? null,
      };
      result = action.id
        ? await supabase.schema("service").from("kids_classes").update(payload).eq("id", action.id)
        : await supabase.schema("service").from("kids_classes").insert(payload);
    } else if (action.kind === "kidsEvent") {
      if (!value("titulo")) { setSaving(false); setError("Digite o título do evento."); return; }
      const kidsEventLocal = resolveLocalField(value("local"), value("endereco"), rooms);
      if (!kidsEventLocal) { setSaving(false); setError(value("local") === OUTRO_LOCAL ? "Digite o endereço do espaço." : "Selecione um espaço já cadastrado em Configurações → Espaços e Salas."); return; }
      result = await supabase.schema("service").from("kids_events").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        title: value("titulo"),
        description: value("desc") || null,
        event_date: value("data") || null,
        time: value("hora") || null,
        location: kidsEventLocal.name,
        room_id: kidsEventLocal.roomId,
        capacity: value("capacidade") ? Number.parseInt(value("capacidade"), 10) : null,
        open_enrollment: true,
      });
    } else if (action.kind === "avaliacaoResposta") {
      if (!currentPersonId) { setSaving(false); setError(ct("Não foi possível identificar seu cadastro de {voluntario}.")); return; }
      const minhasEquipes = ministries.filter((m) => m.people.some((p) => p.personId === currentPersonId)).map((m) => m.name);
      const { data: novaResposta, error: respostaError } = await supabase.schema("service").from("respostas").insert({
        enquete_id: action.enquete.id,
        organization_id: church.organizationId,
        person_id: currentPersonId,
        papel: currentRole,
        times_acessados: minhasEquipes,
        data: todayISO(),
      }).select("id").single();
      if (respostaError || !novaResposta) {
        result = { error: respostaError };
      } else {
        const itens = action.enquete.perguntas.map((p) => ({
          resposta_id: novaResposta.id,
          pergunta_id: p.id,
          organization_id: church.organizationId,
          valor: value(p.id),
        }));
        result = await supabase.schema("service").from("respostas_perguntas").insert(itens);
        if (!result.error) {
          await supabase.schema("service").from("enquete_visto").upsert(
            { enquete_id: action.enquete.id, person_id: currentPersonId, organization_id: church.organizationId, visto_em: new Date().toISOString() },
            { onConflict: "enquete_id,person_id" },
          );
        }
      }
    } else if (action.kind === "pesquisaResposta") {
      if (!currentPersonId) { setSaving(false); setError(ct("Não foi possível identificar seu cadastro de {voluntario}.")); return; }
      const pesquisa = action.pesquisa;
      let respostaId = pesquisa.respostaId;
      if (!respostaId) {
        const { data: novaResposta, error: respostaError } = await supabase.schema("service").from("pesquisas_respostas").insert({
          pesquisa_id: pesquisa.id,
          organization_id: church.organizationId,
          person_id: currentPersonId,
          papel: currentRole,
          event_id: pesquisa.eventoId,
          data: todayISO(),
        }).select("id").single();
        if (respostaError || !novaResposta) result = { error: respostaError };
        else respostaId = (novaResposta as { id: string }).id;
      }
      if (respostaId) {
        const itens = pesquisa.perguntas.map((p) => ({
          resposta_id: respostaId as string,
          pergunta_id: p.id,
          organization_id: church.organizationId,
          valor: value(p.id),
        }));
        result = await supabase.schema("service").from("pesquisas_respostas_perguntas").upsert(itens, { onConflict: "resposta_id,pergunta_id" });
      }
    } else if (action.kind === "identity") {
      result = await supabase.schema("service").from("church_identity").upsert({
        church_id: church.id,
        organization_id: church.organizationId,
        purpose: value("proposito") || null,
        mission: value("missao") || null,
        vision: value("visao") || null,
        verse: value("versiculo") || null,
        updated_at: new Date().toISOString(),
      });
    } else if (action.kind === "historyEntry") {
      if (!value("titulo")) { setSaving(false); setError("Digite o título do capítulo."); return; }
      const payload = {
        organization_id: church.organizationId,
        church_id: church.id,
        year: value("ano") || null,
        title: value("titulo"),
        body: value("desc") || null,
        link: value("link") || null,
        updated_at: new Date().toISOString(),
      };
      result = action.id
        ? await supabase.schema("service").from("history_entries").update(payload).eq("id", action.id)
        : await supabase.schema("service").from("history_entries").insert(payload);
    } else if (action.kind === "cycle") {
      if (!value("ano") || !value("tema")) { setSaving(false); setError("Digite o ano e o tema do ciclo."); return; }
      const payload = {
        year: value("ano"),
        theme: value("tema"),
        verse: value("versiculo") || null,
        body: value("desc") || null,
        objectives: value("objetivos") ? value("objetivos").split(",").map((title) => ({ title: title.trim() })).filter((o) => o.title) : [],
      };
      result = action.id
        ? await supabase.schema("service").from("cycles").update(payload).eq("id", action.id)
        : await supabase.schema("service").from("cycles").insert({
            organization_id: church.organizationId,
            church_id: church.id,
            ...payload,
            is_active: true,
          });
    } else if (action.kind === "title") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do papel ministerial."); return; }
      result = await supabase.schema("service").from("ministerial_titles").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
      });
    } else if (action.kind === "tag") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome da etiqueta."); return; }
      result = await supabase.schema("service").from("tags").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        color: value("cor") || "wheat",
      });
    } else if (action.kind === "group") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome do grupo."); return; }
      result = await supabase.schema("service").from("fellowship_groups").insert({
        organization_id: church.organizationId,
        church_id: church.id,
        name: value("nome"),
        leader_person_id: namedPerson("lider")?.id ?? null,
        weekday: value("dia") || null,
        time: value("hora") || null,
        neighborhood: value("bairro") || null,
      });
    } else if (action.kind === "congregacao") {
      if (!value("nome")) { setSaving(false); setError("Digite o nome da congregação."); return; }
      result = await supabase.schema("service").from("churches").insert({
        organization_id: church.organizationId,
        name: value("nome"),
        city: value("cidade") || null,
        is_headquarters: false,
        doc: value("doc") || null,
        founded_year: value("fundada") || null,
        address: value("endereco") || null,
        postal_code: value("cep") || null,
        email: value("email") || null,
        phone: value("tel") || null,
      });
    }

    setSaving(false);
    if (result.error) {
      setError(friendlyWriteError(result.error.message));
      return;
    }
    /* fecha primeiro: o voltar do histórico restaura a árvore da entrada anterior,
       então o refresh vem depois, para a lista já chegar com o dado novo */
    await fecharTudo();
    router.refresh();
  }

  const hasHalf = modal.formFields.some((f) => f.half);
  const visiveis = modal.formFields.filter((field) => !field.showIf || values[field.showIf.field] === field.showIf.equals);
  const mudou = Array.from(new Set([...Object.keys(values), ...Object.keys(valoresIniciais)])).some((k) => (values[k] ?? "") !== (valoresIniciais[k] ?? ""));

  /* mais de 4 campos: tela de formulário em vez de janela (onda 1) */
  if (modal.formFields.length > 4) {
    const falta = visiveis.filter((field) => field.req && !(values[field.k] ?? "").trim()).map((field) => field.label.toLowerCase());
    return (
      <FormScreen
        ref={telaRef}
        eyebrow={modal.eyebrow}
        title={modal.title}
        subtitle={modal.subtitle}
        saveLabel={modal.saveLabel || "Salvar"}
        saving={saving}
        missing={falta}
        dirty={mudou}
        error={error}
        onSave={save}
        onClose={onClose}
      >
        <div className="fs-grid">
          {visiveis.map((field) => (
            <Fragment key={field.k}>
            {field.secao ? <h3 className="fs-sec-t">{field.secao}</h3> : null}
            <div className={`field${field.half ? " half" : ""}`}>
              {field.type === "select" && field.options.length <= 6
                ? <div className={`field-label${field.req ? " req" : ""}`} id={`${idDo(field.k)}-r`}>{field.label}</div>
                : <label className={`field-label${field.req ? " req" : ""}`} htmlFor={COM_ID.has(field.type) ? idDo(field.k) : undefined}>{field.label}</label>}
              {field.type === "select" && field.options.length <= 6 ? (
                <div className="fs-chips" role="group" aria-labelledby={`${idDo(field.k)}-r`}>
                  {field.options.map((o) => (
                    <button
                      type="button"
                      key={o.v}
                      aria-pressed={values[field.k] === o.v}
                      className={`seg-chip${values[field.k] === o.v ? " on" : ""}`}
                      onClick={() => setValues((cur) => ({ ...cur, [field.k]: cur[field.k] === o.v && !field.req ? "" : o.v }))}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              ) : (
                <FField
                  field={field}
                  id={COM_ID.has(field.type) ? idDo(field.k) : undefined}
                  value={values[field.k] ?? ""}
                  onChange={(v) => setValues((cur) => ({ ...cur, [field.k]: v }))}
                  onPatch={(patch) => setValues((cur) => ({ ...cur, ...patch }))}
                />
              )}
              {field.hint && <div className="field-hint">{field.hint}</div>}
            </div>
            </Fragment>
          ))}
        </div>
      </FormScreen>
    );
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className={`modal${hasHalf ? " wide" : ""}`} onClick={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">{modal.eyebrow}</div>
          <div className="modal-title">{modal.title}</div>
          {modal.subtitle && <div className="modal-sub">{modal.subtitle}</div>}
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0 16px" }}>
            {modal.formFields.filter((field) => !field.showIf || values[field.showIf.field] === field.showIf.equals).map((field) => (
              <div
                className="field"
                key={field.k}
                style={field.half ? { flex: "1 1 calc(50% - 8px)", minWidth: 160 } : { flex: "1 1 100%" }}
              >
                <label className={`field-label${field.req ? " req" : ""}`} htmlFor={COM_ID.has(field.type) ? idDo(field.k) : undefined}>
                  {field.label}
                </label>
                <FField
                  field={field}
                  id={COM_ID.has(field.type) ? idDo(field.k) : undefined}
                  value={values[field.k] ?? ""}
                  onChange={(v) => setValues((cur) => ({ ...cur, [field.k]: v }))}
                  onPatch={(patch) => setValues((cur) => ({ ...cur, ...patch }))}
                />
                {field.hint && <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)", marginTop: 5 }}>{field.hint}</div>}
              </div>
            ))}
          </div>
          {error ? <p className="mini-sub" style={{ color: "var(--danger)", marginTop: 12 }}>{error}</p> : null}
        </div>
        <div className="modal-foot">
          <button className="btn btn-sec" type="button" onClick={onClose} disabled={saving}>Cancelar</button>
          <button className="btn btn-pri" type="button" onClick={save} disabled={saving}>{saving ? "Salvando..." : (modal.saveLabel || "Salvar")}</button>
        </div>
      </div>
    </div>
  );
}
