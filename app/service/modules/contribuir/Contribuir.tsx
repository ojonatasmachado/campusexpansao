"use client";

/* Tela Contribuir no app do membro (aba Caminhada). Uma ação cheia por tela
   (lei 8): copiar o código Pix, que se cola no app do banco. A chave fica
   logo abaixo para quem prefere digitar, e o QR abre só quando pedido (serve
   para pagar de outro aparelho). Nada de valor, meta ou quem deu (lei 10). */

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { chaveLegivel, codigoPix, normalizarChave, rotuloDoTipo, type ContribuirCfg } from "./pix";

async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    /* navegador sem permissão de área de transferência: cópia à moda antiga */
    try {
      const ta = document.createElement("textarea");
      ta.value = texto;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function Contribuir({ cfg }: { cfg: ContribuirCfg }) {
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
    const ok = await copiar(qual === "codigo" ? codigo : normalizarChave(cfg.tipo, cfg.chave));
    if (!ok) { avisar("Não consegui copiar. Toque e segure a chave para copiar.", "warn"); return; }
    avisar(qual === "codigo" ? "Código Pix copiado. Cole no app do seu banco." : "Chave Pix copiada.");
    setCopiado(qual);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiado(null), 2000);
  };

  return (
    <>
      <div className="m6-sec0">
        <div className="m6-card">
          <div className="m6-kick">Pix para</div>
          <div className="m6-ct contrib-fav">{cfg.favorecido}</div>
          {cfg.texto.trim() && <p className="m6-txt">{cfg.texto}</p>}
        </div>
      </div>

      {finalidades.length > 1 && (
        <div className="m6-sec">
          <div className="m6-lbl" id="contrib-fin">Para</div>
          <div className="m6-seg">
            <div className="ts-seg contrib-seg" role="radiogroup" aria-labelledby="contrib-fin" style={{ gridTemplateColumns: `repeat(${finalidades.length === 4 ? 2 : finalidades.length}, minmax(0, 1fr))` }}>
              {finalidades.map((f) => (
                <button key={f} type="button" role="radio" aria-checked={finalidade === f} className={finalidade === f ? "on" : ""} onClick={() => setFinalidade(f)}>{f}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="m6-sec">
        <div className="m6-card">
          <button className="m6-btn pri full" type="button" onClick={() => copiarEAvisar("codigo")}>
            <Icon name={copiado === "codigo" ? "ok" : "copiar"} size={20} />
            {copiado === "codigo" ? "Código copiado" : "Copiar código Pix"}
          </button>
          <p className="m6-meta m6-mt">No app do seu banco, escolha Pix copia e cola, cole o código e digite o valor.</p>

          <div className="contrib-chave">
            <div className="m6-rb">
              <div className="m6-meta">{rotuloDoTipo(cfg.tipo)}</div>
              <div className="contrib-chave-v">{legivel}</div>
            </div>
            <button className="m6-btn sec small" type="button" onClick={() => copiarEAvisar("chave")} aria-label={`Copiar chave Pix ${legivel}`}>
              {copiado === "chave" ? "Copiada" : "Copiar"}
            </button>
          </div>
        </div>
      </div>

      <div className="m6-sec">
        <div className="m6-card">
          <button className="contrib-qr-t" type="button" aria-expanded={qr} onClick={() => setQr((v) => !v)}>
            <span className="m6-rb">
              <span className="m6-rt">QR code</span>
              <span className="m6-rs">Para pagar com o celular de outra pessoa</span>
            </span>
            <span className={`m6-chev contrib-chev${qr ? " on" : ""}`} aria-hidden="true"><Icon name="avancar" size={18} /></span>
          </button>
          {qr && (
            <div className="contrib-qr">
              <QRCode value={codigo} size={208} viewBox="0 0 208 208" level="M" title={`QR code do Pix para ${cfg.favorecido}`} />
            </div>
          )}
        </div>
      </div>

      <p className="m6-meta contrib-nota">O valor você decide no seu banco. O app não guarda quanto nem quem contribuiu.</p>
    </>
  );
}
