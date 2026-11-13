"use client";

/* O10: editar um encontro (só este ou este e os próximos da série) e repetir um avulso.
 * Nunca mexe no passado: "este e os próximos" vale da data deste encontro em diante.
 * Escala, presença e confirmações seguem nos mesmos encontros (event_id não muda). */
import { useState } from "react";
import { avisar } from "../../lib/avisar";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { formatDateBR, isCivilDate, somaDias, todayISO } from "../../lib/date";
import { useTermos } from "../../lib/vocabulario-context";
import { datasDaSerie, diasEntre, feitoDaSerie, mesesEntre, REPETICOES, resumoDaSerie, rotuloRepeticao, somaMeses, TETO_SERIE, type Repeticao } from "../../lib/recorrencia";
import { friendlyWriteError } from "../erros";
import { weekdayShortFromDate } from "../comum";
import { TimePicker } from "../campos";
import type { EventView } from "../tipos";
import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Janela } from "../../ui/Janela";
import { Campo, Entrada } from "../../ui/Campo";
import { SeletorData } from "../../ui/Data";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";


const rotuloRegra = (t: Text): Record<Repeticao, string> => ({ semanal: t("Toda semana"), quinzenal: t("A cada 15 dias"), mensal: t("Todo mês") });

/** Linha do cabeçalho da gaveta: de qual série é e as duas ações (lei 15: no máximo duas no topo). */
export function AcoesDoEncontro({ event, onSaved }: { event: EventView; onSaved: () => void }) {
  const traduzirUi = useTexto();

  const [aberta, setAberta] = useState<"editar" | "repetir" | null>(null);
  return (
    <div className="evento-serie">
      {event.seriesRule ? <span className="mini-sub">{traduzirUi("{regra} · parte de uma série", { regra: rotuloRegra(traduzirUi)[event.seriesRule] })}</span> : null}
      <div className="evento-serie-acoes">
        <Botao variante="discreto" compacto onClick={() => setAberta("editar")}>{traduzirUi("Editar")}</Botao>
        {!event.seriesId ? <Botao variante="discreto" compacto onClick={() => setAberta("repetir")}>{traduzirUi("Repetir")}</Botao> : null}
      </div>
      {aberta === "editar" ? <EditarEncontro event={event} aoFechar={() => setAberta(null)} onSaved={onSaved} /> : null}
      {aberta === "repetir" ? <RepetirEncontro event={event} aoFechar={() => setAberta(null)} onSaved={onSaved} /> : null}
    </div>
  );
}

function EditarEncontro({ event, aoFechar, onSaved }: { event: EventView; aoFechar: () => void; onSaved: () => void }) {
  const traduzirUi = useTexto();

  const [nome, setNome] = useState(event.name);
  const [data, setData] = useState(event.eventDate);
  const [horaCampo, setHora] = useState(event.time);
  const [alcance, setAlcance] = useState<"este" | "proximos">("este");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const emSerie = !!event.seriesId;
  const mudouData = data !== event.eventDate;

  const salvar = async () => {
    if (!nome.trim()) { setErro(traduzirUi("Digite o nome do {culto}.")); return; }
    if (!isCivilDate(data)) { setErro(traduzirUi("Informe uma data válida com dia, mês e ano.")); return; }
    /* o TimePicker devolve "20h00"; o banco guarda "20:00" (como no ServiceModal) */
    const hora = horaCampo.replace("h", ":");
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) { setErro(traduzirUi("Informe o horário de início.")); return; }
    setErro("");
    setSalvando(true);
    const sb = createServiceBrowserClient().schema("service");
    /* quem muda: só este, ou este e os próximos da mesma série (nunca os anteriores) */
    let alvos: { id: string; event_date: string }[] = [{ id: event.id, event_date: event.eventDate }];
    if (emSerie && alcance === "proximos") {
      const { data: linhas, error } = await sb.from("events").select("id, event_date")
        .eq("organization_id", event.organizationId).eq("series_id", event.seriesId!).gte("event_date", event.eventDate);
      if (error || !linhas?.length) { setSalvando(false); setErro(error ? friendlyWriteError(error.message, traduzirUi) : traduzirUi("Não foi possível ler a série agora. Tente de novo.")); return; }
      alvos = linhas;
    }
    /* só o que mudou: um encontro ajustado sozinho antes guarda o resto */
    const mudouNome = nome.trim() !== event.name, mudouHora = hora !== event.time;
    const mensal = event.seriesRule === "mensal";
    const delta = diasEntre(event.eventDate, data);
    const dataDe = (alvo: { id: string; event_date: string }) => alvo.id === event.id ? data
      /* no mensal segue o mesmo dia do mês (31/01 → 28/02); nos outros, anda o mesmo número de dias */
      : mensal ? somaMeses(data, mesesEntre(event.eventDate, alvo.event_date)) : somaDias(alvo.event_date, delta);
    const falhas: string[] = [];
    let semReserva = false;
    for (const alvo of alvos) {
      const novaData = mudouData ? dataDe(alvo) : alvo.event_date;
      const patch = { ...(mudouNome ? { name: nome.trim() } : {}), ...(mudouHora ? { time: hora } : {}), ...(mudouData ? { event_date: novaData, weekday: weekdayShortFromDate(novaData) } : {}) };
      if (!Object.keys(patch).length) continue;
      /* .select: com RLS, um update barrado não dá erro, só volta vazio */
      const { data: feitos, error } = await sb.from("events").update(patch).eq("organization_id", event.organizationId).eq("id", alvo.id).select("id");
      if (error || !feitos?.length) { falhas.push(alvo.id); continue; }
      /* a reserva do espaço acompanha o encontro (source_id não tem FK: atualização manual) */
      const reserva = { ...(mudouNome ? { title: nome.trim() } : {}), ...(mudouHora ? { start_time: hora } : {}), ...(mudouData ? { reserved_date: novaData } : {}) };
      const { error: erroReserva } = await sb.from("reservations").update(reserva)
        .eq("organization_id", event.organizationId).eq("source_type", "evento").eq("source_id", alvo.id);
      if (erroReserva) semReserva = true;
    }
    setSalvando(false);
    const tentados = alvos.length;
    if (!mudouNome && !mudouHora && !mudouData) { aoFechar(); return; }
    if (falhas.length === tentados) { setErro(traduzirUi("Não foi possível salvar. Confira se você pode editar a agenda e tente de novo.")); return; }
    if (falhas.length) avisar(traduzirUi("{count, plural, =1 {# encontro salvo} other {# encontros salvos}} de {total}. Abra os outros e salve de novo.", { count: tentados - falhas.length, total: String(tentados) }), "warn");
    else avisar(tentados > 1 ? traduzirUi("{count, plural, =1 {# encontro atualizado} other {# encontros atualizados}}, deste em diante.", { count: tentados }) : traduzirUi("Encontro atualizado."));
    if (semReserva) avisar(traduzirUi("A reserva do espaço não acompanhou. Confira em Configurações → Espaços e Salas."), "warn");
    onSaved();
    aoFechar();
  };

  return (
    <Janela acima sobretitulo={traduzirUi("Editar")} titulo={event.name} aoFechar={aoFechar} ocupada={salvando}
      rodape={<><Botao onClick={aoFechar} desativado={salvando}>{traduzirUi("Cancelar")}</Botao><Botao variante="principal" carregando={salvando} onClick={salvar}>{traduzirUi("Salvar")}</Botao></>}>
      <Campo rotulo={traduzirUi("Nome")}><Entrada value={nome} onChange={(e) => setNome(e.target.value)} /></Campo>
      <Campo rotulo={traduzirUi("Data")} className="field-half"><SeletorData valor={data} aoMudar={setData} /></Campo>
      <Campo rotulo={traduzirUi("Horário de início")} className="field-half"><TimePicker value={horaCampo} onChange={setHora} /></Campo>
      {emSerie ? (
        <Campo rotulo={traduzirUi("Aplicar em")} grupo ajuda={alcance === "proximos" && mudouData
          ? (event.seriesRule === "mensal" ? traduzirUi("Os próximos passam para o mesmo dia do mês. Os anteriores não mudam.") : traduzirUi("Os próximos andam {count, plural, =1 {# dia} other {# dias}} junto. Os anteriores não mudam.", { count: Math.abs(diasEntre(event.eventDate, data)) }))
          : traduzirUi("Os encontros anteriores não mudam. Escala e confirmações continuam em cada encontro.")}>
          <div className="kb-move" role="radiogroup" aria-label={traduzirUi("Aplicar em")}>
            <Opcao role="radio" aria-checked={alcance === "este"} marcada={alcance === "este"} estilo="seg-chip" onClick={() => setAlcance("este")}>{traduzirUi("Só este")}</Opcao>
            <Opcao role="radio" aria-checked={alcance === "proximos"} marcada={alcance === "proximos"} estilo="seg-chip" onClick={() => setAlcance("proximos")}>{traduzirUi("Este e os próximos")}</Opcao>
          </div>
        </Campo>
      ) : null}
      {erro ? <p className="fs-error" role="alert">{erro}</p> : null}
    </Janela>
  );
}

function RepetirEncontro({ event, aoFechar, onSaved }: { event: EventView; aoFechar: () => void; onSaved: () => void }) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const [regra, setRegra] = useState<Repeticao>("semanal");
  /* repetir um encontro antigo não cria encontros no passado */
  const hoje = todayISO(event.timeZone || undefined);
  const [ate, setAte] = useState(() => somaDias(event.eventDate > hoje ? event.eventDate : hoje, 56));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const datas = datasDaSerie(event.eventDate, regra, ate);
  const novas = datas.slice(1).filter((d) => d >= hoje);

  const salvar = async () => {
    if (!novas.length) { setErro(traduzirUi("Escolha até quando repete: uma data depois deste encontro.")); return; }
    setErro("");
    setSalvando(true);
    const sb = createServiceBrowserClient().schema("service");
    const seriesId = crypto.randomUUID();
    /* primeiro este encontro abre a série: se falhar, nada é criado e "Repetir" continua valendo (sem duplicar) */
    const { data: origem, error: erroOrigem } = await sb.from("events").update({ series_id: seriesId, series_rule: regra })
      .eq("organization_id", event.organizationId).eq("id", event.id).is("series_id", null).select("id");
    if (erroOrigem || !origem?.length) { setSalvando(false); setErro(traduzirUi("Não foi possível repetir. Confira se você pode editar a agenda e tente de novo.")); return; }
    const { data: linhas, error } = await sb.from("events").insert(novas.map((data) => ({
      organization_id: event.organizationId,
      church_id: event.churchId,
      name: event.name,
      kind: event.kind,
      event_date: data,
      weekday: weekdayShortFromDate(data),
      time: event.time,
      location: event.location,
      room_id: event.roomId ?? null,
      ministries: event.ministries,
      pede: event.pede ?? "aviso",
      valor: event.valor || null,
      instrucoes: event.instrucoes || null,
      series_id: seriesId,
      series_rule: regra,
    }))).select("id, event_date");
    if (error || !linhas?.length) {
      /* desfaz a marca da série para o encontro voltar a ser avulso */
      await sb.from("events").update({ series_id: null, series_rule: null }).eq("organization_id", event.organizationId).eq("id", event.id);
      setSalvando(false); setErro(error ? friendlyWriteError(error.message, traduzirUi) : traduzirUi("Não foi possível repetir agora. Tente de novo.")); return;
    }
    if (event.roomId) {
      const { error: erroReserva } = await sb.from("reservations").insert(linhas.map((l) => ({
        organization_id: event.organizationId, room_id: event.roomId, title: event.name, kind: "culto",
        reserved_date: l.event_date, start_time: event.time, source_type: "evento", source_id: l.id,
      })));
      if (erroReserva) avisar(traduzirUi("Já estão na agenda, mas o espaço não ficou reservado. Reserve em Configurações → Espaços e Salas."), "warn");
    }
    setSalvando(false);
    avisar(feitoDaSerie(novas, regra, ct("{cultos}").toLowerCase(), traduzirUi));
    onSaved();
    aoFechar();
  };

  return (
    <Janela acima sobretitulo={traduzirUi("Repetir")} titulo={event.name} texto={traduzirUi("A partir de {data}, no mesmo horário e lugar.", { data: formatDateBR(event.eventDate) })} aoFechar={aoFechar} ocupada={salvando}
      rodape={<><Botao onClick={aoFechar} desativado={salvando}>{traduzirUi("Cancelar")}</Botao><Botao variante="principal" carregando={salvando} desativado={!novas.length} onClick={salvar}>{novas.length ? traduzirUi("Criar {n}", { n: String(novas.length) }) : traduzirUi("Criar")}</Botao></>}>
      <Campo rotulo={traduzirUi("Repete")} grupo>
        <div className="kb-move" role="radiogroup" aria-label={traduzirUi("Repete")}>
          {REPETICOES.filter((r) => r.id !== "nao").map((r) => (
            <Opcao key={r.id} role="radio" aria-checked={regra === r.id} marcada={regra === r.id} estilo="seg-chip" onClick={() => setRegra(r.id as Repeticao)}>{rotuloRepeticao(r.id, traduzirUi)}</Opcao>
          ))}
        </div>
      </Campo>
      <Campo rotulo={traduzirUi("Até")} ajuda={novas.length ? resumoDaSerie(novas, regra, ct("{cultos}").toLowerCase(), traduzirUi) : traduzirUi("Escolha uma data depois deste encontro. Até {teto} de uma vez.", { teto: String(TETO_SERIE) })}>
        <SeletorData valor={ate} aoMudar={setAte} min={somaDias(event.eventDate, 1)} />
      </Campo>
      {erro ? <p className="fs-error" role="alert">{erro}</p> : null}
    </Janela>
  );
}
