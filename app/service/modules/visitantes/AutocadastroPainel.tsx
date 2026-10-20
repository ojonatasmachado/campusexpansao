"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import { Icon } from "../../lib/icons";
import { avisar } from "../../lib/avisar";
import { useChurchSettingsField } from "../../lib/settings-field";
import { caminhoAutocadastro, type AutocadastroCfg } from "./autocadastro";

const PADRAO: AutocadastroCfg = { ativo: false, responsavelId: null };

/* Visitantes › QR e link: liga o autocadastro, escolhe quem recebe os
   cadastros e divulga o endereço (copiar, WhatsApp, QR para baixar). */
export default function AutocadastroPainel({
  church,
  people,
  onClose,
  onRefresh,
}: {
  church: { id: string; nome: string; slug?: string | null; settings?: Record<string, unknown> };
  people: { id: string; name: string }[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [cfg, , save] = useChurchSettingsField<AutocadastroCfg>("autocadastro", PADRAO, church, onRefresh);
  const [origin, setOrigin] = useState("");
  const qrRef = useRef<HTMLDivElement>(null);
  useEffect(() => setOrigin(window.location.origin), []);

  const link = origin && church.slug ? `${origin}${caminhoAutocadastro(church.slug)}` : "";
  const curto = link.replace(/^https?:\/\//, "");
  const pessoas = [...people].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(link);
      avisar("Link copiado.");
    } catch {
      avisar("Não deu para copiar. Selecione o endereço e copie à mão.", "warn");
    }
  };

  const whatsapp = `https://wa.me/?text=${encodeURIComponent(`Que bom ter você com a gente na ${church.nome}! Deixe seu contato por aqui: ${link}`)}`;

  const baixarQr = async () => {
    if (!qrRef.current) return;
    try {
      const url = await toPng(qrRef.current, { pixelRatio: 4, cacheBust: true });
      const a = document.createElement("a");
      a.href = url;
      a.download = `qr-visitante-${church.slug}.png`;
      a.click();
    } catch {
      avisar("Não deu para gerar o QR agora. Tente de novo.", "warn");
    }
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-labelledby="vis-qr-t" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Visitantes</div>
          <div className="modal-title" id="vis-qr-t">QR e link do visitante</div>
          <div className="modal-sub">Quem visita preenche o próprio contato no celular e entra no funil como Novo, com a origem QR/link.</div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
          <div className="cfg-row">
            <div className="cfg-row-main">
              <div className="cfg-row-t">Receber cadastros pelo link</div>
              <div className="cfg-row-s">{cfg.ativo ? "Ligado. O link e o QR já aceitam cadastros." : "Desligado. Quem abrir o link vê um aviso para procurar a recepção."}</div>
            </div>
            <button type="button" role="switch" aria-checked={cfg.ativo} aria-label="Receber cadastros pelo link" className={`sw${cfg.ativo ? " on" : ""}`} onClick={() => save({ ativo: !cfg.ativo })} />
          </div>

          <div className="field" style={{ marginTop: 14 }}>
            <label className="field-label" htmlFor="vis-resp">Quem recebe os novos cadastros</label>
            <select id="vis-resp" className="select" value={cfg.responsavelId ?? ""} onChange={(e) => save({ responsavelId: e.target.value || null })}>
              <option value="">Ninguém fixo (a equipe distribui)</option>
              {pessoas.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {church.slug ? (
            <>
              <div className="field">
                <span className="field-label">Endereço para divulgar</span>
                <div className="vis-link">
                  <span className="vis-link-url">{curto}</span>
                  <div className="vis-link-acts">
                    <button type="button" className="btn btn-sec btn-sm" onClick={copiar} disabled={!link}><Icon name="copiar" size={13} /> Copiar link</button>
                    <a className="btn btn-ghost btn-sm" href={whatsapp} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
                  </div>
                </div>
              </div>

              <div className="vis-qr">
                <div ref={qrRef} className="vis-qr-img">
                  {link ? <QRCode value={link} size={132} style={{ height: "auto", maxWidth: "100%", width: 132 }} viewBox="0 0 132 132" /> : null}
                </div>
                <div className="vis-qr-txt">
                  <div className="cfg-row-t">QR para o telão, boletim ou cartaz</div>
                  <div className="cfg-row-s">Aponte a câmera do celular e o formulário abre na hora. {cfg.ativo ? null : "Ligue o recebimento antes de divulgar."}</div>
                  <button type="button" className="btn btn-sec btn-sm" style={{ marginTop: 10 }} onClick={baixarQr} disabled={!link}>Baixar QR code</button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty">A igreja ainda não tem endereço. Defina em Comunicação › Página da igreja e o link aparece aqui.</div>
          )}
        </div>
        <div className="modal-foot">
          <button className="btn btn-pri" type="button" onClick={onClose}>Pronto</button>
        </div>
      </div>
    </div>
  );
}
