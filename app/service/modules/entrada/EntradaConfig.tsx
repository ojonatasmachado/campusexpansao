"use client";

/* Configurações › Entrada na igreja (migração 0071). Link, código e QR
   únicos da igreja, com "Gerar outro" (o antigo para na hora), e a regra:
   a gestão aprova cada pedido (padrão) ou a pessoa entra direto como membro.
   Tudo passa pelas funções entrada_* do banco, que só respondem à gestão. */
import { useOrigem } from "../../lib/cliente";
import { useCallback, useEffect, useRef, useState } from "react";
import { toPng } from "html-to-image";
import QRCode from "react-qr-code";
import { useServiceAccess } from "../../AccessContext";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { codigoLegivel, entradaPath } from "../../../lib/service-entrada";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Opcao } from "../../ui/Opcao";
import { Linha } from "../../ui/Linha";
import { Carregando, ErroEstado } from "../../ui/Estados";
import { useTexto } from "../../lib/internacional/contexto";
import type { Text } from "../../lib/internacional/mensagens";
type EstadoCarga = "carregando" | "erro" | "pronto";
type Regra = "aprovar" | "direto";
const regrasDe = (traduzirUi: Text): { id: Regra; t: string; s: string }[] => [
  { id: "aprovar", t: traduzirUi("A gestão aprova cada pessoa"), s: traduzirUi("O pedido aparece no Início do painel. Você confere quem é e libera.") },
  { id: "direto", t: traduzirUi("Entra direto como membro"), s: traduzirUi("A conta já entra com o acesso de membro. Outras liberações continuam com a liderança.") },
];

export function EntradaConfig() {
  const traduzirUi = useTexto();
  const { organizationId } = useServiceAccess();
  const [estado, setEstado] = useState<EstadoCarga>("carregando");
  const [cfg, setCfg] = useState<{ code: string; rule: Regra } | null>(null);
  const cargaAtual = useRef(0);
  const [trocando, setTrocando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const origin = useOrigem();
  const qrRef = useRef<HTMLDivElement>(null);
  const db = useCallback(() => createServiceBrowserClient().schema("service"), []);

  const carregar = useCallback(() => {
    if (!organizationId) return;
    const carga = ++cargaAtual.current;
    setEstado("carregando");
    void db().rpc("entrada_config", { p_org: organizationId }).then(({ data, error }) => {
      if (carga !== cargaAtual.current) return;
      if (error) { setEstado("erro"); return; }
      /* data é null quando a pessoa não tem permissão ou o link ainda não existe;
         isso é resposta válida da função, não falha de rede/banco. */
      setCfg(data as { code: string; rule: Regra } | null);
      setEstado("pronto");
    }, () => {
      if (carga === cargaAtual.current) setEstado("erro");
    });
  }, [organizationId, db]);

  useEffect(() => {
    const atual = cargaAtual;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- consulta externa: informa a carga ao trocar a organização, antes de receber a resposta
    carregar();
    return () => { atual.current++; };
  }, [carregar]);

  if (estado === "carregando") return <Carregando forma="linhas" rotulo={traduzirUi("Carregando configurações de entrada")} />;
  if (estado === "erro") {
    return (
      <div className="cfg-card">
        <ErroEstado titulo={traduzirUi("Não conseguimos carregar as configurações de entrada")} tentar={carregar} />
      </div>
    );
  }
  if (cfg === null) {
    return (
      <div className="cfg-card">
        <div className="cfg-card-t">{traduzirUi("Entrada na igreja")}</div>
        <div className="cfg-card-s" style={{ margin: 0 }}>{traduzirUi("Só a gestão e os pastores mudam o link e a regra de entrada.")}</div>
      </div>
    );
  }

  const url = origin ? `${origin}${entradaPath(cfg.code)}` : "";
  const curto = url.replace(/^https?:\/\//, "");

  const gerarOutro = async () => {
    setSalvando(true);
    const { data, error } = await db().rpc("entrada_novo_codigo", { p_org: organizationId });
    setSalvando(false);
    setTrocando(false);
    if (error || !data) return avisar(traduzirUi("Não conseguimos gerar outro link agora. Tente de novo."), "warn");
    setCfg({ ...cfg, code: data as string });
    avisar(traduzirUi("Link novo pronto. O anterior parou de funcionar."), "ok");
  };

  const mudarRegra = async (rule: Regra) => {
    if (rule === cfg.rule) return;
    const antes = cfg.rule;
    setCfg({ ...cfg, rule });
    const { data, error } = await db().rpc("entrada_regra", { p_org: organizationId, p_rule: rule });
    if (error || data !== "ok") {
      setCfg({ ...cfg, rule: antes });
      avisar(traduzirUi("Não conseguimos salvar a regra. Tente de novo."), "warn");
    }
  };

  const copiar = async (texto: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar(ok, "ok");
    } catch {
      avisar(traduzirUi("Não deu pra copiar. Selecione e copie à mão."), "warn");
    }
  };

  const baixarQr = async () => {
    if (!qrRef.current) return;
    try {
      const png = await toPng(qrRef.current, { pixelRatio: 4, cacheBust: true });
      const a = document.createElement("a");
      a.href = png;
      a.download = `qr-entrada-${cfg.code.toLowerCase()}.png`;
      a.click();
    } catch {
      avisar(traduzirUi("Não consegui gerar o QR agora. Tente de novo."), "warn");
    }
  };

  const whats = `https://wa.me/?text=${encodeURIComponent(`Entre no app da nossa igreja por este link: ${url}`)}`;

  return (
    <>
      <div className="cfg-card">
        <div className="cfg-card-t">{traduzirUi("Link de entrada")}</div>
        <div className="cfg-card-s">{traduzirUi("Quem abre o link cria a conta e pede para fazer parte da igreja. Mande no WhatsApp, coloque no boletim ou mostre o QR no telão.")}</div>
        <div className="entrada-link">
          <div className="entrada-link-main">
            <span className="entrada-url">{curto}</span>
            <span className="cfg-row-s">{traduzirUi("Para digitar: {codigo}", { codigo: codigoLegivel(cfg.code) })}</span>
          </div>
          <div className="entrada-acoes">
            <Botao compacto onClick={() => copiar(url, traduzirUi("Link copiado"))}><Icon name="copiar" size={13} /> {traduzirUi("Copiar link")}</Botao>
            <a className={botaoClasse({ variante: "discreto", compacto: true })} href={whats} target="_blank" rel="noopener noreferrer">{traduzirUi("Mandar no WhatsApp")}</a>
            <Botao variante="discreto" compacto onClick={() => copiar(codigoLegivel(cfg.code), traduzirUi("Código copiado"))}>{traduzirUi("Copiar código")}</Botao>
          </div>
        </div>
        <div className="entrada-qr">
          <div ref={qrRef} className="entrada-qr-img">
            <QRCode value={url || entradaPath(cfg.code)} size={128} style={{ height: "auto", maxWidth: "100%", width: 128 }} viewBox="0 0 128 128" />
          </div>
          <div>
            <div className="cfg-row-s">{traduzirUi("A câmera do celular abre o link direto.")}</div>
            <div className="entrada-acoes" style={{ marginTop: 8 }}>
              <Botao compacto onClick={baixarQr}>{traduzirUi("Baixar QR")}</Botao>
              {url && <a className={botaoClasse({ variante: "discreto", compacto: true })} href={url} target="_blank" rel="noopener noreferrer">{traduzirUi("Ver a tela da pessoa")}</a>}
            </div>
          </div>
        </div>
        <Linha estilo="config" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div className="cfg-row-main">
            <div className="cfg-row-t">{traduzirUi("Gerar outro link")}</div>
            <div className="cfg-row-s">{trocando ? traduzirUi("O link, o código e o QR de agora param de funcionar na hora. Pedidos já feitos continuam na fila.") : traduzirUi("Use se o link foi parar onde não devia.")}</div>
          </div>
          {trocando ? (
            <div className="entrada-acoes">
              <Botao variante="discreto" compacto onClick={() => setTrocando(false)} desativado={salvando}>{traduzirUi("Manter o atual")}</Botao>
              <Botao compacto onClick={gerarOutro} desativado={salvando}>{salvando ? traduzirUi("Gerando...") : traduzirUi("Gerar outro")}</Botao>
            </div>
          ) : (
            <Botao variante="discreto" compacto onClick={() => setTrocando(true)}>{traduzirUi("Gerar outro")}</Botao>
          )}
        </Linha>
      </div>
      <div className="cfg-card" style={{ marginTop: 16 }}>
        <div className="cfg-card-t">{traduzirUi("Quem entra pelo link")}</div>
        <div className="cfg-card-s">{traduzirUi("Vale para os próximos pedidos. Convites que a liderança manda pessoa a pessoa continuam entrando direto.")}</div>
        <div className="opt-row entrada-regras" role="radiogroup" aria-label={traduzirUi("Regra de entrada")}>
          {regrasDe(traduzirUi).map((r) => (
            <Opcao key={r.id} role="radio" aria-checked={cfg.rule === r.id} marcada={cfg.rule === r.id} estilo="opt" onClick={() => mudarRegra(r.id)}>
              <div className="opt-t">{r.t}</div>
              <div className="opt-s">{r.s}</div>
            </Opcao>
          ))}
        </div>
      </div>
    </>
  );
}
