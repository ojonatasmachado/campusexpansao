"use client";

import { useState } from "react";
import { avisar } from "../../lib/avisar";
import { formatDateBR } from "../../lib/date";
import { useTermos } from "../../lib/vocabulario-context";
import { JRN_STEPS } from "../../painel/caminhada";
import type { JourneyChangeRequestView, MemberView } from "../../painel/tipos";
import { Botao, BotaoIcone } from "../../ui/Botao";
import { Vazio } from "../../ui/Estados";
import { Gaveta } from "../../ui/Janela";
import { Linha } from "../../ui/Linha";

type Decidir = (pedido: JourneyChangeRequestView) => void | Promise<void>;

/* Recebe a mesma lista já filtrada da linha do Início. Não consulta nem muda
   permissões; os callbacks existentes continuam gravando a decisão. */
export function PedidosCaminhada({ pedidos, members, onApproveJourney, onRejectJourney, aoFechar }: {
  pedidos: JourneyChangeRequestView[];
  members: MemberView[];
  onApproveJourney: Decidir;
  onRejectJourney: Decidir;
  aoFechar: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const [enviando, setEnviando] = useState<string | null>(null);
  const decidir = async (pedido: JourneyChangeRequestView, acao: Decidir) => {
    setEnviando(pedido.id);
    try {
      await acao(pedido);
    } catch {
      avisar(ct("Não conseguimos revisar o pedido agora. Tente de novo."), "warn");
    } finally {
      setEnviando(null);
    }
  };
  return (
    <Gaveta larga rotulo={ct("Pedidos na {caminhada}")} aoFechar={() => { if (!enviando) aoFechar(); }}>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo="Fechar" desativado={!!enviando} onClick={aoFechar}>✕</BotaoIcone>
        <h2 className="profile-name">{ct("Pedidos na {caminhada}")}</h2>
      </div>
      <div className="drawer-body" aria-busy={!!enviando}>
        {pedidos.length === 0 && <Vazio titulo="Nenhum pedido pendente" />}
        {pedidos.map((pedido) => {
          const member = members.find((m) => m.id === pedido.memberId);
          const etapa = ct(JRN_STEPS.find((s) => s.kind === pedido.step)?.label ?? pedido.step);
          return (
            <Linha estilo="config" key={pedido.id}>
              <div className="mini-main">
                <div className="mini-title">{member?.name ?? "Alguém"} · {etapa}</div>
                <div className="mini-sub">{formatDateBR(pedido.eventDate) || "sem data informada"}{pedido.note ? ` · ${pedido.note}` : ""}</div>
              </div>
              <div className="flex-row gap-sm">
                <Botao variante="discreto" compacto desativado={!!enviando} onClick={() => decidir(pedido, onRejectJourney)}>Rejeitar</Botao>
                <Botao compacto desativado={!!enviando} onClick={() => decidir(pedido, onApproveJourney)}>Aprovar</Botao>
              </div>
            </Linha>
          );
        })}
      </div>
    </Gaveta>
  );
}
