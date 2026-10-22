"use client";

/* Galeria viva: cada peça de app/service/ui com seus estados, no tema da igreja.
   Serve de referência (D4, Brand Book) e de banco de prova para captura e break-ui. */

import { useState } from "react";
import { Botao } from "../../ui/Botao";
import { Campo, Entrada, Marcar, TextoLongo } from "../../ui/Campo";
import { Cartao } from "../../ui/Cartao";
import { SeletorData, SeletorHora } from "../../ui/Data";
import { Carregando, ErroEstado, Vazio } from "../../ui/Estados";
import { Interruptor } from "../../ui/Interruptor";
import { Selecao } from "../../ui/Selecao";
import { Selo } from "../../ui/Selo";
import { confirmar } from "../../ui/confirmar";
import { avisar } from "../../lib/avisar";

const GRUPOS = [
  { v: "norte", l: "Célula Norte" },
  { v: "sul", l: "Célula Sul" },
  { v: "centro", l: "Célula Centro, com um nome bem comprido para ver a quebra" },
  { v: "fechada", l: "Célula Leste (sem vagas)", desativada: true },
];

export default function Galeria() {
  const [nome, setNome] = useState("Maria Souza");
  const [tel, setTel] = useState("9 8765-432");
  const [grupo, setGrupo] = useState("norte");
  const [vazio, setVazio] = useState("");
  const [data, setData] = useState("1990-03-14");
  const [hoje, setHoje] = useState("");
  const [hora, setHora] = useState("19:30");
  const [obs, setObs] = useState("");
  const [avisos, setAvisos] = useState(true);
  const [termos, setTermos] = useState(false);
  const [turno, setTurno] = useState("manha");

  return (
    <main className="galeria">
      <header className="galeria-topo">
        <h1>Biblioteca do Service</h1>
        <p>Peças reais de app/service/ui. Troque a cor com ?cor=%23C5805A e o modo com ?modo=light.</p>
      </header>

      <Cartao className="galeria-bloco">
        <h2>Campos</h2>
        <div className="galeria-grade">
          <Campo rotulo="Nome completo" obrigatorio ajuda="Como aparece na ficha.">
            <Entrada value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="name" />
          </Campo>
          <Campo rotulo="Telefone" erro={tel.replace(/\D/g, "").length < 10 ? "Informe o telefone com DDD." : undefined}>
            <Entrada value={tel} onChange={(e) => setTel(e.target.value)} type="tel" inputMode="tel" />
          </Campo>
          <Campo rotulo="Código">
            <Entrada value="CE-0248" disabled readOnly />
          </Campo>
          <Campo rotulo="Grupo" ajuda="O líder do grupo é avisado.">
            <Selecao valor={grupo} aoMudar={setGrupo} opcoes={GRUPOS} />
          </Campo>
          <Campo rotulo="Ministério">
            <Selecao valor={vazio} aoMudar={setVazio} opcoes={GRUPOS.slice(0, 2)} vazio="Escolher ministério" />
          </Campo>
          <Campo rotulo="Nascimento">
            <SeletorData valor={data} aoMudar={setData} max="2026-12-31" />
          </Campo>
          <Campo rotulo="Data do culto" ajuda="Pontos marcam dias com evento.">
            <SeletorData valor={hoje} aoMudar={setHoje} limpavel marcados={["2026-10-25", "2026-10-29", "2026-11-01"]} />
          </Campo>
          <Campo rotulo="Horário">
            <SeletorHora valor={hora} aoMudar={setHora} />
          </Campo>
          <Campo rotulo="Observação" className="galeria-largo">
            <TextoLongo value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Opcional" />
          </Campo>
        </div>
        <div className="galeria-linha">
          <Interruptor ligado={avisos} rotulo="Avisos no celular" onClick={() => setAvisos(!avisos)} />
          <span>Avisos no celular</span>
          <Marcar checked={termos} onChange={(e) => setTermos(e.target.checked)}>Autorizo o uso de imagem</Marcar>
          <Marcar disabled>Indisponível</Marcar>
        </div>
        <div className="galeria-linha" role="radiogroup" aria-label="Turno">
          {[["manha", "Manhã"], ["noite", "Noite"], ["ambos", "Os dois"]].map(([v, l]) => (
            <Marcar key={v} tipo="radio" name="turno" value={v} checked={turno === v} onChange={() => setTurno(v)}>{l}</Marcar>
          ))}
        </div>
        <div className="galeria-coluna">
          <Marcar lado="direita" checked={termos} onChange={(e) => setTermos(e.target.checked)}>Caixa no fim da linha (permissões, camadas)</Marcar>
          {[["manha", "Culto da manhã", "Domingo às 10h, com Kids."], ["noite", "Culto da noite", "Domingo às 19h."]].map(([v, t, s]) => (
            <Marcar key={v} tipo="radio" className="pede-opt" name="turno2" checked={turno === v} onChange={() => setTurno(v)}>
              <b>{t}</b><br /><span className="mini-sub">{s}</span>
            </Marcar>
          ))}
        </div>
        <div className="galeria-acoes">
          <Botao variante="secundario">Cancelar</Botao>
          <Botao variante="principal" onClick={() => avisar("Membro salvo.")}>Salvar membro</Botao>
        </div>
      </Cartao>

      <div className="galeria-quatro">
        <Cartao className="galeria-bloco">
          <h2>Vazio</h2>
          <Vazio titulo="Nenhum visitante esta semana" texto="Quem se cadastrar na recepção aparece aqui." acao={{ rotulo: "Cadastrar visitante", onClick: () => avisar("Abriria o cadastro.", "info") }}
            icone={<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="8" r="3.5" /><path d="M3.5 20c1-3.5 3.5-5 6.5-5s5.5 1.5 6.5 5M17 8h4M19 6v4" /></svg>} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Carregando</h2>
          <Carregando />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Erro</h2>
          <ErroEstado texto="Confira a internet e tente de novo." tentar={() => avisar("Tentando de novo.", "info")} />
        </Cartao>
        <Cartao className="galeria-bloco">
          <h2>Diálogo de risco</h2>
          <p className="galeria-nota">Só para o que não dá para desfazer.</p>
          <Botao variante="perigo" onClick={async () => {
            const ok = await confirmar({ titulo: "Remover Paulo da escala?", texto: "Ele deixa de ver o turno do som no domingo. O líder é avisado.", acao: "Remover" });
            avisar(ok ? "Paulo removido da escala." : "Nada mudou.", ok ? "ok" : "info");
          }}>Remover da escala</Botao>
          <div className="galeria-linha"><Selo tom="ok">Confirmado</Selo><Selo tom="pendente">Pendente</Selo><Selo tom="cuidado">Faltou</Selo></div>
        </Cartao>
      </div>

      <Cartao className="galeria-bloco">
        <h2>Carregando, outras formas</h2>
        <Carregando forma="indicadores" quantos={4} />
        <Carregando forma="cartoes" quantos={3} />
      </Cartao>
    </main>
  );
}
