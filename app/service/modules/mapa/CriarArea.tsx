"use client";

import { useEffect, useState } from "react";
import { useTermos } from "../../lib/vocabulario-context";
import { avisar } from "../../lib/avisar";
import { CORES_AREA, NOME_COR, previaArea, salvarArea, type Area, type CorArea } from "./dados";
import type { ContextoMapa } from "./contexto";
import { BarraForma, useAreaDesenhada } from "./AreaDesenhada";
import { milhar, pessoasNaRegiao } from "./linguagem";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Segmentado } from "../../ui/Segmentado";
import { PainelMapa } from "../../ui/PainelMapa";
import { Campo, Entrada } from "../../ui/Campo";
import { Selecao } from "../../ui/Selecao";

/* Ferramentas › Criar área (G10, mapa/PLANO.md §10, prancha P5). A área nasce
   como quadrado, círculo, juntar bairros ou livre e se ajusta no mapa (o
   desenho e a barra moram em AreaDesenhada.tsx). Os números mudam enquanto a
   pessoa arrasta. Só pastor e administração escolhem o responsável, que passa
   a ver o mapa da área. */

type Previa = { pessoas: number; moradores: number; grupos: number };

const TIPOS: [Area["tipo"], string][] = [["setor", "Setor"], ["regiao", "Região pastoral"], ["alcance", "Atuação"]];
/* o âmbar é da igreja (sede e congregações): a área usa os outros 7 */
const CORES = CORES_AREA.filter((c) => c !== "amber");

export function CriarArea({ ctx, bairrosIniciais, nivel }: { ctx: ContextoMapa; bairrosIniciais: string[]; nivel: "bairro" | "setor" }) {
  const { comTermos: ct } = useTermos();
  const temBairros = nivel === "bairro" && ctx.regioes.length > 0;
  const [previa, setPrevia] = useState<Previa | null>(null);
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<Area["tipo"]>("setor");
  const [cor, setCor] = useState<CorArea>("terra");
  const [resp, setResp] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const area = useAreaDesenhada(ctx, { prefixo: "ca", corHex: ctx.cores[cor], bairrosIniciais, temBairros });
  const { forma, bairros, geo } = area;

  /* números ao vivo (com uma pequena espera para não chamar a cada quadro do arraste) */
  useEffect(() => {
    /* só a resposta do último pedido vale (as antigas podem chegar depois) */
    let vivo = true;
    const t = setTimeout(async () => {
      const b = forma === "bairros" ? bairros : [];
      const g = forma === "bairros" ? null : geo;
      if (!b.length && !g) { setPrevia(null); return; }
      try { const r = await previaArea(ctx.org, b, g); if (vivo) setPrevia(r); } catch (e) { if (!vivo) return; setPrevia(null); if (e instanceof Error && e.message.includes("area_complexa")) avisar("Área com pontos demais. Use menos cantos.", "warn"); }
    }, 180);
    return () => { vivo = false; clearTimeout(t); };
  }, [ctx.org, forma, bairros, geo]);

  const pronto = area.pronta && nome.trim().length > 0;
  const salvar = async () => {
    if (!pronto) { setErro(nome.trim() ? "Desenhe a área no mapa primeiro." : "Dê um nome para a área."); return; }
    setSalvando(true); setErro("");
    try {
      await salvarArea(ctx.org, { nome: nome.trim(), tipo, cor, responsavel_id: ctx.gestao ? resp || null : null, bairros: forma === "bairros" ? bairros : [], geojson: forma === "bairros" ? null : geo });
      const quem = ctx.people.find((p) => p.id === resp)?.name;
      avisar(ctx.gestao && quem ? `Área criada. ${quem} já vê o mapa dela.` : "Área criada.");
      ctx.recarregar();
      ctx.fechar();
    } catch (e) {
      setErro(e instanceof Error && e.message.includes("sem_acesso") ? "Só quem vê a cidade inteira e pode editar cria áreas." : "Não foi possível salvar a área. Tente de novo.");
      setSalvando(false);
    }
  };

  const presenca = previa && previa.pessoas >= 3 && previa.moradores > 0 ? milhar(previa.moradores / previa.pessoas) : "-";

  return (
    <>
      <BarraForma area={area} celular={ctx.celular} id="ca" />

      <PainelMapa rotulo="Nova área" sobretitulo="Nova área" titulo="Dentro da área agora" voltar={{ aoTocar: ctx.fechar }}
        busca={(
          <div className="ca-numeros">
            <div className="ca-num"><span>Pessoas da igreja</span><b className="mp-num">{previa ? pessoasNaRegiao(previa.pessoas) : 0}</b></div>
            <div className="ca-num"><span>Moradores</span><b className="mp-num">{previa ? milhar(previa.moradores) : 0}</b></div>
            <div className="ca-num"><span>Presença da igreja</span><b className="ca-num-txt">1 a cada <span className="mp-num">{presenca}</span></b></div>
            <div className="ca-num"><span>{ct("{Grupos}")}</span><b className="mp-num">{previa ? previa.grupos : 0}</b></div>
            <p className="ca-obs">Os números mudam enquanto você arrasta. Moradores: IBGE 2022.</p>
          </div>
        )}
        rodape={(
          <div className="ca-pe">
            {erro && <p className="ca-erro" role="alert">{erro}</p>}
            <div className="ca-pe-botoes">
              <Botao onClick={ctx.fechar}>Cancelar</Botao>
              <Botao variante="principal" className="ca-salvar" desativado={salvando} onClick={salvar}>{salvando ? "Salvando..." : "Salvar área"}</Botao>
            </div>
          </div>
        )}>
        <div className="ca-form">
          <Campo rotulo="Nome" id="ca-nome"><Entrada value={nome} maxLength={60} placeholder="ex: Setor Norte" onChange={(e) => { setNome(e.target.value); setErro(""); }} /></Campo>
          <div className="field">
            <span className="field-label" id="ca-tipo-rot">Tipo</span>
            <Segmentado role="group" aria-labelledby="ca-tipo-rot">
              {TIPOS.map(([v, l]) => <Opcao key={v} marcada={tipo === v} onClick={() => setTipo(v)}>{l}</Opcao>)}
            </Segmentado>
          </div>
          <div className="field">
            <span className="field-label" id="ca-cor-rot">Cor no mapa</span>
            <div className="ca-cores" role="group" aria-labelledby="ca-cor-rot">
              {CORES.map((c) => <Acao key={c} className={`ca-cor cor-${c}${cor === c ? " on" : ""}`} aria-label={NOME_COR[c]} aria-pressed={cor === c} onClick={() => setCor(c)} />)}
            </div>
          </div>
          {ctx.gestao && (
            <>
              <Campo rotulo="Responsável" id="ca-resp">
                <Selecao valor={resp} aoMudar={setResp} vazio="Escolher depois" opcoes={ctx.people.map((p) => ({ v: p.id, l: p.name }))} />
              </Campo>
              <p className="ca-obs">O responsável passa a ver o mapa só desta área.</p>
            </>
          )}
        </div>
      </PainelMapa>
    </>
  );
}
