"use client";

/* Tela Contribuir no app do membro (aba Caminhada). Uma ação cheia por tela
   (lei 8): copiar o código Pix, que se cola no app do banco. A chave fica
   logo abaixo para quem prefere digitar, e o QR abre só quando pedido (serve
   para pagar de outro aparelho). Nada de valor, meta ou quem deu (lei 10). */

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { avisar } from "../../lib/avisar";
import { copiarTexto } from "../../lib/copiar";
import { Icon } from "../../lib/icons";
import { chaveLegivel, codigoPix, normalizarChave, rotuloDoTipo, type ContribuirCfg } from "./pix";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Cartao } from "../../ui/Cartao";
import { useTexto } from "../../lib/internacional/contexto";

export function Contribuir({ cfg }: { cfg: ContribuirCfg }) {
  const traduzirUi = useTexto();
  const finalidades = cfg.finalidades.filter((f) => f.trim());
  const [escolhida, setFinalidade] = useState<string | null>(null);
  /* se a lista mudar com a tela aberta, volta para a primeira */
  const finalidade = escolhida && finalidades.includes(escolhida) ? escolhida : finalidades[0] ?? null;
  const [copiado, setCopiado] = useState<"codigo" | "chave" | null>(null);
  const [qr, setQr] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const codigo = codigoPix(cfg, finalidade);
  const legivel = chaveLegivel(cfg.tipo, cfg.chave);

  const copiarEAvisar = async (qual: "codigo" | "chave") => {
    const ok = await copiarTexto(qual === "codigo" ? codigo : normalizarChave(cfg.tipo, cfg.chave));
    if (!ok) { avisar(traduzirUi("Não consegui copiar. Toque e segure a chave para copiar."), "warn"); return; }
    avisar(qual === "codigo" ? traduzirUi("Código Pix copiado. Cole no app do seu banco.") : traduzirUi("Chave Pix copiada."));
    setCopiado(qual);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <>
      <div className="m6-sec0">
        <Cartao estilo="app">
          <div className="m6-kick">{traduzirUi("Pix para")}</div>
          <div className="m6-ct contrib-fav">{cfg.favorecido}</div>
          {cfg.texto.trim() && <p className="m6-txt">{cfg.texto}</p>}
        </Cartao>
      </div>

      {finalidades.length > 1 && (
        <div className="m6-sec">
          <div className="m6-lbl" id="contrib-fin">{traduzirUi("Para")}</div>
          <div className="m6-seg">
            <div className="ts-seg contrib-seg" role="radiogroup" aria-labelledby="contrib-fin" style={{ gridTemplateColumns: `repeat(${finalidades.length === 4 ? 2 : finalidades.length}, minmax(0, 1fr))` }}>
              {finalidades.map((f) => (
                <Opcao key={f} role="radio" aria-checked={finalidade === f} marcada={finalidade === f} onClick={() => setFinalidade(f)}>{f}</Opcao>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="m6-sec">
        <Cartao estilo="app">
          <Botao tamanho="toque" variante="principal" largo onClick={() => copiarEAvisar("codigo")}>
            <Icon name={copiado === "codigo" ? "ok" : "copiar"} size={20} />
            {copiado === "codigo" ? traduzirUi("Código copiado") : traduzirUi("Copiar código Pix")}
          </Botao>
          <p className="m6-meta m6-mt">{traduzirUi("No app do seu banco, escolha Pix copia e cola, cole o código e digite o valor.")}</p>

          <div className="contrib-chave">
            <div className="m6-rb">
              <div className="m6-meta">{rotuloDoTipo(cfg.tipo)}</div>
              <div className="contrib-chave-v">{legivel}</div>
            </div>
            <Botao tamanho="toque" compacto onClick={() => copiarEAvisar("chave")} aria-label={traduzirUi("Copiar chave Pix {chave}", { chave: legivel })}>
              {copiado === "chave" ? traduzirUi("Copiada") : traduzirUi("Copiar")}
            </Botao>
          </div>
        </Cartao>
      </div>

      <div className="m6-sec">
        <Cartao estilo="app">
          <Acao className="contrib-qr-t" aria-expanded={qr} onClick={() => setQr((v) => !v)}>
            <span className="m6-rb">
              <span className="m6-rt">{traduzirUi("QR code")}</span>
              <span className="m6-rs">{traduzirUi("Para pagar com o celular de outra pessoa")}</span>
            </span>
            <span className={`m6-chev contrib-chev${qr ? " on" : ""}`} aria-hidden="true"><Icon name="avancar" size={18} /></span>
          </Acao>
          {qr && (
            <div className="contrib-qr">
              <QRCode value={codigo} size={208} viewBox="0 0 208 208" level="M" title={traduzirUi("QR code do Pix para {favorecido}", { favorecido: cfg.favorecido })} />
            </div>
          )}
        </Cartao>
      </div>

      <p className="m6-meta contrib-nota">{traduzirUi("O valor você decide no seu banco. O app não guarda quanto nem quem contribuiu.")}</p>
    </>
  );
}
