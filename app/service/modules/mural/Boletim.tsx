"use client";

/* Boletim da semana (jornada 7 de JORNADAS_PONTE.md): escolhe a semana, o
   texto sai pronto com agenda, avisos no ar e, se quiser, a escala; a pessoa
   edita e manda no WhatsApp ou copia. Imagem para status e story opcional. */

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { avisar } from "../../lib/avisar";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { toISODate, parseISODate } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { FormScreen, FormSection } from "../../painel/form/FormScreen";
import { agendaDaSemana, avisosDaSemana, escalaDaSemana, montarBoletim, rotuloSemana, semanaDe, type Incluir } from "./boletim";
import { desenharBoletim } from "./boletim-imagem";
import type { MuralAviso } from "./estado";
import type { ChurchView, EventView, MinistryView, PersonView, RosterAssignmentView } from "../../ServiceExactApp";

import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Campo } from "../../ui/Campo";
import { SeletorData } from "../../ui/Data";
import { useTexto } from "../../lib/internacional/contexto";
type Qual = "esta" | "proxima" | "outra";

export function BoletimDaSemana({ church, avisos, events, roster, ministries, people, onClose }: {
  church: ChurchView; avisos: MuralAviso[]; events: EventView[]; roster: RosterAssignmentView[];
  ministries: MinistryView[]; people: PersonView[]; onClose: () => void;
}) {
  const traduzirUi = useTexto();

  const { todayISO } = useRelogioDaIgreja();
  const fid = useId();
  const [hoje] = useState(todayISO);
  const proximaSeg = useMemo(() => { const s = parseISODate(semanaDe(hoje).inicio)!; return toISODate(new Date(s.getFullYear(), s.getMonth(), s.getDate() + 7)); }, [hoje]);
  const [qual, setQual] = useState<Qual>("esta");
  const [outroDia, setOutroDia] = useState("");
  const semana = semanaDe(qual === "esta" ? hoje : qual === "proxima" ? proximaSeg : outroDia || hoje);
  const [incluir, setIncluir] = useState<Incluir>({ avisos: true, agenda: true, escala: false });

  const doMural = avisosDaSemana(avisos, semana);
  const agenda = agendaDaSemana(events, semana);
  const escala = escalaDaSemana(agenda, roster, ministries, people);
  const montado = montarBoletim({ igreja: church.nome, semana, avisos: doMural, agenda, escala, incluir });

  /* o texto acompanha as escolhas até a pessoa editar; depois disso, só se ela pedir */
  const [textoEditado, setTextoEditado] = useState<string | null>(null);
  const texto = textoEditado ?? montado;
  const editado = textoEditado !== null;
  const desatualizado = editado && texto !== montado;

  const vazio = doMural.length === 0 && agenda.length === 0;
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar(traduzirUi("Texto copiado. É só colar no grupo."));
    } catch {
      avisar(traduzirUi("Não deu para copiar aqui. Selecione o texto e copie."), "warn");
    }
  };
  const whatsapp = () => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");

  /* imagem */
  const corRef = useRef<HTMLDivElement>(null);
  const [imagem, setImagem] = useState<{ url: string; blob: Blob } | null>(null);
  const [gerando, setGerando] = useState(false);
  useEffect(() => () => { if (imagem) URL.revokeObjectURL(imagem.url); }, [imagem]);
  const chave = `${semana.inicio}|${doMural.map((a) => a.id).join()}|${agenda.map((e) => e.id).join()}`;
  const [chaveImagem, setChaveImagem] = useState("");
  if (imagem && chaveImagem !== chave) { setImagem(null); }
  const gerar = async () => {
    if (!corRef.current) return;
    setGerando(true);
    const blob = await desenharBoletim(corRef.current, { igreja: church.nome, semana, agenda, avisos: doMural });
    setGerando(false);
    if (!blob) { avisar(traduzirUi("Não deu para gerar a imagem neste navegador."), "warn"); return; }
    setChaveImagem(chave);
    setImagem({ url: URL.createObjectURL(blob), blob });
  };
  const nomeArquivo = `boletim-${semana.inicio}.png`;
  const compartilhar = async () => {
    if (!imagem) return;
    const file = new File([imagem.blob], nomeArquivo, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return; } catch { /* cancelou: tudo bem */ return; }
    }
    const a = document.createElement("a");
    a.href = imagem.url;
    a.download = nomeArquivo;
    a.click();
  };

  const opcao = (k: keyof Incluir, rotulo: string, n: number) => (
    <Opcao marcada={incluir[k]} estilo="seg-chip" aria-pressed={incluir[k]} onClick={() => setIncluir((i) => ({ ...i, [k]: !i[k] }))}>
      {`${rotulo} · ${n}`}
    </Opcao>
  );

  return (
    <FormScreen
      eyebrow={traduzirUi("Mural")}
      title={traduzirUi("Boletim da semana")}
      subtitle={traduzirUi("Agenda e avisos da semana num texto só, pronto para o grupo da igreja. Edite o que quiser antes de mandar.")}
      saveLabel={traduzirUi("Abrir no WhatsApp")}
      secondary={{ label: traduzirUi("Copiar texto"), onClick: () => void copiar(), disabled: !texto.trim() }}
      missing={texto.trim() ? [] : [traduzirUi("o texto")]}
      dirty={editado}
      onSave={whatsapp}
      onClose={onClose}
    >
      <div ref={corRef} className="bol">
        <FormSection title={traduzirUi("Semana")}>
          <div className="field">
            <div className="fs-chips" role="group" aria-label={traduzirUi("Qual semana")}>
              {([["esta", traduzirUi("Esta semana")], ["proxima", traduzirUi("Próxima semana")], ["outra", traduzirUi("Outra semana")]] as const).map(([k, l]) => (
                <Opcao key={k} marcada={qual === k} estilo="seg-chip" aria-pressed={qual === k} onClick={() => setQual(k)}>{l}</Opcao>
              ))}
            </div>
            {qual === "outra" && (
              <div style={{ marginTop: 8 }}>
                <Campo rotulo={traduzirUi("Um dia da semana")} id={`${fid}-dia`}>
                  <SeletorData valor={outroDia} aoMudar={setOutroDia} />
                </Campo>
              </div>
            )}
            <div className="field-hint">{traduzirUi("De segunda a domingo: {semana}.", { semana: rotuloSemana(semana) })}</div>
          </div>
          <div className="field">
            <div className="field-label" id={`${fid}-inc`}>{traduzirUi("O que entra")}</div>
            <div className="fs-chips" role="group" aria-labelledby={`${fid}-inc`}>
              {opcao("agenda", traduzirUi("Agenda"), agenda.length)}
              {opcao("avisos", traduzirUi("Avisos"), doMural.length)}
              {opcao("escala", traduzirUi("Escala"), escala.length)}
            </div>
            <div className="field-hint">{traduzirUi("Avisos são os publicados para todos nos últimos 7 dias ou em destaque. A escala mostra quem confirmou ou ainda não respondeu.")}</div>
          </div>
        </FormSection>

        <FormSection title={traduzirUi("Texto")}>
          {vazio && <p className="bol-vazio">{traduzirUi("Nada na agenda nem no Mural para {semana}. Escreva o texto abaixo ou escolha outra semana.", { semana: rotuloSemana(semana) })}</p>}
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-txt`}>{traduzirUi("Mensagem")}</label>
            <textarea id={`${fid}-txt`} className="textarea bol-txt" value={texto} onChange={(e) => setTextoEditado(e.target.value)} spellCheck />
            <div className="field-hint">{traduzirUi("Entre *asteriscos* o WhatsApp mostra em negrito.")}</div>
            {desatualizado && (
              <div className="bol-refazer">
                <span>{traduzirUi("Você editou o texto. As escolhas acima não mudam mais o que está escrito.")}</span>
                <Botao compacto onClick={() => setTextoEditado(null)}>{traduzirUi("Montar de novo")}</Botao>
              </div>
            )}
          </div>
        </FormSection>

        <FormSection title={traduzirUi("Imagem para status e story")}>
          <div className="field">
            <div className="field-hint" style={{ marginTop: 0 }}>{traduzirUi("Agenda e títulos dos avisos, nas cores da igreja. O texto editado acima não entra na imagem.")}</div>
            <div className="bol-img-acts">
              <Botao compacto onClick={() => void gerar()} desativado={gerando || vazio}>
                <Icon name="imagem" size={14} /> {gerando ? traduzirUi("Gerando…") : imagem ? traduzirUi("Gerar de novo") : traduzirUi("Gerar imagem")}
              </Botao>
              {imagem && <Botao compacto onClick={() => void compartilhar()}><Icon name="baixar" size={14} /> {traduzirUi("Salvar imagem")}</Botao>}
            </div>
            {imagem && (
              // eslint-disable-next-line @next/next/no-img-element -- imagem gerada no navegador (blob:), sem otimização do Next
              <img className="bol-img" src={imagem.url} alt={traduzirUi("Boletim da semana de {semana}: {eventos, plural, =1 {# evento} other {# eventos}} e {avisos, plural, =1 {# aviso} other {# avisos}}.", { semana: rotuloSemana(semana), eventos: agenda.length, avisos: doMural.length })} />
            )}
          </div>
        </FormSection>
      </div>
    </FormScreen>
  );
}
