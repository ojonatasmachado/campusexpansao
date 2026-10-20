"use client";

/* Novos cadastros aguardando (migração 0071), no "Para resolver" do Início
   do painel, só para a gestão. Cada pedido mostra quem é e duas ações:
   Aprovar e Recusar. Aprovar pergunta se a pessoa já tem ficha (sugere as
   parecidas por e-mail, telefone ou nome, e deixa procurar outra) para não
   criar cadastro duplicado. Sem pedidos, o bloco não aparece (lei 6). */
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useServiceAccess } from "../../AccessContext";
import { avisar } from "../../lib/avisar";
import { formatDateBR, joinDot } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { createServiceBrowserClient } from "../../lib/supabase-browser";

type Ficha = { id: string; name: string; phone: string | null; email: string | null };
type Pedido = { id: string; name: string; email: string; phone: string | null; created_at: string; parecidos: Ficha[] };

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

export function NovosCadastros() {
  const router = useRouter();
  const { organizationId } = useServiceAccess();
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [aberto, setAberto] = useState<string | null>(null);
  const [recusando, setRecusando] = useState<string | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [achados, setAchados] = useState<Ficha[]>([]);
  const db = useCallback(() => createServiceBrowserClient().schema("service"), []);

  const carregar = useCallback(() => {
    if (!organizationId) return;
    db().rpc("entrada_pedidos", { p_org: organizationId }).then(({ data }) => setPedidos((data ?? []) as Pedido[]));
  }, [organizationId, db]);
  useEffect(carregar, [carregar]);

  /* busca de ficha sem login, com uma pequena espera entre as teclas */
  useEffect(() => {
    if (!aberto || q.trim().length < 2) { setAchados([]); return; }
    const t = setTimeout(() => {
      db().rpc("entrada_buscar_fichas", { p_org: organizationId, p_q: q.trim() }).then(({ data }) => setAchados((data ?? []) as Ficha[]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, aberto, organizationId, db]);

  if (pedidos.length === 0) return null;

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
    setPedidos((l) => l.filter((x) => x.id !== p.id));
    router.refresh();
  };

  const recusar = async (p: Pedido) => {
    setEnviando(p.id);
    const { data, error } = await db().rpc("entrada_recusar", { p_req: p.id });
    setEnviando(null);
    if (error || (data !== "ok" && data !== "ja_decidido")) return avisar("Não conseguimos recusar agora. Tente de novo.", "warn");
    avisar("Pedido recusado", "ok");
    setRecusando(null);
    setPedidos((l) => l.filter((x) => x.id !== p.id));
  };

  const opcaoFicha = (p: Pedido, f: Ficha) => (
    <button key={f.id} type="button" className="entrada-ficha" disabled={enviando === p.id} onClick={() => aprovar(p, f)}>
      <span className="mini-title">{`Ligar a ${f.name}`}</span>
      <span className="mini-sub">{joinDot(fone(f.phone), f.email) || "Ficha sem telefone e e-mail"}</span>
    </button>
  );

  return (
    <div className="panel entrada-fila" id="novos-cadastros">
      <div className="panel-head">
        <span className="panel-title"><Icon name="membros" size={14} /> Novos cadastros</span>
        <span className="panel-meta">{`${plural(pedidos.length, "pedido")} pelo link da igreja`}</span>
      </div>
      <div className="panel-body flush">
        {pedidos.map((p) => (
          <div className="cuidado-item" key={p.id}>
            <div className="cuidado-nome" style={{ cursor: "default" }}>
              <span className="mini-title">{p.name}</span>
              <span className="mini-sub">{joinDot(fone(p.phone), p.email, `pediu em ${formatDateBR(p.created_at.slice(0, 10))}`)}</span>
              {p.parecidos.length > 0 && aberto !== p.id && (
                <span className="mini-sub entrada-aviso">{p.parecidos.length === 1 ? `Parecido com ${p.parecidos[0].name}, já cadastrado` : `Parecido com ${plural(p.parecidos.length, "ficha", "fichas")} já cadastradas`}</span>
              )}
            </div>
            {recusando === p.id ? (
              <div className="cuidado-acoes" role="group" aria-label="Confirmar recusa">
                <button type="button" className="btn btn-ghost btn-sm" disabled={enviando === p.id} onClick={() => setRecusando(null)}>Voltar</button>
                <button type="button" className="btn btn-sec btn-sm" disabled={enviando === p.id} onClick={() => recusar(p)}>Recusar pedido</button>
              </div>
            ) : aberto === p.id ? (
              <div className="cuidado-acoes">
                <button type="button" className="btn btn-ghost btn-sm" disabled={enviando === p.id} onClick={() => abrir(null)}>Cancelar</button>
              </div>
            ) : (
              <div className="cuidado-acoes">
                <button type="button" className="btn btn-sec btn-sm" disabled={enviando === p.id} onClick={() => abrir(p.id)}>Aprovar</button>
                <button type="button" className="btn btn-ghost btn-sm" disabled={enviando === p.id} onClick={() => { abrir(null); setRecusando(p.id); }}>Recusar</button>
              </div>
            )}
            {aberto === p.id && (
              <div className="entrada-escolha">
                <div className="cfg-row-t">Esta pessoa já tem ficha na igreja?</div>
                <div className="cfg-row-s">Ligar à ficha que já existe evita cadastro duplicado. A ficha precisa estar sem login.</div>
                {p.parecidos.length > 0 && <div className="entrada-fichas">{p.parecidos.map((f) => opcaoFicha(p, f))}</div>}
                <input
                  className="input entrada-busca"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Procurar outra ficha pelo nome"
                  aria-label="Procurar ficha pelo nome"
                />
                {achados.length > 0 && <div className="entrada-fichas">{achados.filter((f) => !p.parecidos.some((x) => x.id === f.id)).map((f) => opcaoFicha(p, f))}</div>}
                {q.trim().length >= 2 && achados.length === 0 && <div className="cfg-row-s">Nenhuma ficha sem login com esse nome.</div>}
                <div className="entrada-acoes">
                  <button type="button" className="btn btn-sec btn-sm" disabled={enviando === p.id} onClick={() => aprovar(p, null)}>
                    {enviando === p.id ? "Aprovando..." : "Não tem: criar ficha nova"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
