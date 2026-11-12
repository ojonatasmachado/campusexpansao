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
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { VIAS, type Ausente } from "./cuidado";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { Linha } from "../../ui/Linha";
import { Segmentado } from "../../ui/Segmentado";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";
const quemDe = (traduzirUi: Text) => ({ grupo: traduzirUi("líder do grupo"), time: traduzirUi("líder do time"), pastoral: traduzirUi("pastoral") });
const nomeViaDe = (traduzirUi: Text): Record<string, string> => ({ ligacao: traduzirUi("ligação"), mensagem: traduzirUi("mensagem"), visita: traduzirUi("visita") });

export type CriancaAusente = { id: string; nome: string; ultima: string; semanas: number };

export function ListaDeCuidado({ lista, criancas, semanas, onAbrir, podeAbrirPessoa = () => true, visaoInicial = "adultos" }: {
  lista: Ausente[];
  criancas: CriancaAusente[] | null;
  semanas: number;
  onAbrir: (a: Ausente) => void;
  podeAbrirPessoa?: (a: Ausente) => boolean;
  visaoInicial?: "adultos" | "criancas";
}) {
  const traduzirUi = useTexto();
  const QUEM = quemDe(traduzirUi);
  const NOME_VIA = nomeViaDe(traduzirUi);
  const router = useRouter();
  const [visao, setVisao] = useState<"adultos" | "criancas">(visaoInicial);
  const [escolhendo, setEscolhendo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const registrar = async (a: Ausente, kind: "contato" | "justificada", via?: string) => {
    setEnviando(a.personId);
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("registrar_cuidado", { p_person: a.personId, p_kind: kind, p_via: via ?? null });
    setEnviando(null);
    setEscolhendo(null);
    if (error || data !== "ok") { avisar(traduzirUi("Não conseguimos registrar agora. Tente de novo."), "warn"); return; }
    avisar(kind === "contato" ? traduzirUi("Contato registrado") : traduzirUi("Fora da lista por 30 dias"), "ok");
    router.refresh();
  };
  return (
    <Cartao className="cuidado">
      <div className="panel-head">
        <span className="panel-title"><Icon name="coracao" size={14} /> {traduzirUi("Lista de cuidado")}</span>
        <span className="panel-meta">{traduzirUi("sem registro há {count, plural, =1 {# semana} other {# semanas}} ou mais", { count: semanas })}</span>
      </div>
      <p className="cuidado-contexto">{traduzirUi("Esta lista usa presenças registradas no Service. Falta de registro não confirma ausência. Confira com quem acompanha a pessoa antes de concluir.")}</p>
      {criancas && (
        <div className="cuidado-seg">
          <Segmentado className="seg-sm" role="radiogroup" aria-label={traduzirUi("Quem ver")}>
            <Opcao role="radio" aria-checked={visao === "adultos"} marcada={visao === "adultos"} onClick={() => setVisao("adultos")}>{traduzirUi("Pessoas · {n}", { n: String(lista.length) })}</Opcao>
            <Opcao role="radio" aria-checked={visao === "criancas"} marcada={visao === "criancas"} onClick={() => setVisao("criancas")}>{traduzirUi("Crianças · {n}", { n: String(criancas.length) })}</Opcao>
          </Segmentado>
        </div>
      )}
      <div className="panel-body flush">
        {visao === "adultos" ? (
          <>
            {lista.length === 0 && <Linha><div className="mini-main"><div className="mini-title">{traduzirUi("Ninguém na lista")}</div><div className="mini-sub">{traduzirUi("Nenhuma pessoa atende aos critérios com os registros disponíveis.")}</div></div></Linha>}
            {lista.slice(0, 8).map((a) => (
              <div className="cuidado-item" key={a.personId}>
                {podeAbrirPessoa(a) ? <Acao className="cuidado-nome" onClick={() => onAbrir(a)}>
                  <span className="mini-title">{traduzirUi("{nome} · sem registro há {count, plural, =1 {# semana} other {# semanas}}", { nome: a.nome, count: a.semanas })}</span>
                  <span className="mini-sub">{joinDot(traduzirUi("Último registro em {data}", { data: formatDateBR(a.ultima) }), traduzirUi("cuida: {quem}", { quem: QUEM[a.quemCuida] }), a.contato && traduzirUi("contato por {via} em {data}", { via: NOME_VIA[a.contato.via] ?? a.contato.via, data: formatDateBR(a.contato.dia) }))}</span>
                </Acao> : <div><div className="mini-title">{traduzirUi("{nome} · sem registro há {count, plural, =1 {# semana} other {# semanas}}", { nome: a.nome, count: a.semanas })}</div>
                  <div className="mini-sub">{joinDot(traduzirUi("Último registro em {data}", { data: formatDateBR(a.ultima) }), traduzirUi("cuida: {quem}", { quem: QUEM[a.quemCuida] }), a.contato && traduzirUi("contato por {via} em {data}", { via: NOME_VIA[a.contato.via] ?? a.contato.via, data: formatDateBR(a.contato.dia) }))}</div></div>}
                {escolhendo === a.personId ? (
                  <div className="cuidado-acoes" role="group" aria-label={traduzirUi("Como foi o contato")}>
                    {VIAS.map((v) => <Botao key={v.v} compacto desativado={enviando === a.personId} onClick={() => registrar(a, "contato", v.v)}>{v.l}</Botao>)}
                    <Botao variante="discreto" compacto onClick={() => setEscolhendo(null)}>{traduzirUi("Cancelar")}</Botao>
                  </div>
                ) : (
                  <div className="cuidado-acoes">
                    <Botao compacto desativado={enviando === a.personId} onClick={() => setEscolhendo(a.personId)}>{traduzirUi("Registrar contato")}</Botao>
                    <Botao variante="discreto" compacto desativado={enviando === a.personId} onClick={() => registrar(a, "justificada")}>{traduzirUi("Justificar por 30 dias")}</Botao>
                  </div>
                )}
              </div>
            ))}
            {lista.length > 8 && <Linha><div className="mini-main"><div className="mini-sub">{traduzirUi("E mais {count, plural, =1 {# pessoa} other {# pessoas}}. A lista inteira está na Saúde da igreja.", { count: lista.length - 8 })}</div></div></Linha>}
          </>
        ) : (
          <>
            {criancas?.length === 0 && <Linha><div className="mini-main"><div className="mini-title">{traduzirUi("Nenhuma criança na lista")}</div><div className="mini-sub">{traduzirUi("Nenhuma criança atende aos critérios com os registros disponíveis.")}</div></div></Linha>}
            {criancas?.slice(0, 8).map((c) => (
              <Linha key={c.id}>
                <div className="mini-main">
                  <div className="mini-title">{traduzirUi("{nome} · sem check-in há {count, plural, =1 {# semana} other {# semanas}}", { nome: c.nome, count: c.semanas })}</div>
                  <div className="mini-sub">{traduzirUi("Último check-in em {data}. Confirme com a família se houve falha no registro.", { data: formatDateBR(c.ultima) })}</div>
                </div>
              </Linha>
            ))}
          </>
        )}
      </div>
    </Cartao>
  );
}
