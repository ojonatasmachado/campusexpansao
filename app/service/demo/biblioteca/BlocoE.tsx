"use client";

/* Galeria viva, bloco E: peças do mapa (G6, mapa/PLANO.md §10, P1 e P6).
   Painel de camadas (aberto e recolhido), barra de ferramentas, balão preso a um
   ponto e os marcadores. Dados ilustrativos; o fundo imita o mapa claro. */

import { useEffect, useRef, useState } from "react";
import { avisar } from "../../lib/avisar";
import { Icon } from "../../lib/icons";
import { Botao } from "../../ui/Botao";
import { Cartao } from "../../ui/Cartao";
import { Balao, LinhaBalao } from "../../ui/Balao";
import { BarraFerramentas } from "../../ui/BarraFerramentas";
import { EscalaTons, GrupoCamadas, LinhaCamada, MarcaCamada, PainelMapa, TransparenciaCamada } from "../../ui/PainelMapa";
import { coresDoMapa, type CorMapa } from "../../modules/mapa/estilo";
import { svgMarcador, type Marcador } from "../../modules/mapa/marcadores";


/* onde cada marcador aparece no mapa de exemplo (px no contêiner) */
const PONTOS: { t: Marcador; x: number; y: number }[] = [
  { t: "sede", x: 560, y: 330 }, { t: "congregacao", x: 1010, y: 470 }, { t: "celula", x: 470, y: 150 },
  { t: "celula-sel", x: 640, y: 210 }, { t: "lugar-igreja", x: 820, y: 400 }, { t: "lugar-regiao", x: 900, y: 140 },
];

const ic = (n: string) => <Icon name={n} size={20} stroke={1.9} />;

export function BlocoE() {
  const fundo = useRef<HTMLDivElement>(null);
  const [cores, setCores] = useState<Record<CorMapa, string> | null>(null);
  const [recolhido, setRecolhido] = useState(false);
  const [on, setOn] = useState({ pessoas: true, calor: false, igreja: true, celula: true, presenca: true, idade: false, a1: true, a2: false });
  const [transp, setTransp] = useState(20);
  const [areas, setAreas] = useState(false);
  const [balao, setBalao] = useState<{ x: number; y: number } | null>({ x: 640, y: 210 });
  const vira = (k: keyof typeof on) => () => setOn((v) => ({ ...v, [k]: !v[k] }));

  useEffect(() => { if (fundo.current) setCores(coresDoMapa(fundo.current)); }, []);
  const marca = (t: Marcador, alt = "") => {
    if (!cores) return null;
    const { svg, w, h } = svgMarcador(t, cores);
    return <img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} width={w * 0.6} height={h * 0.6} alt={alt} />;
  };

  return (
    <Cartao className="galeria-bloco">
      <div className="galeria-linha" style={{ justifyContent: "space-between" }}>
        <h2>Mapa: painel, barra e balão</h2>
        <div className="galeria-linha">
          <Botao compacto onClick={() => setRecolhido((v) => !v)}>{recolhido ? "Abrir o painel" : "Recolher o painel"}</Botao>
          <Botao compacto onClick={() => setBalao((b) => (b ? null : { x: 640, y: 210 }))}>{balao ? "Fechar o balão" : "Abrir o balão"}</Botao>
          <Botao compacto onClick={() => setBalao({ x: 980, y: 300 })}>Balão perto da borda</Botao>
        </div>
      </div>
      <div ref={fundo} className="mapa-root galeria-mapa">
        <PainelMapa
          rotulo="Camadas do mapa"
          sobretitulo="Igreja Exemplo"
          titulo="Mapa da igreja"
          recolhido={recolhido}
          aoRecolher={setRecolhido}
          trilho={[{ id: "igreja", rotulo: "Igreja", icone: ic("membros") }, { id: "ibge", rotulo: "Cidade · IBGE", icone: ic("presenca") }, { id: "areas", rotulo: "Áreas da igreja", icone: ic("area") }]}
          rodape={<span className="galeria-linha"><Icon name="privacidade" size={16} />Nenhum endereço aparece no mapa.</span>}
        >
          <GrupoCamadas titulo="Igreja">
            <LinhaCamada icone={ic("membros")} rotulo="Pessoas da igreja" detalhe="1.246 no mapa · membros e novos" ligada={on.pessoas} aoAlternar={vira("pessoas")} />
            <LinhaCamada icone={ic("concentracao")} rotulo="Concentração da igreja" ligada={on.calor} aoAlternar={vira("calor")} />
            <LinhaCamada icone={<MarcaCamada tipo="igreja" />} rotulo="Sede e congregações" ligada={on.igreja} aoAlternar={vira("igreja")} />
            <LinhaCamada icone={<MarcaCamada tipo="celula" />} rotulo="Células com um nome bem comprido para ver a quebra da linha" ligada={on.celula} aoAlternar={vira("celula")} />
          </GrupoCamadas>
          <GrupoCamadas titulo="Cidade · IBGE 2022">
            <LinhaCamada icone={ic("presenca")} rotulo="Presença da igreja" detalhe="pessoas da igreja por morador" ligada={on.presenca} aoAlternar={vira("presenca")}>
              <EscalaTons inicio="menor · 1 a cada 2.000" fim="maior · 1 a cada 100" />
              <TransparenciaCamada valor={transp} aoMudar={setTransp} />
            </LinhaCamada>
            <LinhaCamada icone={ic("idade")} rotulo="Idade dos moradores" ligada={on.idade} aoAlternar={vira("idade")} desativada />
          </GrupoCamadas>
          <GrupoCamadas titulo="Áreas da igreja" contagem={2} recolhivel aberto={areas} aoAlternar={() => setAreas((v) => !v)}>
            <LinhaCamada recuo rotulo="Setor Norte" ligada={on.a1} aoAlternar={vira("a1")} />
            <LinhaCamada recuo rotulo="Atuação Rio das Pedras" ligada={on.a2} aoAlternar={vira("a2")} />
          </GrupoCamadas>
        </PainelMapa>

        {PONTOS.map((p) => (
          <span key={p.t + p.x} className="galeria-ponto" aria-hidden="true" style={{ left: p.x, top: p.y }}>{marca(p.t)}</span>
        ))}

        {balao && (
          <Balao
            x={balao.x}
            y={balao.y}
            sobretitulo="Célula"
            titulo="Célula Jardim América"
            aoFechar={() => setBalao(null)}
            rodape={<Botao onClick={() => avisar("Abriria a conversa com Marcos.", "info")}>Falar com Marcos</Botao>}
          >
            <LinhaBalao icone="agenda">Quinta · 20h</LinhaBalao>
            <LinhaBalao icone="mapapin">Rua das Acácias, 210 · Jardim América</LinhaBalao>
            <LinhaBalao icone="pessoa">Marcos Silva lidera</LinhaBalao>
          </Balao>
        )}

        <BarraFerramentas
          rotulo="Ferramentas do mapa"
          desloc={recolhido ? 80 : 360}
          itens={[
            { id: "area", rotulo: "Criar área", icone: ic("area"), aoTocar: () => avisar("Abriria Criar área.", "info") },
            { id: "rota", rotulo: "Traçar rota", icone: ic("rota"), aoTocar: () => avisar("Abriria Traçar rota.", "info") },
            { id: "tempo", rotulo: "Linha do tempo", icone: ic("linhadotempo"), aoTocar: () => avisar("Abriria a Linha do tempo.", "info") },
            { id: "lugar", rotulo: "Marcar lugar", icone: ic("marcarlugar"), aoTocar: () => avisar("Abriria Marcar lugar.", "info") },
            { id: "analisar", rotulo: "Analisar", icone: ic("analisar"), aoTocar: () => avisar("Abriria Analisar.", "info") },
            { id: "emergencia", rotulo: "Emergência", icone: ic("emergencia"), alerta: true, aoTocar: () => avisar("Abriria a Emergência.", "info") },
          ]}
        />
      </div>
    </Cartao>
  );
}
