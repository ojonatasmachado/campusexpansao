"use client";

/* Lista de cuidado no "Para resolver" do painel (v7 4.17). Cada pessoa vira um
   cartão com "Registrar contato" (ligação, mensagem ou visita, que vai para a
   história como fato) e "Registrar justificativa" (sai da lista por 30 dias).
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

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { Linha } from "../../ui/Linha";
import { Segmentado } from "../../ui/Segmentado";
const QUEM = { grupo: "líder do grupo", time: "líder do time", pastoral: "pastoral" } as const;
const NOME_VIA: Record<string, string> = { ligacao: "ligação", mensagem: "mensagem", visita: "visita" };

export type CriancaAusente = { id: string; nome: string; ultima: string; semanas: number };

export function ListaDeCuidado({ lista, criancas, semanas, onAbrir, podeAbrirPessoa = () => true }: {
  lista: Ausente[];
  criancas: CriancaAusente[] | null;
  semanas: number;
  onAbrir: (a: Ausente) => void;
  podeAbrirPessoa?: (a: Ausente) => boolean;
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
    <Cartao className="cuidado">
      <div className="panel-head">
        <span className="panel-title"><Icon name="coracao" size={14} /> Lista de cuidado</span>
        <span className="panel-meta">{`sem registro há ${plural(semanas, "semana")} ou mais`}</span>
      </div>
      <p className="cuidado-contexto">Esta lista usa presenças registradas no Service. Falta de registro não confirma ausência. Confira com quem acompanha a pessoa antes de concluir.</p>
      {criancas && (
        <div className="cuidado-seg">
          <Segmentado className="seg-sm" role="radiogroup" aria-label="Quem ver">
            <Opcao role="radio" aria-checked={visao === "adultos"} marcada={visao === "adultos"} onClick={() => setVisao("adultos")}>{`Pessoas · ${lista.length}`}</Opcao>
            <Opcao role="radio" aria-checked={visao === "criancas"} marcada={visao === "criancas"} onClick={() => setVisao("criancas")}>{`Crianças · ${criancas.length}`}</Opcao>
          </Segmentado>
        </div>
      )}
      <div className="panel-body flush">
        {visao === "adultos" ? (
          <>
            {lista.length === 0 && <Linha><div className="mini-main"><div className="mini-title">Ninguém na lista</div><div className="mini-sub">Nenhuma pessoa atende aos critérios com os registros disponíveis.</div></div></Linha>}
            {lista.slice(0, 8).map((a) => (
              <div className="cuidado-item" key={a.personId}>
                {podeAbrirPessoa(a) ? <Acao className="cuidado-nome" onClick={() => onAbrir(a)}>
                  <span className="mini-title">{`${a.nome} · sem registro há ${plural(a.semanas, "semana")}`}</span>
                  <span className="mini-sub">{joinDot(`Último registro em ${formatDateBR(a.ultima)}`, `cuida: ${QUEM[a.quemCuida]}`, a.contato && `contato por ${NOME_VIA[a.contato.via] ?? a.contato.via} em ${formatDateBR(a.contato.dia)}`)}</span>
                </Acao> : <div><div className="mini-title">{`${a.nome} · sem registro há ${plural(a.semanas, "semana")}`}</div>
                  <div className="mini-sub">{joinDot(`Último registro em ${formatDateBR(a.ultima)}`, `cuida: ${QUEM[a.quemCuida]}`, a.contato && `contato por ${NOME_VIA[a.contato.via] ?? a.contato.via} em ${formatDateBR(a.contato.dia)}`)}</div></div>}
                {escolhendo === a.personId ? (
                  <div className="cuidado-acoes" role="group" aria-label="Como foi o contato">
                    {VIAS.map((v) => <Botao key={v.v} compacto desativado={enviando === a.personId} onClick={() => registrar(a, "contato", v.v)}>{v.l}</Botao>)}
                    <Botao variante="discreto" compacto onClick={() => setEscolhendo(null)}>Cancelar</Botao>
                  </div>
                ) : (
                  <div className="cuidado-acoes">
                    <Botao compacto desativado={enviando === a.personId} onClick={() => setEscolhendo(a.personId)}>Registrar contato</Botao>
                    <Botao variante="discreto" compacto desativado={enviando === a.personId} onClick={() => registrar(a, "justificada")}>Justificar por 30 dias</Botao>
                  </div>
                )}
              </div>
            ))}
            {lista.length > 8 && <Linha><div className="mini-main"><div className="mini-sub">{`E mais ${plural(lista.length - 8, "pessoa")}. A lista inteira está na Saúde da igreja.`}</div></div></Linha>}
          </>
        ) : (
          <>
            {criancas?.length === 0 && <Linha><div className="mini-main"><div className="mini-title">Nenhuma criança na lista</div><div className="mini-sub">Nenhuma criança atende aos critérios com os registros disponíveis.</div></div></Linha>}
            {criancas?.slice(0, 8).map((c) => (
              <Linha key={c.id}>
                <div className="mini-main">
                  <div className="mini-title">{`${c.nome} · sem check-in há ${plural(c.semanas, "semana")}`}</div>
                  <div className="mini-sub">{`Último check-in em ${formatDateBR(c.ultima)}. Confirme com a família se houve falha no registro.`}</div>
                </div>
              </Linha>
            ))}
          </>
        )}
      </div>
    </Cartao>
  );
}
