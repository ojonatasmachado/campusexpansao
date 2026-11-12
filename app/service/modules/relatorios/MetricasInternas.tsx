"use client";

/* Métricas internas (v7 5.2, lei 11): como o Service está funcionando na
   igreja. Só dono e master (a função do banco recusa os outros). Tudo
   agregado, nenhum número sobre uma pessoa. */
import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { formatDateBR } from "../../lib/date";
import { Icon } from "../../lib/icons";

import { Cartao } from "../../ui/Cartao";
import { Linha } from "../../ui/Linha";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";
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
const duracao = (min: number | null, traduzirUi: Text) => (min === null ? "·" : min < 60 ? traduzirUi("{count, plural, =1 {# minuto} other {# minutos}}", { count: Math.round(min) }) : min < 2880 ? traduzirUi("{count, plural, =1 {# hora} other {# horas}}", { count: Math.round(min / 60) }) : traduzirUi("{count, plural, =1 {# dia} other {# dias}}", { count: Math.round(min / 1440) }));

export function MetricasInternas({ organizationId }: { organizationId: string }) {
  const traduzirUi = useTexto();
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
  /* [id estável, título, valor, detalhe]: o título traduzido não serve de key */
  const linhas: [string, string, string, string][] = m ? [
    ["participacao", traduzirUi("Semanas com participação"), m.participacao.media_semanas === null ? "·" : traduzirUi("{media} de {semanas}", { media: String(m.participacao.media_semanas).replace(".", ","), semanas: String(m.periodo.semanas) }), traduzirUi("média por pessoa que fez check-in ({count, plural, =1 {# pessoa} other {# pessoas}})", { count: m.participacao.pessoas })],
    ["vagas", traduzirUi("Vagas cobertas 48h antes do {culto}"), pct(m.vagas48h.cobertas, m.vagas48h.pedidas), traduzirUi("{cobertas} de {vagas, plural, =1 {# vaga} other {# vagas}} em {cultos, plural, =1 {# {culto}} other {# {cultos}}}", { cobertas: String(m.vagas48h.cobertas), vagas: m.vagas48h.pedidas, cultos: m.vagas48h.cultos })],
    ["escala", traduzirUi("Tempo para fechar a escala"), duracao(m.fechar_escala.mediana_minutos, traduzirUi), traduzirUi("mediana entre a primeira e a última escalação, em {count, plural, =1 {# {culto}} other {# {cultos}}} completos", { count: m.fechar_escala.cultos })],
    ["visitantes", traduzirUi("Visitantes contatados em 48h"), pct(m.visitantes48h.contatados, m.visitantes48h.visitantes), traduzirUi("{contatados} de {count, plural, =1 {# visitante} other {# visitantes}}", { contatados: String(m.visitantes48h.contatados), count: m.visitantes48h.visitantes })],
    ["sem-aviso", traduzirUi("Sem notificações"), pct(m.notificacoes.sem_aviso, m.notificacoes.com_app), traduzirUi("{sem} de {count, plural, =1 {# pessoa} other {# pessoas}} com acesso ao app não recebem aviso", { sem: String(m.notificacoes.sem_aviso), count: m.notificacoes.com_app })],
    ["cartoes", traduzirUi("Cartões do Início"), traduzirUi("{n} usados", { n: String(m.cartoes.card_acted ?? 0) }), traduzirUi("{vistos} vistos, {dispensados} dispensados", { vistos: String(m.cartoes.card_shown ?? 0), dispensados: String(m.cartoes.card_dismissed ?? 0) })],
    ["notificacoes", traduzirUi("Notificações"), traduzirUi("{n} abertas", { n: String(m.cartoes.notification_opened ?? 0) }), traduzirUi("de {n} enviadas", { n: String(m.cartoes.notification_sent ?? 0) })],
  ] : [];

  return (
    <Cartao style={{ marginTop: 22 }}>
      <div className="panel-head">
        <span className="panel-title"><Icon name="relatorios" size={14} /> {traduzirUi("Como o Service está funcionando")}</span>
        <span className="panel-meta">{m ? traduzirUi("{inicio} a {fim}", { inicio: formatDateBR(m.periodo.ini), fim: formatDateBR(m.periodo.fim) }) : traduzirUi("Carregando...")}</span>
      </div>
      <div className="panel-body flush">
        {linhas.map(([id, t, v, s]) => (
          <Linha key={id}>
            <div className="mini-main"><div className="mini-title">{t}</div><div className="mini-sub">{s}</div></div>
            <div className="mini-right metrica-v">{v}</div>
          </Linha>
        ))}
      </div>
    </Cartao>
  );
}
