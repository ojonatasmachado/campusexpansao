"use client";

/* Painel do Mural de oração (Comunicação › Oração): quem cuida da
   intercessão vê todos os pedidos, inclusive os só da intercessão e o nome
   de quem pediu em anônimo, e modera (ocultar do mural, arquivar). A lista
   vem de service.prayer_admin_list; sem permissão, vem vazia (0076). */

import { useMemo, useState } from "react";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { joinDot } from "../../lib/date";
import { EmptyState, PageHead } from "../../painel/ui";
import { CATEGORIAS, moderar, rotuloCategoria, usePedidosPainel, type Categoria, type Moderacao, type PedidoPainel } from "./oracao";

import { Botao } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { Selo } from "../../ui/Selo";
type Filtro = "ativos" | "mural" | "intercessao" | "respondidos" | "ocultos" | "arquivados";
const FILTROS: { id: Filtro; rotulo: string; vale: (p: PedidoPainel) => boolean }[] = [
  { id: "ativos", rotulo: "Ativos", vale: (p) => p.moderation === "ativo" && !p.answered_at },
  { id: "mural", rotulo: "No mural", vale: (p) => p.moderation === "ativo" && p.audience === "mural" },
  { id: "intercessao", rotulo: "Só a intercessão", vale: (p) => p.moderation !== "arquivado" && p.audience === "intercessao" },
  { id: "respondidos", rotulo: "Respondidos", vale: (p) => p.moderation !== "arquivado" && !!p.answered_at },
  { id: "ocultos", rotulo: "Ocultos", vale: (p) => p.moderation === "oculto" },
  { id: "arquivados", rotulo: "Arquivados", vale: (p) => p.moderation === "arquivado" },
];

export function OracaoPainel({ organizationId, churches = [] }: { organizationId?: string; churches?: { id: string; nome: string }[] }) {
  const { dataPublicacao, quandoPublicado } = useRelogioDaIgreja();
  const { dados, erro, recarregar } = usePedidosPainel(organizationId);
  const [filtro, setFiltro] = useState<Filtro>("ativos");
  const [categoria, setCategoria] = useState<Categoria | "">("");
  const [q, setQ] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const lista = useMemo(() => dados ?? [], [dados]);
  const vale = FILTROS.find((f) => f.id === filtro)!.vale;
  const busca = q.trim().toLowerCase();
  const visiveis = lista.filter((p) => vale(p) && (!categoria || p.category === categoria)
    && (!busca || p.body.toLowerCase().includes(busca) || (p.author ?? "").toLowerCase().includes(busca)));
  const ativos = lista.filter(FILTROS[0].vale).length;
  const nomeIgreja = (id: string) => (churches.length > 1 ? churches.find((c) => c.id === id)?.nome : undefined);

  const mudar = async (p: PedidoPainel, estado: Moderacao, msg: string) => {
    setOcupado(p.id);
    const ok = await moderar(organizationId, p.id, estado);
    setOcupado(null);
    if (!ok) { avisar("Não foi possível salvar agora. Tente de novo.", "warn"); return; }
    await recarregar();
    avisar(msg);
  };

  return (
    <div className="content wide">
      <PageHead
        title="Pedidos de oração"
        eyebrow="Comunicação"
        subtitle={dados ? plural(ativos, "pedido ativo", "pedidos ativos") : undefined}
        help="Os pedidos que a igreja faz pelo app. Os do mural todos veem; os só da intercessão chegam também como conversa. Aqui aparece o nome de quem pediu em anônimo: guarde com cuidado. Ocultar tira do mural e quem pediu continua vendo; arquivar guarda fora da lista."
      />

      <div className="toolbar">
        <div className="tb-search"><span className="si"><Icon name="buscar" size={13} /></span><input placeholder="Buscar no pedido ou no nome..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar pedidos" /></div>
        <select className="select or-sel" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria | "")} aria-label="Categoria">
          <option value="">Todas as categorias</option>
          {CATEGORIAS.map((c) => <option key={c.id} value={c.id}>{c.rotulo}</option>)}
        </select>
      </div>
      <div className="fs-chips or-filtros" role="group" aria-label="Filtrar pedidos">
        {FILTROS.map((f) => {
          const n = lista.filter(f.vale).length;
          return <Opcao key={f.id} marcada={filtro === f.id} estilo="seg-chip" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{`${f.rotulo} · ${n}`}</Opcao>;
        })}
      </div>

      <div className="mural-list">
        {dados === null && !erro && <Cartao><div className="panel-body"><span className="mural-meta">Carregando os pedidos...</span></div></Cartao>}
        {erro && <EmptyState title="Não deu para carregar os pedidos" text="Confira a conexão e tente de novo." action={{ label: "Tentar de novo", onClick: () => void recarregar() }} />}
        {dados !== null && lista.length === 0 && (
          <EmptyState title="Nenhum pedido de oração ainda" text="Quando alguém pedir oração pelo app, o pedido aparece aqui para a intercessão acompanhar." />
        )}
        {dados !== null && lista.length > 0 && visiveis.length === 0 && (
          <EmptyState title="Nada neste filtro" text="Troque o filtro ou limpe a busca para ver os outros pedidos." />
        )}
        {visiveis.map((p) => (
          <Cartao como="article" className={`mural-item or-item${p.moderation !== "ativo" ? " or-apagado" : ""}`} key={p.id}>
            <div className="panel-body">
              <div className="mural-top">
                <span className="or-chips-p">
                  <Selo>{rotuloCategoria(p.category)}</Selo>
                  <Selo>{p.audience === "mural" ? "Mural" : "Só a intercessão"}</Selo>
                  {p.anonymous && <Selo tom="pendente">Anônimo no mural</Selo>}
                  {p.answered_at && <Selo tom="ok">Respondido</Selo>}
                  {p.moderation === "oculto" && <Selo>Oculto</Selo>}
                  {p.moderation === "arquivado" && <Selo>Arquivado</Selo>}
                </span>
                <span className="mural-meta" title={dataPublicacao(p.created_at)}>{quandoPublicado(p.created_at)}</span>
              </div>
              <h3 className="mural-t or-quem-p">{joinDot(p.author ?? "Pessoa sem ficha", nomeIgreja(p.church_id))}</h3>
              <p className="mural-txt or-txt-p">{p.body}</p>
              {p.testimony && <p className="mural-txt or-test-p">{p.testimony}</p>}
              <div className="mural-reach-n or-n">{p.audience === "mural" ? (p.prayed_count ? `${plural(p.prayed_count, "pessoa orou", "pessoas oraram")}` : "Ninguém marcou que orou ainda") : "Chegou também como conversa"}</div>
              <div className="mural-acts">
                {p.moderation === "ativo" && p.audience === "mural" && (
                  <Botao compacto desativado={ocupado === p.id} onClick={() => void mudar(p, "oculto", "Pedido tirado do mural.")}>Ocultar do mural</Botao>
                )}
                {p.moderation === "oculto" && (
                  <Botao compacto desativado={ocupado === p.id} onClick={() => void mudar(p, "ativo", "Pedido de volta no mural.")}>Mostrar de novo</Botao>
                )}
                {p.moderation !== "arquivado" ? (
                  <Botao compacto desativado={ocupado === p.id} onClick={() => void mudar(p, "arquivado", "Pedido arquivado.")}>Arquivar</Botao>
                ) : (
                  <Botao compacto desativado={ocupado === p.id} onClick={() => void mudar(p, "ativo", "Pedido restaurado.")}>Restaurar</Botao>
                )}
              </div>
            </div>
          </Cartao>
        ))}
      </div>
    </div>
  );
}
