"use client";

/* Galeria viva, bloco D: indicadores e gráficos (prancha 2). Dados ilustrativos.
   "Repetir animação" remonta o bloco; "Trocar dados" mostra a barra deslizando
   até o valor novo. */

import { useState } from "react";
import { avisar } from "../../lib/avisar";
import { Botao } from "../../ui/Botao";
import { Cartao } from "../../ui/Cartao";
import { Barras, Cobertura, Distribuicao, EntradasSaidas, Frequencia, Meta, Progresso, Tendencia } from "../../ui/Graficos";
import { Indicador } from "../../ui/Indicador";

const MESES = ["mai", "jun", "jul", "ago", "set", "out"];
const brl = (n: number) => `R$ ${Math.round(n).toLocaleString("pt-BR")}`;

export function BlocoD() {
  const [vez, setVez] = useState(0);
  const [outro, setOutro] = useState(false);
  const vis = outro ? [18, 24, 30, 22, 35, 41] : [22, 28, 19, 31, 27, 36];
  const semanas = [158, 162, 160, 165, 171, 166, 172, 175, 180, 178, 184, 187];
  const fin = [[41, 30], [44, 33], [39, 29], [47, 35], [50, 31], [48, 32]].map(([e, s], i) => ({ rotulo: MESES[i], entrada: e * 1000, saida: s * 1000 }));
  const freq = ["Dom manhã", "Dom noite", "Quarta", "Grupos"].map((rotulo, r) => ({
    id: rotulo, rotulo,
    valores: Array.from({ length: 12 }, (_, c) => Math.round(100 * Math.min(1, Math.max(0.12, [0.75, 0.55, 0.35, 0.5][r] + Math.sin(c * 0.9 + r) * 0.18 + c * 0.012)))),
  }));

  return (
    <div key={vez} style={{ display: "contents" }}>
      <Cartao className="galeria-bloco">
        <div className="galeria-linha" style={{ justifyContent: "space-between" }}>
          <h2>Indicadores</h2>
          <div className="galeria-linha">
            <Botao compacto onClick={() => setOutro((v) => !v)}>Trocar dados</Botao>
            <Botao compacto onClick={() => setVez((v) => v + 1)}>Repetir animação</Botao>
          </div>
        </div>
        <div className="kpi-row" style={{ marginBottom: 0 }}>
          <Indicador rotulo="Membros ativos" icone="membros" valor={248} variacao={{ texto: "+12 no mês", tom: "ok" }} serie={[220, 224, 229, 231, 236, 240, 244, 248]} ajuda="Quem está na congregação hoje." />
          <Indicador rotulo="Presença média" icone="cultos" valor={186} variacao={{ texto: "+4% em 30 dias", tom: "ok" }} serie={[162, 170, 166, 175, 172, 180, 183, 186]} />
          <Indicador rotulo="Visitantes no mês" icone="visitante" valor={36} variacao={{ texto: "9 voltaram" }} serie={[22, 28, 19, 31, 27, 36, 30, 36]} />
          <Indicador rotulo="Contribuições" icone="moeda" valor="R$ 48.320" variacao={{ texto: "3% abaixo de set.", tom: "pendente" }} serie={[44, 47, 50, 46, 49, 51, 50, 48]} />
        </div>
        <div className="saude-grid">
          <Indicador estilo="numero" rotulo="Sem registro há 3 semanas" valor={7} tom="pendente" aoAbrir={() => avisar("Abriria a lista.", "info")} rotuloAcao="Sem registro há 3 semanas: 7. Ver a lista" />
          <Indicador estilo="numero" rotulo="Visitantes novos" valor={12} rodape="4 a mais que antes" aoAbrir={() => avisar("Abriria a lista.", "info")} rotuloAcao="Visitantes novos: 12. Ver a lista" />
          <Indicador estilo="numero" rotulo="Batismos" valor={0} />
        </div>
        <p className="galeria-nota">Cartão: rótulo, número que conta, variação em selo e minilinha. Número: bloco tocável que abre a lista do que conta.</p>
      </Cartao>

      <div className="galeria-quatro">
        <Cartao className="galeria-bloco">
          <h2>Tendência</h2>
          <p className="galeria-nota">Presença média nos cultos, últimas 12 semanas.</p>
          <Tendencia rotulo="Presença média nos cultos" serie={semanas} eixo={["4 ago", "1 set", "29 set", "25 out"]} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Meta</h2>
          <Meta valor={outro ? 72 : 64} total={80} unidade="vagas" rotulo={`Retiro de casais · faltam ${outro ? 8 : 16}`} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Comparação</h2>
          <p className="galeria-nota">Visitantes por mês; o atual na cor da igreja.</p>
          <Barras rotulo="Visitantes por mês" serie={vis} rotulos={MESES} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Funil</h2>
          <Distribuicao funil itens={[["Visitaram", 120], ["Voltaram", 54], ["Entraram em um grupo", 31], ["Batizados", 12]].map(([r, v]) => ({ id: String(r), rotulo: r, valor: Number(v) }))} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Mapa de frequência</h2>
          <Frequencia rotulo="Presença por culto nas últimas 12 semanas" linhas={freq} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Cobertura</h2>
          <p className="galeria-nota">Abaixo de 80% fica âmbar.</p>
          <Cobertura itens={[["Louvor", 100], ["Som", 92], ["Recepção", 86], ["Kids", outro ? 64 : 72]].map(([r, p]) => ({ id: String(r), rotulo: r, pct: Number(p) }))} />
        </Cartao>
      </div>

      <Cartao className="galeria-bloco">
        <h2>Entradas e saídas</h2>
        <div className="galeria-linha">
          <Indicador rotulo="Entradas" valor={brl(269000)} />
          <Indicador rotulo="Saídas" valor={brl(190000)} />
          <Indicador rotulo="Saldo" valor={brl(79000)} />
        </div>
        <EntradasSaidas meses={fin} formatar={brl} />
        <div className="graf-legenda"><span><i className="entrada" />Entradas</span><span><i />Saídas</span></div>
        <p className="galeria-nota">Progresso fino (curso, campanha):</p>
        <Progresso pct={outro ? 85 : 62} rotulo="Campanha da reforma" />
        <Distribuicao itens={[["Louvor", 14], ["Recepção com um nome bem comprido para quebrar", 9], ["Kids", 6]].map(([r, v]) => ({ id: String(r), rotulo: r, valor: Number(v) }))} />
      </Cartao>
    </div>
  );
}
