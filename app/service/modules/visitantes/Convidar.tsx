"use client";

/* O9: "Convidar um amigo" no app do membro (Perfil). O link leva ao cadastro
   de primeira visita da igreja (/[slug]/visita) com o código de quem convida,
   e "Quem te convidou?" já chega com o nome dela. Uma ação cheia (lei 8):
   enviar no WhatsApp. Copiar e o QR em tela cheia ficam ao lado. Só aparece
   com o autocadastro ligado (lei 6, decidido no MobileApp). */

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { avisar } from "../../lib/avisar";
import { copiarTexto } from "../../lib/copiar";
import { Icon } from "../../lib/icons";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { caminhoConvite } from "./autocadastro";
import { Botao } from "../../ui/Botao";
import { Cartao } from "../../ui/Cartao";
import { Janela } from "../../ui/Janela";
import { useTexto } from "../../lib/internacional/contexto";

export type ConviteCfg = { slug: string; organizationId: string; igreja: string };

export function Convidar({ cfg }: { cfg: ConviteCfg }) {
  const traduzirUi = useTexto();
  const [link, setLink] = useState<string | null>(null);
  const [falhou, setFalhou] = useState(false);
  const [qr, setQr] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  /* o código é criado na primeira vez (service.meu_convite, 0109) e depois só lido */
  const buscar = useCallback(async () => {
    const { data, error } = await createServiceBrowserClient().schema("service").rpc("meu_convite", { p_organization: cfg.organizationId });
    return error || typeof data !== "string" || !data ? null : `${window.location.origin}${caminhoConvite(cfg.slug, data)}`;
  }, [cfg.organizationId, cfg.slug]);
  /* a tela pode fechar antes da resposta: só grava se ainda estiver aberta */
  const aberta = useRef(true);
  useEffect(() => {
    aberta.current = true;
    void buscar().then((url) => { if (!aberta.current) return; setLink(url); setFalhou(!url); });
    return () => { aberta.current = false; };
  }, [buscar]);
  const tentarDeNovo = async () => {
    setFalhou(false);
    const url = await buscar();
    if (!aberta.current) return;
    setLink(url);
    setFalhou(!url);
  };

  const mensagem = link ? `Oi! Queria te convidar para conhecer a ${cfg.igreja}. Se quiser, deixa seu contato por aqui e a gente te recebe: ${link}` : "";

  const whatsapp = () => {
    if (!link) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener");
  };

  const copiar = async () => {
    if (!link) return;
    if (!(await copiarTexto(link))) { avisar(traduzirUi("Não consegui copiar. Toque e segure o link para copiar."), "warn"); return; }
    avisar(traduzirUi("Link copiado. Cole na conversa com seu amigo."));
    setCopiado(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <>
      <div className="m6-sec0">
        <Cartao estilo="app">
          <div className="m6-ct">{traduzirUi("Chame alguém para a {igreja}", { igreja: cfg.igreja })}</div>
          <p className="m6-txt">{traduzirUi("Quem abrir o seu link deixa o contato para a primeira visita, e o seu nome já aparece em \"Quem te convidou?\". A pessoa pode apagar.")}</p>
        </Cartao>
      </div>

      <div className="m6-sec">
        <Cartao estilo="app">
          {falhou ? (
            <>
              <p className="m6-meta" role="alert">{traduzirUi("Não deu para criar o seu link agora. Confira a internet e tente de novo.")}</p>
              <div className="m6-btns"><Botao tamanho="toque" onClick={() => void tentarDeNovo()}>{traduzirUi("Tentar de novo")}</Botao></div>
            </>
          ) : (
            <>
              <Botao tamanho="toque" variante="principal" largo carregando={!link} onClick={whatsapp}>
                <Icon name="whatsapp" size={20} />
                {traduzirUi("Enviar no WhatsApp")}
              </Botao>
              <div className="convite-acoes">
                <Botao tamanho="toque" desativado={!link} onClick={copiar}>
                  <Icon name={copiado ? "ok" : "copiar"} size={20} />
                  {copiado ? traduzirUi("Link copiado") : traduzirUi("Copiar link")}
                </Botao>
                <Botao tamanho="toque" desativado={!link} onClick={() => setQr(true)}>
                  <Icon name="codigo" size={20} />
                  {traduzirUi("Mostrar QR")}
                </Botao>
              </div>
              {link ? <p className="m6-meta convite-link">{link}</p> : null}
            </>
          )}
        </Cartao>
      </div>

      {qr && link ? (
        <Janela telaCheia sobretitulo={traduzirUi("Convidar um amigo")} titulo={traduzirUi("Aponte a câmera do celular")} texto={traduzirUi("Abre o cadastro de primeira visita da {igreja}, com o seu nome.", { igreja: cfg.igreja })} aoFechar={() => setQr(false)}>
          <div className="convite-qr">
            <QRCode value={link} size={280} viewBox="0 0 280 280" level="M" title={traduzirUi("QR code do convite para a {igreja}", { igreja: cfg.igreja })} />
          </div>
        </Janela>
      ) : null}
    </>
  );
}
