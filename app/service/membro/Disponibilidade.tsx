"use client";

import { useContext, useRef, useState, type FormEvent } from "react";
import { avisar } from "../lib/avisar";
import { useRelogioDaIgreja } from "../lib/relogio-context";
import { useServiceLocale } from "../lib/internacional/contexto";
import { ausenciaPorExtenso, ausenciasFuturas, chavesAusencia, PERIODOS_AUSENCIA, type PeriodoAusencia } from "../modules/escalas/disponibilidade";
import { Botao } from "../ui/Botao";
import { Campo } from "../ui/Campo";
import { SeletorData } from "../ui/Data";
import { Interruptor } from "../ui/Interruptor";
import { Linha, Lista } from "../ui/Linha";
import { Selecao } from "../ui/Selecao";
import { MemberUiContext } from "./comum";
import type { Ministry, P } from "./tipos";

type Availability = Record<string, boolean>;
type Alterar = (fn: (atual: Availability) => Availability) => Promise<boolean>;
const HORARIOS = [
  { key: "dom_m", nome: "Domingo de manhã" },
  { key: "dom_n", nome: "Domingo à noite" },
  { key: "qua", nome: "Quarta à noite" },
];

/* Uma única cópia do mapa: alternar horário não apaga ausências nem chaves antigas.
   O Desfazer muda só as chaves da operação, preservando edições posteriores. */
export function Disponibilidade({ person, times, onSave, onAvisar, onFalar }: {
  person: P;
  times: Ministry[];
  onSave: (a: Availability) => Promise<boolean>;
  onAvisar?: (mensagem: string) => Promise<boolean>;
  onFalar?: () => Promise<void>;
}) {
  const ui = useContext(MemberUiContext);
  const { todayISO } = useRelogioDaIgreja();
  const locale = useServiceLocale();
  const [disp, setDisp] = useState(person.availability ?? {});
  const atual = useRef(disp);
  const ocupado = useRef(false);
  const [salvando, setSalvando] = useState(false);
  const alterar: Alterar = async (fn) => {
    if (ocupado.current) return false;
    ocupado.current = true;
    setSalvando(true);
    try {
      const novo = fn({ ...atual.current });
      if (!await onSave(novo)) return false;
      atual.current = novo;
      setDisp(novo);
      return true;
    } catch {
      avisar("Não conseguimos salvar agora. Tente de novo.", "warn");
      return false;
    } finally {
      ocupado.current = false;
      setSalvando(false);
    }
  };
  const futuras = ausenciasFuturas(disp, todayISO());
  const remover = async (chave: string) => {
    if (!await alterar((a) => { delete a[chave]; return a; })) return;
    avisar("Ausência removida", "ok", {
      chave: "ausencia",
      acao: { rotulo: "Desfazer", fn: async () => {
        if (await alterar((a) => ({ ...a, [chave]: false }))) avisar("Ausência restaurada");
      } },
    });
  };
  const abrir = () => ui.sheet(
    <SheetAusencia hoje={todayISO()} times={times} locale={locale} alterar={alterar}
      lerAtual={() => atual.current} onAvisar={onAvisar!} onFalar={onFalar!} aoFechar={() => ui.sheet(null)} />,
  );
  return (
    <>
      <Lista>
        {HORARIOS.map((d) => (
          <Linha estilo="app" key={d.key}>
            <span className="m6-rb">
              <span className="m6-rt">{d.nome}</span>
              <span className="m6-rs">{disp[d.key] !== false ? "O líder pode escalar você" : "O líder não vai escalar você"}</span>
            </span>
            <Interruptor ligado={disp[d.key] !== false} tamanho="toque" rotulo={d.nome} desativado={salvando}
              onClick={() => alterar((a) => ({ ...a, [d.key]: a[d.key] === false }))} />
          </Linha>
        ))}
        {futuras.map((a) => (
          <Linha estilo="app" key={a.chave} data-ausencia={a.chave}>
            <span className="m6-rb">
              <span className="m6-rt">Ausência</span>
              <span className="m6-rs">{ausenciaPorExtenso(a.data, "", a.periodo, a.timeId ? times.find((t) => t.id === a.timeId)?.name ?? "Time removido" : null, locale)}</span>
            </span>
            <Botao tamanho="toque" variante="texto" desativado={salvando} onClick={() => remover(a.chave)}>Remover</Botao>
          </Linha>
        ))}
      </Lista>
      {onAvisar && onFalar ? <div className="m6-pad"><Botao tamanho="toque" largo onClick={abrir}>Avisar que vou faltar</Botao></div> : null}
    </>
  );
}

function SheetAusencia({ hoje, times, locale, alterar, lerAtual, onAvisar, onFalar, aoFechar }: {
  hoje: string;
  times: Ministry[];
  locale: string;
  alterar: Alterar;
  lerAtual: () => Availability;
  onAvisar: (mensagem: string) => Promise<boolean>;
  onFalar: () => Promise<void>;
  aoFechar: () => void;
}) {
  const [de, setDe] = useState(hoje);
  const [ate, setAte] = useState("");
  const [periodo, setPeriodo] = useState<PeriodoAusencia>("dia");
  const [timeId, setTimeId] = useState("");
  const [erro, setErro] = useState("");
  const [erroDatas, setErroDatas] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [falando, setFalando] = useState(false);
  const time = times.find((t) => t.id === timeId)?.name ?? null;
  const enviar = async (event: FormEvent) => {
    event.preventDefault();
    if (salvando) return;
    let chaves: string[];
    try {
      chaves = chavesAusencia(de, ate, periodo, timeId || null);
      if (de < hoje) throw new Error("Escolha hoje ou uma data futura.");
    } catch (error) {
      setErroDatas(error instanceof Error ? error.message : "Confira as datas.");
      return;
    }
    setErro("");
    setErroDatas("");
    setSalvando(true);
    const anteriores = Object.fromEntries(chaves.map((key) => [key, lerAtual()[key]]));
    const salvo = await alterar((a) => ({ ...a, ...Object.fromEntries(chaves.map((key) => [key, false])) }));
    if (!salvo) {
      setSalvando(false);
      setErro("Não conseguimos salvar. Confira sua conexão e tente de novo.");
      return;
    }
    const descricao = ausenciaPorExtenso(de, ate, periodo, time, locale);
    let avisado = false;
    try { avisado = await onAvisar(`Oi! Vou faltar ${descricao}.`); } catch { /* ausência salva; informa falha da mensagem */ }
    aoFechar();
    avisar(avisado ? "Ausência avisada" : "Ausência salva. Não conseguimos avisar o líder. Use Falar com o líder.", avisado ? "ok" : "warn", {
      chave: "ausencia",
      acao: { rotulo: "Desfazer", fn: async () => {
        const desfeito = await alterar((a) => {
          for (const key of chaves) {
            if (anteriores[key] === undefined) delete a[key];
            else a[key] = anteriores[key];
          }
          return a;
        });
        if (!desfeito) return;
        avisar("Ausência desfeita");
        if (avisado) {
          try {
            if (!await onAvisar(`Retirei o aviso de ausência ${descricao}.`)) avisar("Ausência desfeita. Avise o líder pela conversa.", "warn");
          } catch { avisar("Ausência desfeita. Avise o líder pela conversa.", "warn"); }
        }
      } },
    });
  };
  return (
    <form onSubmit={enviar}>
      <h2 className="m6-sh">Avisar que vou faltar</h2>
      <div>
        <Campo rotulo="Data"><SeletorData valor={de} aoMudar={(v) => { setDe(v); setErroDatas(""); }} min={hoje} rotulo="Data" desativado={salvando} /></Campo>
        <Campo rotulo="Até (opcional)" erro={erroDatas}><SeletorData valor={ate} aoMudar={(v) => { setAte(v); setErroDatas(""); }} min={de || hoje} rotulo="Até" limpavel desativado={salvando} /></Campo>
      </div>
      <Campo rotulo="Período"><Selecao valor={periodo} aoMudar={(v) => setPeriodo(v as PeriodoAusencia)} opcoes={PERIODOS_AUSENCIA} rotulo="Período" desativado={salvando} /></Campo>
      {times.length > 1 ? <Campo rotulo="Time"><Selecao valor={timeId} aoMudar={setTimeId} rotulo="Time" desativado={salvando}
        opcoes={[{ v: "", l: "Todos os times" }, ...times.map((t) => ({ v: t.id, l: t.name }))]} /></Campo> : null}
      {erro ? <p className="field-error" role="alert">{erro}</p> : null}
      <Botao tamanho="toque" variante="principal" largo type="submit" desativado={salvando || falando}>{salvando ? "Avisando..." : "Avisar ausência"}</Botao>
      <Botao tamanho="toque" variante="texto" desativado={salvando || falando} onClick={async () => {
        setFalando(true);
        try { await onFalar(); } finally { setFalando(false); }
      }}>{falando ? "Abrindo conversa..." : "Falar com o líder"}</Botao>
    </form>
  );
}
