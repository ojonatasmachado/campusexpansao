"use client";

/* Configuração guiada em 3 fases (v7 4.12). Dá para pular e retomar; cada
   fase mostra o tempo estimado e termina num resumo em frase. As gravações
   são do painel (ServiceExactApp), que passa as ações prontas: este arquivo
   só desenha e decide a ordem. */
import { FusoField } from "./FusoField";
import { telefoneValido } from "../../lib/telefone";
import { useRef, useState } from "react";
import CepInput from "../../CepInput";
import ChurchLockup from "../../ChurchLockup";
import { ImageUpload } from "../../ImageUpload";
import { Icon } from "../../lib/icons";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { formatDateBR, somaDias } from "../../lib/date";
import { plural } from "../../lib/plural";
import { ACCENT_PRESETS, themeCss, type BrandCfg } from "../../lib/theme";
import { useTermos } from "../../lib/vocabulario-context";
import { encontroUtil, planejarEncontros, type EncontroPreparado, type RascunhoEncontro } from "./ativacao";
import { FASES, MODELOS_TIMES, type ModeloTime, type SetupEstado } from "./setup";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Campo, Entrada, Marcar } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { SeletorData, SeletorHora } from "../../ui/Data";
export type DadosIgreja = { fuso: string; nome: string; cep: string; endereco: string; bairro: string; cidade: string; estado: string };

export function Assistente({
  estado, onEstado, igreja, logoUrl, brand, onSalvarDados, onLogo, onRemoverLogo, onCor,
  timesExistentes, encontros, onCriarTimes, onCriarCultos, onAtualizarEncontro, onVerEncontro, onConvidar, onIr,
}: {
  estado: SetupEstado;
  onEstado: (e: SetupEstado) => Promise<string | null>;
  igreja: DadosIgreja;
  logoUrl?: string | null;
  brand: BrandCfg;
  onSalvarDados: (d: DadosIgreja) => Promise<string | null>;
  onLogo: (file: File) => Promise<void>;
  onRemoverLogo: () => Promise<void>;
  onCor: (hex: string) => Promise<string | null>;
  timesExistentes: string[];
  encontros: EncontroPreparado[];
  onVerEncontro: (id: string) => void;
  onCriarTimes: (modelos: ModeloTime[]) => Promise<{ ids: string[]; error?: string }>;
  onCriarCultos: (cultos: EncontroPreparado[]) => Promise<{ ids: string[]; error?: string }>;
  onAtualizarEncontro: (encontro: EncontroPreparado) => Promise<string | null>;
  onConvidar: (nome: string, telefone: string) => Promise<{ memberId?: string; error?: string; alreadyHasAccess?: boolean }>;
  onIr: (rota: "escalas" | "painel" | "times" | "cultos") => void;
}) {
  const { todayISO, horaAgoraBR } = useRelogioDaIgreja();
  const { termo, comTermos: ct } = useTermos();
  const [fase, setFase] = useState<1 | 2 | 3>(estado.fase);
  const [resumo, setResumo] = useState<Record<number, string>>({});
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);

  /* fase 1 */
  const [dados, setDados] = useState<DadosIgreja>(igreja);
  const [cor, setCor] = useState<string>(brand.accent ?? "");
  /* fase 2 */
  const existe = (nome: string) => timesExistentes.some((t) => t.trim().toLowerCase() === nome.toLowerCase());
  const uteis = encontros.filter((e) => encontroUtil(e, todayISO(), horaAgoraBR())).sort((a, b) => (a.data + a.hora).localeCompare(b.data + b.hora));
  const [selecionado, setSelecionado] = useState(estado.primeiroEventoId ?? "");
  const [rascunho, setRascunho] = useState<RascunhoEncontro>(estado.rascunho ?? { nome: termo("culto"), data: "", hora: "", local: igreja.endereco, repetir: false, ate: somaDias(todayISO(), 30) });
  const [modelos, setModelos] = useState<string[]>([]);
  const [timesFeitos, setTimesFeitos] = useState<string[]>([]);
  const [criados, setCriados] = useState<string[]>([]);
  const [confirmados, setConfirmados] = useState<EncontroPreparado[]>([]);
  const [editando, setEditando] = useState<string | null>(null);
  const idsDaTentativa = useRef<Record<string, string>>({});
  const operando = useRef(false);
  const atual = confirmados.find((e) => e.id === selecionado && encontroUtil(e, todayISO(), horaAgoraBR())) ?? uteis.find((e) => e.id === selecionado);
  const registrado = encontros.find((e) => e.id === selecionado);
  const plano = planejarEncontros(rascunho, todayISO(), horaAgoraBR());
  const setEncontro = (patch: Partial<RascunhoEncontro>) => setRascunho((r) => ({ ...r, ...patch }));
  const ajustarEncontro = (e: EncontroPreparado) => { setRascunho({ ...e, repetir: false, ate: somaDias(e.data || todayISO(), 30) }); setEditando(e.id); setErro(""); };
  /* fase 3 */
  const [convNome, setConvNome] = useState("");
  const [convTel, setConvTel] = useState("");
  const [convidados, setConvidados] = useState<string[]>([]);

  const modelosEscolhidos = MODELOS_TIMES.filter((m) => modelos.includes(m.id) && !existe(m.nome) && !timesFeitos.includes(m.id));

  const avancar = async (n: 1 | 2 | 3, texto: string, pulou = false) => {
    const feitas = pulou ? estado.feitas : [...new Set([...estado.feitas, n])];
    const prox = (n < 3 ? n + 1 : 3) as 1 | 2 | 3;
    const error = await onEstado({ ...estado, fase: prox, feitas, pulou: pulou || estado.pulou, primeiroEventoId: atual?.id ?? estado.primeiroEventoId, rascunho: atual ? undefined : rascunho, concluido: n === 3 ? !!atual : estado.concluido });
    if (error) { setErro(error); return false; }
    setResumo((r) => ({ ...r, [n]: texto }));
    setErro("");
    if (n < 3) setFase(prox);
    return true;
  };
  const executar = async (acao: () => Promise<void>) => {
    if (operando.current) return;
    operando.current = true;
    setOcupado(true);
    setErro("");
    try { await acao(); } catch { setErro("Não conseguimos concluir agora. Seus dados continuam na tela. Tente novamente."); }
    finally { operando.current = false; setOcupado(false); }
  };

  const salvarFase1 = async () => {
    if (!dados.nome.trim()) { setErro("Digite o nome da igreja."); return; }
    const e1 = await onSalvarDados(dados);
    const e2 = !e1 && cor && cor !== brand.accent ? await onCor(cor) : null;
    if (e1 || e2) { setErro(e1 ?? e2 ?? ""); return; }
    const corNome = ACCENT_PRESETS.find((p) => p.hex.toLowerCase() === (cor || "").toLowerCase())?.label;
    await avancar(1, `Pronto: ${dados.nome.trim()}${dados.cidade ? `, em ${dados.cidade}${dados.estado ? `/${dados.estado}` : ""}` : ""}${corNome ? `, com a cor ${corNome}` : ""}.`);
  };

  const criarFase2 = async () => {
    if (plano.erro) { setErro(plano.erro); return; }
    if (editando) {
      const e = { ...plano.encontros[0], id: editando };
      const error = await onAtualizarEncontro(e);
      if (error) { setErro(error); return; }
      setConfirmados((v) => [...v.filter((item) => item.id !== e.id), e]);
      setSelecionado(e.id);
      setEditando(null);
      return;
    }
    const lista = plano.encontros.map((e) => {
      const key = JSON.stringify(e);
      return { ...e, id: idsDaTentativa.current[key] ?? (idsDaTentativa.current[key] = crypto.randomUUID()) };
    });
    const c = await onCriarCultos(lista);
    if (c.error || !c.ids.length) { setErro(c.error ?? "Nenhum encontro foi criado. Tente novamente."); return; }
    const salvos = lista.map((e, i) => ({ ...e, id: c.ids[i] }));
    setCriados(c.ids);
    setConfirmados(salvos);
    setSelecionado(c.ids[0]);
    const error = await onEstado({ ...estado, fase: 2, rascunho: undefined, primeiroEventoId: c.ids[0] });
    if (error) setErro(`O encontro foi criado. Não foi possível salvar seu ponto de retomada: ${error}`);
  };
  const criarTimes = async () => {
    const t = await onCriarTimes(modelosEscolhidos);
    setTimesFeitos((v) => [...v, ...modelosEscolhidos.slice(0, t.ids.length).map((m) => m.id)]);
    if (t.error) setErro(`O encontro continua na agenda. Alguns times não ficaram prontos: ${t.error} Tente os modelos restantes ou confira em Times.`);
  };

  const convidar = async () => {
    if (convNome.trim().split(/\s+/).length < 2) { setErro("Coloque nome e sobrenome."); return; }
    if (!telefoneValido(convTel)) { setErro("Coloque o telefone com DDD. Para outro país, inclua + e o código do país."); return; }
    const r = await onConvidar(convNome.trim(), convTel);
    if (r.error) { setErro(r.error); return; }
    setConvidados((l) => [...l.filter((item) => !item.startsWith(`${convNome.trim()}:`)), `${convNome.trim()}: ${r.alreadyHasAccess ? "já tem acesso, link de entrada preparado" : "convite preparado, aguarda envio e aceite"}`]);
    setConvNome("");
    setConvTel("");
  };

  const faseInfo = FASES[fase - 1];
  return (
    <div className="content wide service-setup-editorial">
      {cor && <style dangerouslySetInnerHTML={{ __html: themeCss({ ...brand, accent: cor }) }} />}
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Configuração</div>
          <h1 className="ph-title">Vamos começar pela sua igreja</h1>
          <p className="ph-sub">Identifique sua igreja, prepare os próximos encontros e convide quem vai ajudar. Você pode continuar depois.</p>
        </div>
        <div className="ph-actions"><Botao desativado={ocupado || !!editando} onClick={() => executar(async () => {
          const error = await onEstado({ ...estado, fase, primeiroEventoId: atual?.id ?? estado.primeiroEventoId, rascunho: atual ? undefined : rascunho });
          if (error) { setErro(error); return; }
          onIr("painel");
        })}>{ocupado ? "Salvando..." : "Continuar depois"}</Botao></div>
      </div>

      <ol className="setup-fases">
        {FASES.map((f) => {
          const feita = estado.feitas.includes(f.n);
          return (
            <li key={f.n} className={`${fase === f.n ? "on" : ""}${feita ? " feita" : ""}`}>
              <Acao desativado={ocupado || (!!editando && f.n !== 2)} onClick={() => { setErro(""); setFase(f.n as 1 | 2 | 3); }} aria-current={fase === f.n ? "step" : undefined}>
                <span className="setup-n">{feita ? <Icon name="ok" size={14} /> : f.n}</span>
                <span className="setup-ft"><b>{ct(f.t)}</b><span>{feita ? "feita" : `cerca de ${plural(f.min, "minuto")}`}</span></span>
              </Acao>
            </li>
          );
        })}
      </ol>

      <div className="cfg-card service-setup-body">
        <div className="cfg-card-t">{`Fase ${fase} · ${ct(faseInfo.t)}`}</div>
        <div className="cfg-card-s">{`${ct(faseInfo.s)}. Cerca de ${plural(faseInfo.min, "minuto")}.`}</div>

        {fase === 1 && (
          <div className="setup-body">
            <Campo rotulo="Nome da igreja" obrigatorio id="setup-nome"><Entrada value={dados.nome} onChange={(e) => setDados((d) => ({ ...d, nome: e.target.value }))} /></Campo>
            <FusoField value={dados.fuso} onChange={(fuso) => setDados((d) => ({ ...d, fuso }))} />
            <details className="service-setup-options"><summary>Endereço da igreja (opcional)</summary>
            <Campo rotulo="CEP" id="setup-cep" ajuda="O CEP preenche o endereço.">
              <CepInput id="setup-cep" value={dados.cep} onChange={(v) => setDados((d) => ({ ...d, cep: v }))}
                onResult={(r) => { if (r) setDados((d) => ({ ...d, endereco: r.street ?? d.endereco, bairro: r.neighborhood ?? d.bairro, cidade: r.city ?? d.cidade, estado: r.state ?? d.estado })); }} />
            </Campo>
            <Campo rotulo="Endereço" id="setup-endereco"><Entrada value={dados.endereco} onChange={(e) => setDados((d) => ({ ...d, endereco: e.target.value }))} /></Campo>
            <div className="setup-2col">
              <Campo rotulo="Cidade" id="setup-cidade"><Entrada value={dados.cidade} onChange={(e) => setDados((d) => ({ ...d, cidade: e.target.value }))} /></Campo>
              <Campo rotulo="Estado" id="setup-estado"><Entrada value={dados.estado} maxLength={2} onChange={(e) => setDados((d) => ({ ...d, estado: e.target.value.toUpperCase() }))} /></Campo>
            </div>
            </details>
            <details className="service-setup-options"><summary>Logo e cor da igreja (opcional)</summary>
            <ImageUpload label="Logo" hint="Aparece ao lado de Service no app, no login e no convite." url={logoUrl} onUpload={onLogo} onRemove={onRemoverLogo} />
            <div className="field">
              <label className="field-label">Cor da igreja</label>
              <div className="setup-cores" role="radiogroup" aria-label="Cor da igreja">
                {ACCENT_PRESETS.map((p) => (
                  <Opcao key={p.hex} role="radio" aria-checked={cor.toLowerCase() === p.hex.toLowerCase()} aria-label={p.label}
                    marcada={cor.toLowerCase() === p.hex.toLowerCase()} estilo="setup-cor" style={{ background: p.hex }} onClick={() => setCor(p.hex)} />
                ))}
              </div>
              <div className="field-hint">A tela já mostra a cor escolhida. Ajuste fino em Configurações › Personalização.</div>
            </div>
            </details>
            <div className="setup-previa" aria-hidden="true">
              <ChurchLockup size="sm" logoUrl={logoUrl} name={dados.nome || "Sua igreja"} />
              <span className={botaoClasse({ variante: "principal", compacto: true })}>{ct("Confirmar presença no {culto}")}</span>
            </div>
          </div>
        )}

        {fase === 2 && (
          <div className="setup-body">
            {atual && !editando ? (
              <section className="service-setup-result" aria-label="Encontro preparado">
                <p className="cfg-card-s">Encontro disponível na agenda da igreja</p>
                <h2>{atual.nome}</h2>
                <p>{formatDateBR(atual.data)} · {atual.hora}</p><p>{atual.local}</p>
                <p className="field-hint">O membro encontra o encontro e seu local na Agenda. Não há pedido de confirmação de presença nesta criação.</p>
                <Botao desativado={ocupado} onClick={() => onVerEncontro(atual.id)}>Conferir encontro</Botao>
                {estado.primeiroEventoId === atual.id && <Botao desativado={ocupado} onClick={() => ajustarEncontro(atual)}>Ajustar dados do encontro</Botao>}
                {criados.length > 1 && <p className="field-hint">{plural(criados.length, "encontro preparado")}. A repetição termina em {formatDateBR(rascunho.ate)}.</p>}
              </section>
            ) : (
              <>
                {!editando && registrado && !atual && <div className="service-setup-result"><p>O encontro registrado precisa de revisão antes de concluir a ativação.</p><Botao desativado={ocupado} onClick={() => ajustarEncontro(registrado)}>Revisar encontro cadastrado</Botao></div>}
                {!editando && uteis.length > 0 && <Campo rotulo="Continuar com um encontro já preparado" id="setup-existente"><Selecao valor={selecionado} aoMudar={setSelecionado} vazio="Preparar um novo encontro" opcoes={uteis.map((e) => ({ v: e.id, l: `${e.nome} · ${formatDateBR(e.data)} · ${e.hora}` }))} /></Campo>}
                <Campo rotulo="Nome do encontro" obrigatorio id="setup-encontro-nome"><Entrada value={rascunho.nome} onChange={(e) => setEncontro({ nome: e.target.value })} /></Campo>
                <div className="setup-2col">
                  <Campo rotulo="Data" obrigatorio id="setup-encontro-data"><SeletorData min={todayISO()} valor={rascunho.data} aoMudar={(v) => setEncontro({ data: v })} /></Campo>
                  <Campo rotulo="Horário de início" obrigatorio id="setup-encontro-hora"><SeletorHora valor={rascunho.hora} aoMudar={(v) => setEncontro({ hora: v })} /></Campo>
                </div>
                <Campo rotulo="Local do encontro" obrigatorio id="setup-encontro-local" ajuda="Informe um lugar que as pessoas consigam encontrar."><Entrada value={rascunho.local} placeholder="Nome do lugar e endereço" onChange={(e) => setEncontro({ local: e.target.value })} /></Campo>
                {!editando && <details className="service-setup-options"><summary>Repetir este encontro (opcional)</summary>
                  <Marcar className="service-setup-check" checked={rascunho.repetir} onChange={(e) => setEncontro({ repetir: e.target.checked })}>Repetir semanalmente neste dia e horário</Marcar>
                  {rascunho.repetir && <Campo rotulo="Repetir até" id="setup-ate"><SeletorData min={rascunho.data} valor={rascunho.ate} aoMudar={(v) => setEncontro({ ate: v })} /></Campo>}
                </details>}
                {!plano.erro && <section className="service-setup-preview" aria-label="Prévia para o membro"><p className="field-label">Assim aparece na agenda</p><h2>{rascunho.nome}</h2><p>{formatDateBR(rascunho.data)} · {rascunho.hora}</p><p>{rascunho.local}</p><p className="field-hint">{editando ? "Os ajustes atualizam este encontro, sem criar outro." : `${plural(plano.encontros.length, "encontro")} ${plano.encontros.length === 1 ? "será disponibilizado" : "serão disponibilizados"} na agenda. A equipe pode ser organizada depois.`}</p></section>}
                {plano.erro && <p className="field-hint">{plano.erro}</p>}
              </>
            )}
            {atual && !editando && <details className="service-setup-options"><summary>Preparar times agora (opcional)</summary>
              <p className="field-hint">O encontro já pode ser encontrado pelos membros. Escolha somente os times que você quer organizar agora.</p>
              <div className="setup-modelos">{MODELOS_TIMES.map((m) => {
                const ja = existe(m.nome) || timesFeitos.includes(m.id);
                return <Opcao key={m.id} marcada={modelos.includes(m.id) && !ja} estilo="setup-modelo" aria-pressed={modelos.includes(m.id) && !ja} desativado={ocupado || ja} onClick={() => setModelos((l) => l.includes(m.id) ? l.filter((x) => x !== m.id) : [...l, m.id])}><Icon name={m.icone} size={18} /><span><b>{m.nome}</b><span>{ja ? "já existe" : m.funcoes.map((f) => f.nome).join(", ")}</span></span></Opcao>;
              })}</div>
              <Botao desativado={ocupado || !modelosEscolhidos.length} onClick={() => executar(criarTimes)}>{ocupado ? "Preparando..." : "Preparar times escolhidos"}</Botao>
              {timesFeitos.length > 0 && <p className="field-hint" role="status">{plural(timesFeitos.length, "time preparado")}. Marque os responsáveis em Times.</p>}
            </details>}
          </div>
        )}

        {fase === 3 && (
          <div className="setup-body">
            <p className="cfg-card-s" style={{ marginTop: 0 }}>Convide uma pessoa para entrar no app. O WhatsApp abre com uma mensagem pronta: você ainda precisa enviá-la. O convite não concede papel de liderança nem vincula a um time.</p>
            <div className="setup-2col">
              <Campo rotulo="Nome e sobrenome" id="setup-convite-nome"><Entrada value={convNome} onChange={(e) => setConvNome(e.target.value)} /></Campo>
              <Campo rotulo="Telefone (WhatsApp)" id="setup-convite-tel"><Entrada type="tel" value={convTel} placeholder="(11) 90000-0000" onChange={(e) => setConvTel(e.target.value)} /></Campo>
            </div>
            <Botao desativado={ocupado} onClick={() => executar(convidar)}><Icon name="whatsapp" size={15} /> Convidar pelo WhatsApp</Botao>
            {convidados.length > 0 && <p className="setup-frase">{`Convites preparados no WhatsApp: ${convidados.join(", ")}.`}</p>}
            {timesExistentes.length > 0 && atual && <details className="service-setup-options"><summary>Definir responsáveis e organizar a equipe</summary>
              <p className="field-hint">O acesso ao app é separado da responsabilidade por um time. Confira quem lidera e depois prepare a escala do encontro.</p>
              <div className="setup-2col"><Botao desativado={ocupado} onClick={() => onIr("times")}>Definir líderes em Times</Botao><Botao desativado={ocupado} onClick={() => onIr("escalas")}>Preparar escala</Botao></div>
            </details>}
          </div>
        )}

        {resumo[fase] && <p className="setup-frase">{resumo[fase]}</p>}
        {erro && <p className="field-error" role="alert">{erro}</p>}

        <div className="setup-foot">
          {editando ? <Botao variante="discreto" desativado={ocupado} onClick={() => { setEditando(null); setErro(""); }}>Cancelar ajuste</Botao> : <Botao variante="discreto" desativado={ocupado} onClick={() => executar(async () => { if (fase < 3) await avancar(fase, "", true); else onIr("painel"); })}>{fase < 3 ? "Pular esta fase" : "Fazer depois"}</Botao>}
          {fase === 1 && <Botao variante="principal" desativado={ocupado} onClick={() => executar(salvarFase1)}>{ocupado ? "Salvando..." : "Salvar e continuar →"}</Botao>}
          {fase === 2 && (!atual || editando) && <Botao variante="principal" desativado={ocupado || !!plano.erro} onClick={() => executar(criarFase2)}>{ocupado ? "Salvando..." : editando ? "Salvar ajustes" : "Disponibilizar na agenda"}</Botao>}
          {fase === 2 && atual && !editando && <Botao variante="principal" desativado={ocupado} onClick={() => executar(async () => { await avancar(2, `Encontro preparado: ${atual.nome}.`); })}>Continuar →</Botao>}
          {fase === 3 && <Botao variante="principal" desativado={ocupado} onClick={() => executar(async () => {
            if (!atual) { setErro("Prepare ou escolha um encontro antes de encerrar a ativação."); setFase(2); return; }
            if (await avancar(3, "Confira a agenda e acompanhe os acessos em Pessoas.", convidados.length === 0)) onIr("cultos");
          })}>{ocupado ? "Salvando..." : atual ? "Concluir e ver agenda" : "Preparar primeiro encontro"}</Botao>}

        </div>
      </div>
    </div>
  );
}
