"use client";

/* Métricas internas (v7 5.2, lei 11): como o Service está funcionando na
   igreja. Só dono e master (a função do banco recusa os outros). Tudo
   agregado, nenhum número sobre uma pessoa. */
import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { formatDateBR } from "../../lib/date";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { useTermos } from "../../lib/vocabulario-context";

type Metricas = {
  periodo: { ini: string; fim: string; semanas: number };
  participacao: { pessoas: number; media_semanas: number | null };
  vagas48h: { cultos: number; pedidas: number; cobertas: number };
  fechar_escala: { cultos: number; mediana_minutos: number | null };
  visitantes48h: { visitantes: number; contatados: number };
  notificacoes: { com_app: number; sem_aviso: number };
  cartoes: Partial<Record<"card_shown" | "card_acted" | "card_dismissed" | "notification_sent" | "notification_opened", number>>;
};

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "·");
const duracao = (min: number | null) => (min === null ? "·" : min < 60 ? plural(Math.round(min), "minuto") : min < 2880 ? plural(Math.round(min / 60), "hora") : plural(Math.round(min / 1440), "dia"));

export function MetricasInternas({ organizationId }: { organizationId: string }) {
  const { comTermos: ct } = useTermos();
  const [m, setM] = useState<Metricas | null>(null);
  const [erro, setErro] = useState(false);
  useEffect(() => {
    let vivo = true;
    createServiceBrowserClient().schema("service").rpc("metricas_internas", { p_org: organizationId, p_dias: 90 }).then(({ data, error }) => {
      if (!vivo) return;
      if (error || !data) setErro(true); else setM(data as Metricas);
    });
    return () => { vivo = false; };
  }, [organizationId]);

  if (erro) return null;
  const linhas: [string, string, string][] = m ? [
    ["Semanas com participação", m.participacao.media_semanas === null ? "·" : `${String(m.participacao.media_semanas).replace(".", ",")} de ${m.periodo.semanas}`, `média por pessoa que fez check-in (${plural(m.participacao.pessoas, "pessoa")})`],
    [ct("Vagas cobertas 48h antes do {culto}"), pct(m.vagas48h.cobertas, m.vagas48h.pedidas), `${m.vagas48h.cobertas} de ${plural(m.vagas48h.pedidas, "vaga")} em ${plural(m.vagas48h.cultos, ct("{culto}"), ct("{cultos}"))}`],
    ["Tempo para fechar a escala", duracao(m.fechar_escala.mediana_minutos), `mediana entre a primeira e a última escalação, em ${plural(m.fechar_escala.cultos, ct("{culto}"), ct("{cultos}"))} completos`],
    ["Visitantes contatados em 48h", pct(m.visitantes48h.contatados, m.visitantes48h.visitantes), `${m.visitantes48h.contatados} de ${plural(m.visitantes48h.visitantes, "visitante")}`],
    ["Sem notificações", pct(m.notificacoes.sem_aviso, m.notificacoes.com_app), `${m.notificacoes.sem_aviso} de ${plural(m.notificacoes.com_app, "pessoa")} com acesso ao app não recebem aviso`],
    ["Cartões do Início", `${m.cartoes.card_acted ?? 0} usados`, `${m.cartoes.card_shown ?? 0} vistos, ${m.cartoes.card_dismissed ?? 0} dispensados`],
    ["Notificações", `${m.cartoes.notification_opened ?? 0} abertas`, `de ${m.cartoes.notification_sent ?? 0} enviadas`],
  ] : [];

  return (
    <div className="panel" style={{ marginTop: 22 }}>
      <div className="panel-head">
        <span className="panel-title"><Icon name="relatorios" size={14} /> Como o Service está funcionando</span>
        <span className="panel-meta">{m ? `${formatDateBR(m.periodo.ini)} a ${formatDateBR(m.periodo.fim)}` : "Carregando..."}</span>
      </div>
      <div className="panel-body flush">
        {linhas.map(([t, v, s]) => (
          <div className="mini-row" key={t}>
            <div className="mini-main"><div className="mini-title">{t}</div><div className="mini-sub">{s}</div></div>
            <div className="mini-right metrica-v">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
