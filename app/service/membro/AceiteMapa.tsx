"use client";

import { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import { createServiceBrowserClient } from "../lib/supabase-browser";
import { TERMO_MAPA_VERSAO, termoCompleto } from "../lib/termo-mapa";
import { Icon } from "../lib/icons";
import { MemberUiContext } from "./comum";

import { Botao } from "../ui/Botao";
import { sourceText, type Text } from "../lib/internacional/mensagens";
import { useTexto } from "../lib/internacional/contexto";

/* Mapa da igreja (PLANO.md 2.3): quem já era membro antes do termo vê esta
   folha uma vez, no próximo acesso. Os 3 pontos ficam visíveis; o termo
   completo abre ali mesmo. "Agora não" também fica gravado: não pergunta de
   novo, e a pessoa aparece no mapa só como ponto sem nome. */
export async function gravarAceiteMapa(memberId: string, aceita: boolean, origem: "app" | "perfil", t: Text = sourceText): Promise<string | null> {
  const { error } = await createServiceBrowserClient().schema("service").rpc("mapa_consentimento", {
    p_member_id: memberId, p_aceita: aceita, p_origem: origem, p_termo: TERMO_MAPA_VERSAO,
  });
  return error ? t("Não foi possível salvar agora. Tente de novo.") : null;
}

export function SheetAceiteMapa({ memberId, churchName, usaGrupos = false, onDecidido }: { memberId: string; churchName?: string; usaGrupos?: boolean; onDecidido: (aceitou: boolean) => void }) {
  const traduzirUi = useTexto();
  /* G17 (prancha P16): os 3 pontos em ícone; o grupo vem do vocabulário da
     igreja ("seu {grupo}") e some se a igreja não usa grupos */
  const pontos: { icone: "cadeado" | "mapapin" | "perfil"; texto: string; forte?: string }[] = [
    { icone: "cadeado", texto: traduzirUi("Seus dados ficam só com a {igreja}.", { igreja: churchName?.trim() || traduzirUi("igreja") }) },
    { icone: "mapapin", texto: usaGrupos ? traduzirUi("A liderança pode ver seu nome, a região do seu CEP, seu {grupo} e onde você serve.") : traduzirUi("A liderança pode ver seu nome, a região do seu CEP e onde você serve."), forte: traduzirUi("Nunca o endereço.") },
    { icone: "perfil", texto: traduzirUi("Você muda isso quando quiser no Perfil.") },
  ];

  const ui = useContext(MemberUiContext);
  const router = useRouter();
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const decidir = async (aceita: boolean) => {
    setSalvando(true);
    setErro("");
    const e = await gravarAceiteMapa(memberId, aceita, "app", traduzirUi);
    setSalvando(false);
    if (e) { setErro(e); return; }
    onDecidido(aceita);
    ui.sheet(null);
    router.refresh();
  };
  return (
    <div>
      <h2 className="m6-sh">{traduzirUi("Quase lá")}</h2>
      <p className="m6-meta">{traduzirUi("Antes de entrar, veja como a igreja usa seus dados.")}</p>
      <ul className="aceite-pontos">
        {pontos.map((p) => (
          <li key={p.icone}><span className="aceite-ic" aria-hidden="true"><Icon name={p.icone} size={20} /></span><span>{p.texto}{p.forte && <> <b>{p.forte}</b></>}</span></li>
        ))}
      </ul>
      <details className="login-termo-completo">
        <summary>{traduzirUi("Ler o termo completo")}</summary>
        {termoCompleto(churchName, traduzirUi).map((p) => <p key={p}>{p}</p>)}
      </details>
      <div className="m6-btns">
        <Botao tamanho="toque" variante="principal" desativado={salvando} onClick={() => decidir(true)}>{traduzirUi("Concordo e continuar")}</Botao>
        <Botao tamanho="toque" desativado={salvando} onClick={() => decidir(false)}>{traduzirUi("Agora não")}</Botao>
      </div>
      {erro && <div className="m6-meta" role="alert">{erro}</div>}
    </div>
  );
}
