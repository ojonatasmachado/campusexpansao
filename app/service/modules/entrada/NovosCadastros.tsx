"use client";

/* Revisão dos pedidos de conta na Gaveta do Início, só para a gestão.
   A carga vem do hook do Início, sem nova consulta ao abrir a folha.
   Aprovar mantém a busca de ficha existente para evitar cadastro duplicado. */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useServiceAccess } from "../../AccessContext";
import { avisar } from "../../lib/avisar";
import { formatDateBR, joinDot } from "../../lib/date";
import { plural } from "../../lib/plural";
import { createServiceBrowserClient } from "../../lib/supabase-browser";

import { BotaoIcone, Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Gaveta } from "../../ui/Janela";
import { Linha } from "../../ui/Linha";
import type { EstadoCarga, Ficha, Pedido, PedidosConta } from "./usePedidosConta";
import { Entrada } from "../../ui/Campo";
import { Carregando, ErroEstado, Vazio } from "../../ui/Estados";

function fone(v: string | null): string | null {
  const d = (v ?? "").replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return v || null;
}

const ERRO: Record<string, string> = {
  ja_decidido: "Alguém da gestão já decidiu este pedido.",
  ficha_invalida: "Esta ficha já tem login. Escolha outra ou crie uma nova.",
  nao_pode: "Só a gestão e os pastores aprovam pedidos.",
};

export function NovosCadastros({ dados, aoFechar }: { dados: PedidosConta; aoFechar: () => void }) {
  const router = useRouter();
  const { organizationId } = useServiceAccess();
  const { pedidos, estado, carregar, remover } = dados;
  const [estadoBusca, setEstadoBusca] = useState<EstadoCarga>("pronto");
  const [tentativaBusca, setTentativaBusca] = useState(0);
  const [aberto, setAberto] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [achados, setAchados] = useState<Ficha[]>([]);
  const db = useCallback(() => createServiceBrowserClient().schema("service"), []);

  /* Busca de ficha: só uma resposta bem-sucedida pode dizer que não há resultado. */
  useEffect(() => {
    let ativa = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- busca com espera entre teclas: limpa o resultado anterior e informa a nova carga
    setAchados([]);
    if (!aberto || q.trim().length < 2 || !organizationId) {
      setEstadoBusca("pronto");
      return;
    }
    setEstadoBusca("carregando");
    const falhou = () => { if (ativa) setEstadoBusca("erro"); };
    const t = setTimeout(() => {
      void db().rpc("entrada_buscar_fichas", { p_org: organizationId, p_q: q.trim() }).then(({ data, error }) => {
        if (!ativa) return;
        if (error) { falhou(); return; }
        setAchados((data ?? []) as Ficha[]);
        setEstadoBusca("pronto");
      }, falhou);
    }, 250);
    return () => { ativa = false; clearTimeout(t); };
  }, [q, aberto, organizationId, db, tentativaBusca]);

  const abrir = (id: string | null) => { setAberto(id); setRecusando(null); setQ(""); setAchados([]); };

  const aprovar = async (p: Pedido, ficha: Ficha | null) => {
    setEnviando(p.id);
    const { data, error } = await db().rpc("entrada_aprovar", { p_req: p.id, p_member: ficha?.id ?? null });
    setEnviando(null);
    if (error || data !== "ok") {
      avisar(ERRO[data as string] ?? "Não conseguimos aprovar agora. Tente de novo.", "warn");
      if (data === "ja_decidido") carregar();
      return;
    }
    avisar(ficha ? `${p.name} ligado à ficha de ${ficha.name}` : `${p.name} já pode entrar no app`, "ok");
    abrir(null);
    remover(p.id);
    router.refresh();
  };

  const recusar = async (p: Pedido) => {
    setEnviando(p.id);
    const { data, error } = await db().rpc("entrada_recusar", { p_req: p.id });
    setEnviando(null);
    if (error || (data !== "ok" && data !== "ja_decidido")) return avisar("Não conseguimos recusar agora. Tente de novo.", "warn");
    avisar("Pedido recusado", "ok");
    setRecusando(null);
    remover(p.id);
  };

  const opcaoFicha = (p: Pedido, f: Ficha) => (
    <Acao key={f.id} className="entrada-ficha" desativado={enviando === p.id} onClick={() => aprovar(p, f)}>
      <span className="mini-title">{`Ligar a ${f.name}`}</span>
      <span className="mini-sub">{joinDot(fone(f.phone), f.email) || "Ficha sem telefone e e-mail"}</span>
    </Acao>
  );

  return (
    <Gaveta larga rotulo="Pedidos de conta" aoFechar={() => { if (!enviando) aoFechar(); }}>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo="Fechar" desativado={!!enviando} onClick={aoFechar}>✕</BotaoIcone>
        <h2 className="profile-name">Pedidos de conta</h2>
      </div>
      <div className="drawer-body">
        {estado === "carregando" && <Carregando forma="linhas" quantos={1} rotulo="Carregando pedidos de conta" />}
        {estado === "erro" && <ErroEstado titulo="Não conseguimos carregar os pedidos de conta" tentar={carregar} />}
        {estado === "pronto" && pedidos.length === 0 && <Vazio titulo="Nenhum pedido pendente" texto="Todos os pedidos foram revisados." />}
        {estado === "pronto" && pedidos.map((p) => (
          <Linha estilo="config" className="cuidado-item" key={p.id}>
            <div className="cuidado-nome" style={{ cursor: "default" }}>
              <span className="mini-title">{p.name}</span>
              <span className="mini-sub">{joinDot(fone(p.phone), p.email, `pediu em ${formatDateBR(p.created_at.slice(0, 10))}`)}</span>
              {p.parecidos.length > 0 && aberto !== p.id && (
                <span className="mini-sub entrada-aviso">{p.parecidos.length === 1 ? `Parecido com ${p.parecidos[0].name}, já cadastrado` : `Parecido com ${plural(p.parecidos.length, "ficha", "fichas")} já cadastradas`}</span>
              )}
            </div>
            {recusando === p.id ? (
              <div className="cuidado-acoes" role="group" aria-label="Confirmar recusa">
                <Botao variante="discreto" compacto desativado={enviando === p.id} onClick={() => setRecusando(null)}>Voltar</Botao>
                <Botao compacto desativado={enviando === p.id} onClick={() => recusar(p)}>Recusar pedido</Botao>
              </div>
            ) : aberto === p.id ? (
              <div className="cuidado-acoes">
                <Botao variante="discreto" compacto desativado={enviando === p.id} onClick={() => abrir(null)}>Cancelar</Botao>
              </div>
            ) : (
              <div className="cuidado-acoes">
                <Botao compacto desativado={enviando === p.id} onClick={() => abrir(p.id)}>Aprovar</Botao>
                <Botao variante="discreto" compacto desativado={enviando === p.id} onClick={() => { abrir(null); setRecusando(p.id); }}>Recusar</Botao>
              </div>
            )}
            {aberto === p.id && (
              <div className="entrada-escolha">
                <div className="cfg-row-t">Esta pessoa já tem ficha na igreja?</div>
                <div className="cfg-row-s">Ligar à ficha que já existe evita cadastro duplicado. A ficha precisa estar sem login.</div>
                {p.parecidos.length > 0 && <div className="entrada-fichas">{p.parecidos.map((f) => opcaoFicha(p, f))}</div>}
                <Entrada
                  className="input entrada-busca"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Procurar outra ficha pelo nome"
                  aria-label="Procurar ficha pelo nome"
                />
                {estadoBusca === "carregando" && <Carregando forma="linhas" quantos={1} rotulo="Procurando fichas" />}
                {estadoBusca === "erro" && <ErroEstado titulo="Não conseguimos procurar as fichas" tentar={() => setTentativaBusca((n) => n + 1)} />}
                {estadoBusca === "pronto" && achados.length > 0 && <div className="entrada-fichas">{achados.filter((f) => !p.parecidos.some((x) => x.id === f.id)).map((f) => opcaoFicha(p, f))}</div>}
                {estadoBusca === "pronto" && q.trim().length >= 2 && achados.length === 0 && <div className="cfg-row-s">Nenhuma ficha sem login com esse nome.</div>}
                <div className="entrada-acoes">
                  <Botao compacto desativado={enviando === p.id || (q.trim().length >= 2 && estadoBusca !== "pronto")} onClick={() => aprovar(p, null)}>
                    {enviando === p.id ? "Aprovando..." : "Não tem: criar ficha nova"}
                  </Botao>
                </div>
              </div>
            )}
          </Linha>
        ))}
      </div>
    </Gaveta>
  );
}
