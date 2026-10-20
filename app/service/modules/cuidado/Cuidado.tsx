"use client";

/* Lista de cuidado no "Para resolver" do painel (v7 4.17). Cada pessoa vira um
   cartão com "Registrar contato" (ligação, mensagem ou visita, que vai para a
   história como fato) e "Ausência justificada" (sai da lista por 30 dias).
   "Crianças" é a mesma regra aplicada ao check-in do Kids (era o bloco
   "Crianças sumindo"). */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { avisar } from "../../lib/avisar";
import { formatDateBR, joinDot } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { VIAS, type Ausente } from "./cuidado";

const QUEM = { grupo: "líder do grupo", time: "líder do time", pastoral: "pastoral" } as const;
const NOME_VIA: Record<string, string> = { ligacao: "ligação", mensagem: "mensagem", visita: "visita" };

export type CriancaAusente = { id: string; nome: string; ultima: string; semanas: number };

export function ListaDeCuidado({ lista, criancas, semanas, onAbrir }: {
  lista: Ausente[];
  criancas: CriancaAusente[] | null;
  semanas: number;
  onAbrir: (a: Ausente) => void;
}) {
  const router = useRouter();
  const [visao, setVisao] = useState<"adultos" | "criancas">("adultos");
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const registrar = async (a: Ausente, kind: "contato" | "justificada", via?: string) => {
    setEnviando(a.personId);
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("registrar_cuidado", { p_person: a.personId, p_kind: kind, p_via: via ?? null });
    setEnviando(null);
    setEscolhendo(null);
    if (error || data !== "ok") { avisar("Não conseguimos registrar agora. Tente de novo.", "warn"); return; }
    avisar(kind === "contato" ? "Contato registrado" : "Fora da lista por 30 dias", "ok");
    router.refresh();
  };
  return (
    <div className="panel cuidado">
      <div className="panel-head">
        <span className="panel-title"><Icon name="coracao" size={14} /> Lista de cuidado</span>
        <span className="panel-meta">{`sem presença há ${plural(semanas, "semana")} ou mais`}</span>
      </div>
      {criancas && (
        <div className="cuidado-seg">
          <div className="seg seg-sm" role="radiogroup" aria-label="Quem ver">
            <button type="button" role="radio" aria-checked={visao === "adultos"} className={visao === "adultos" ? "on" : ""} onClick={() => setVisao("adultos")}>{`Pessoas · ${lista.length}`}</button>
            <button type="button" role="radio" aria-checked={visao === "criancas"} className={visao === "criancas" ? "on" : ""} onClick={() => setVisao("criancas")}>{`Crianças · ${criancas.length}`}</button>
          </div>
        </div>
      )}
      <div className="panel-body flush">
        {visao === "adultos" ? (
          <>
            {lista.length === 0 && <div className="mini-row"><div className="mini-main"><div className="mini-title">Ninguém na lista</div><div className="mini-sub">Todo mundo com presença nas últimas semanas.</div></div></div>}
            {lista.slice(0, 8).map((a) => (
              <div className="cuidado-item" key={a.personId}>
                <button type="button" className="cuidado-nome" onClick={() => onAbrir(a)}>
                  <span className="mini-title">{`${a.nome} · sem presença há ${plural(a.semanas, "semana")}`}</span>
                  <span className="mini-sub">{joinDot(`Última em ${formatDateBR(a.ultima)}`, `cuida: ${QUEM[a.quemCuida]}`, a.contato && `contato por ${NOME_VIA[a.contato.via] ?? a.contato.via} em ${formatDateBR(a.contato.dia)}`)}</span>
                </button>
                {escolhendo === a.personId ? (
                  <div className="cuidado-acoes" role="group" aria-label="Como foi o contato">
                    {VIAS.map((v) => <button key={v.v} type="button" className="btn btn-sec btn-sm" disabled={enviando === a.personId} onClick={() => registrar(a, "contato", v.v)}>{v.l}</button>)}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEscolhendo(null)}>Cancelar</button>
                  </div>
                ) : (
                  <div className="cuidado-acoes">
                    <button type="button" className="btn btn-sec btn-sm" disabled={enviando === a.personId} onClick={() => setEscolhendo(a.personId)}>Registrar contato</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={enviando === a.personId} onClick={() => registrar(a, "justificada")}>Ausência justificada</button>
                  </div>
                )}
              </div>
            ))}
            {lista.length > 8 && <div className="mini-row"><div className="mini-main"><div className="mini-sub">{`E mais ${plural(lista.length - 8, "pessoa")}. A lista inteira está na Saúde da igreja.`}</div></div></div>}
          </>
        ) : (
          <>
            {criancas?.length === 0 && <div className="mini-row"><div className="mini-main"><div className="mini-title">Nenhuma criança na lista</div><div className="mini-sub">Todas com check-in nas últimas semanas.</div></div></div>}
            {criancas?.slice(0, 8).map((c) => (
              <div className="mini-row" key={c.id}>
                <div className="mini-main">
                  <div className="mini-title">{`${c.nome} · sem check-in há ${plural(c.semanas, "semana")}`}</div>
                  <div className="mini-sub">{`Última vez em ${formatDateBR(c.ultima)}. Vale um contato com a família.`}</div>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
