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
type Regra = "aprovar" | "direto";
const REGRAS: { id: Regra; t: string; s: string }[] = [
  { id: "aprovar", t: "A gestão aprova cada pessoa", s: "O pedido aparece no Início do painel. Você confere quem é e libera." },
  { id: "direto", t: "Entra direto como membro", s: "A conta já entra com o acesso de membro. Outras liberações continuam com a liderança." },
];

export function EntradaConfig() {
  const { organizationId } = useServiceAccess();
  const [cfg, setCfg] = useState<{ code: string; rule: Regra } | null | undefined>(undefined);
  const [trocando, setTrocando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const origin = useOrigem();
  const qrRef = useRef<HTMLDivElement>(null);
  const db = useCallback(() => createServiceBrowserClient().schema("service"), []);

  useEffect(() => {
    if (!organizationId) return;
    db().rpc("entrada_config", { p_org: organizationId }).then(({ data, error }) => {
      setCfg(error || !data ? null : (data as { code: string; rule: Regra }));
    });
  }, [organizationId, db]);

  if (cfg === undefined) return <div className="cfg-card"><div className="cfg-card-s" style={{ margin: 0 }}>Carregando...</div></div>;
  if (cfg === null) {
    return (
      <div className="cfg-card">
        <div className="cfg-card-t">Entrada na igreja</div>
        <div className="cfg-card-s" style={{ margin: 0 }}>Só a gestão e os pastores mudam o link e a regra de entrada.</div>
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
    if (error || !data) return avisar("Não conseguimos gerar outro link agora. Tente de novo.", "warn");
    setCfg({ ...cfg, code: data as string });
    avisar("Link novo pronto. O anterior parou de funcionar.", "ok");
  };

  const mudarRegra = async (rule: Regra) => {
    if (rule === cfg.rule) return;
    const antes = cfg.rule;
    setCfg({ ...cfg, rule });
    const { data, error } = await db().rpc("entrada_regra", { p_org: organizationId, p_rule: rule });
    if (error || data !== "ok") {
      setCfg({ ...cfg, rule: antes });
      avisar("Não conseguimos salvar a regra. Tente de novo.", "warn");
    }
  };

  const copiar = async (texto: string, ok: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      avisar(ok, "ok");
    } catch {
      avisar("Não deu pra copiar. Selecione e copie à mão.", "warn");
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
      avisar("Não consegui gerar o QR agora. Tente de novo.", "warn");
    }
  };

  const whats = `https://wa.me/?text=${encodeURIComponent(`Entre no app da nossa igreja por este link: ${url}`)}`;

  return (
    <>
      <div className="cfg-card">
        <div className="cfg-card-t">Link de entrada</div>
        <div className="cfg-card-s">Quem abre o link cria a conta e pede para fazer parte da igreja. Mande no WhatsApp, coloque no boletim ou mostre o QR no telão.</div>
        <div className="entrada-link">
          <div className="entrada-link-main">
            <span className="entrada-url">{curto}</span>
            <span className="cfg-row-s">{`Para digitar: ${codigoLegivel(cfg.code)}`}</span>
          </div>
          <div className="entrada-acoes">
            <Botao compacto onClick={() => copiar(url, "Link copiado")}><Icon name="copiar" size={13} /> Copiar link</Botao>
            <a className={botaoClasse({ variante: "discreto", compacto: true })} href={whats} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
            <Botao variante="discreto" compacto onClick={() => copiar(codigoLegivel(cfg.code), "Código copiado")}>Copiar código</Botao>
          </div>
        </div>
        <div className="entrada-qr">
          <div ref={qrRef} className="entrada-qr-img">
            <QRCode value={url || entradaPath(cfg.code)} size={128} style={{ height: "auto", maxWidth: "100%", width: 128 }} viewBox="0 0 128 128" />
          </div>
          <div>
            <div className="cfg-row-s">A câmera do celular abre o link direto.</div>
            <div className="entrada-acoes" style={{ marginTop: 8 }}>
              <Botao compacto onClick={baixarQr}>Baixar QR</Botao>
              {url && <a className={botaoClasse({ variante: "discreto", compacto: true })} href={url} target="_blank" rel="noopener noreferrer">Ver a tela da pessoa</a>}
            </div>
          </div>
        </div>
        <Linha estilo="config" style={{ borderBottom: "none", paddingBottom: 0 }}>
          <div className="cfg-row-main">
            <div className="cfg-row-t">Gerar outro link</div>
            <div className="cfg-row-s">{trocando ? "O link, o código e o QR de agora param de funcionar na hora. Pedidos já feitos continuam na fila." : "Use se o link foi parar onde não devia."}</div>
          </div>
          {trocando ? (
            <div className="entrada-acoes">
              <Botao variante="discreto" compacto onClick={() => setTrocando(false)} desativado={salvando}>Manter o atual</Botao>
              <Botao compacto onClick={gerarOutro} desativado={salvando}>{salvando ? "Gerando..." : "Gerar outro"}</Botao>
            </div>
          ) : (
            <Botao variante="discreto" compacto onClick={() => setTrocando(true)}>Gerar outro</Botao>
          )}
        </Linha>
      </div>
      <div className="cfg-card" style={{ marginTop: 16 }}>
        <div className="cfg-card-t">Quem entra pelo link</div>
        <div className="cfg-card-s">Vale para os próximos pedidos. Convites que a liderança manda pessoa a pessoa continuam entrando direto.</div>
        <div className="opt-row entrada-regras" role="radiogroup" aria-label="Regra de entrada">
          {REGRAS.map((r) => (
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
