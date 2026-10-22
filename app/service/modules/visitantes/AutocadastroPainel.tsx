"use client";

import { useOrigem } from "../../lib/cliente";
import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toPng } from "html-to-image";
import { Icon } from "../../lib/icons";
import { avisar } from "../../lib/avisar";
import { useChurchSettingsField } from "../../lib/settings-field";
import { caminhoAutocadastro, type AutocadastroCfg } from "./autocadastro";

import { Botao, botaoClasse } from "../../ui/Botao";
import { Janela } from "../../ui/Janela";
import { Interruptor } from "../../ui/Interruptor";
import { Linha } from "../../ui/Linha";
import { Campo } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";
import { Vazio } from "../../ui/Estados";
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
  const origin = useOrigem();
  const qrRef = useRef<HTMLDivElement>(null);

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
    <Janela larga sobretitulo="Visitantes" titulo="QR e link do visitante" texto="Quem visita preenche o próprio contato no celular e entra no funil como Novo, com a origem QR/link." aoFechar={onClose} corpoBloco
      rodape={<Botao variante="principal" onClick={onClose}>Pronto</Botao>}>
          <Linha estilo="config">
            <div className="cfg-row-main">
              <div className="cfg-row-t">Receber cadastros pelo link</div>
              <div className="cfg-row-s">{cfg.ativo ? "Ligado. O link e o QR já aceitam cadastros." : "Desligado. Quem abrir o link vê um aviso para procurar a recepção."}</div>
            </div>
            <Interruptor ligado={cfg.ativo} rotulo="Receber cadastros pelo link" onClick={() => save({ ativo: !cfg.ativo })} />
          </Linha>

          <div style={{ marginTop: 14 }}>
            <Campo rotulo="Quem recebe os novos cadastros" id="vis-resp">
              <Selecao valor={cfg.responsavelId ?? ""} aoMudar={(v) => save({ responsavelId: v || null })} vazio="Ninguém fixo (a equipe distribui)"
                opcoes={pessoas.map((p) => ({ v: p.id, l: p.name }))} />
            </Campo>
          </div>

          {church.slug ? (
            <>
              <div className="field">
                <span className="field-label">Endereço para divulgar</span>
                <div className="vis-link">
                  <span className="vis-link-url">{curto}</span>
                  <div className="vis-link-acts">
                    <Botao compacto onClick={copiar} desativado={!link}><Icon name="copiar" size={13} /> Copiar link</Botao>
                    <a className={botaoClasse({ variante: "discreto", compacto: true })} href={whatsapp} target="_blank" rel="noopener noreferrer">Mandar no WhatsApp</a>
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
                  <Botao compacto style={{ marginTop: 10 }} onClick={baixarQr} desativado={!link}>Baixar QR code</Botao>
                </div>
              </div>
            </>
          ) : (
            <Vazio titulo="A igreja ainda não tem endereço. Defina em Comunicação › Página da igreja e o link aparece aqui." />
          )}
    </Janela>
  );
}
