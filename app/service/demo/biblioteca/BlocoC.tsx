"use client";

/* Galeria viva, bloco C: avatar, etapas e tabela com seleção (pranchas 3 e 6).
   Dados de exemplo com o pior caso: nome longo, sem telefone, uma letra só. */

import { useState } from "react";
import { avisar } from "../../lib/avisar";
import { Avatar, AvatarGrupo } from "../../ui/Avatar";
import { Botao } from "../../ui/Botao";
import { Cartao } from "../../ui/Cartao";
import { Etapas, type Etapa } from "../../ui/Etapas";
import { Opcao } from "../../ui/Opcao";
import { Segmentado } from "../../ui/Segmentado";
import { Selo } from "../../ui/Selo";
import { Tabela } from "../../ui/Tabela";
import { Vazio } from "../../ui/Estados";

type Pessoa = { id: string; nome: string; tel: string; grupo: string; ultima: string; situacao: "ativo" | "visitante" | "afastado" };

const PESSOAS: Pessoa[] = [
  { id: "1", nome: "Ana Souza", tel: "(11) 98765-4321", grupo: "Célula Norte", ultima: "domingo", situacao: "ativo" },
  { id: "2", nome: "Bruno Lima", tel: "(11) 91234-5678", grupo: "Sem grupo", ultima: "há 3 semanas", situacao: "visitante" },
  { id: "3", nome: "Juliana Teixeira dos Santos de Albuquerque Neto", tel: "", grupo: "Célula Centro", ultima: "quarta", situacao: "ativo" },
  { id: "4", nome: "Rafael Costa", tel: "(21) 99876-1234", grupo: "Célula Sul", ultima: "há 2 meses", situacao: "afastado" },
  { id: "5", nome: "Ó", tel: "(31) 90000-1111", grupo: "Célula Norte", ultima: "domingo", situacao: "visitante" },
];

const SITUACAO = { ativo: <Selo tom="ok">Ativo</Selo>, visitante: <Selo tom="pendente">Visitante</Selo>, afastado: <Selo tom="cuidado">Afastado</Selo> };

const CAMINHADA: Etapa[] = [
  { id: "d", titulo: "Decisão", estado: "feito", quando: "14/03/2026", icone: "decisoes", detalhe: "no culto de domingo" },
  { id: "b", titulo: "Batismo nas águas", estado: "feito", quando: "09/05/2026", icone: "batismos" },
  { id: "f", titulo: "Fundamentos", estado: "atual", quando: "começou em 02/09/2026", icone: "cursos", detalhe: "aula 3 de 8" },
  { id: "g", titulo: "Grupo", estado: "futuro" },
  { id: "s", titulo: "Servindo", estado: "futuro" },
];

export function BlocoC() {
  const [filtro, setFiltro] = useState<"todos" | Pessoa["situacao"]>("todos");
  const [etapa, setEtapa] = useState(2);
  const linhas = PESSOAS.filter((p) => filtro === "todos" || p.situacao === filtro);
  const ASSISTENTE = ["Arquivo", "Colunas", "Conferir", "Pronto"];

  return (
    <>
      <Cartao className="galeria-bloco">
        <h2>Avatar</h2>
        <div className="galeria-linha">
          <Avatar nome="Juliana Teixeira" tamanho="xs" />
          <Avatar nome="Juliana Teixeira" tamanho="sm" />
          <Avatar nome="Juliana Teixeira" tamanho="md" />
          <Avatar nome="Juliana Teixeira" tamanho="lg" />
          <Avatar nome="Juliana Teixeira" tamanho="xl" />
          <Avatar nome="Ana Souza" tamanho="md" presente rotulo="Ana Souza, presente hoje" />
          <Avatar nome="Eu Mesmo" tamanho="md" eu rotulo="Você" />
          <Avatar nome="Rafael Costa" tamanho="md" lider rotulo="Rafael Costa, líder" />
          <Avatar nome="Ó" tamanho="md" rotulo="Ó" />
          <AvatarGrupo pessoas={PESSOAS.map((p) => ({ id: p.id, nome: p.nome }))} max={3} total={15} />
        </div>
        <p className="galeria-nota">Sem foto, iniciais sobre um tom quente fixo por pessoa. O ponto só aparece no check-in do dia. O grupo entra em cascata.</p>
      </Cartao>

      <Cartao className="galeria-bloco">
        <h2>Etapas</h2>
        <div className="galeria-quatro">
          <div>
            <p className="galeria-nota">Linha (painel): data real em cada etapa feita.</p>
            <Etapas itens={CAMINHADA} rotulo="Caminhada de Ana" />
          </div>
          <div>
            <p className="galeria-nota">App do membro: ponto grande, ação na atual.</p>
            <Etapas estilo="app" rotulo="Etapas" className="galeria-sem-margem" itens={CAMINHADA.map((e) => (e.estado === "atual" ? { ...e, acao: <Botao tamanho="toque" compacto variante="principal" onClick={() => avisar("Abriria a aula.")}>Continuar →</Botao> } : e))} />
          </div>
        </div>
        <p className="galeria-nota">Faixa (fluxo curto). Toque numa etapa feita para voltar.</p>
        <Etapas estilo="faixa" rotulo="Importar planilha" aoEscolher={(id) => setEtapa(Number(id))}
          itens={ASSISTENTE.map((t, i) => ({ id: String(i), titulo: t, estado: i < etapa ? "feito" : i === etapa ? "atual" : "futuro" }))} />
        <div className="galeria-acoes">
          <Botao compacto desativado={etapa >= ASSISTENTE.length - 1} onClick={() => setEtapa((n) => n + 1)}>Avançar etapa</Botao>
        </div>
      </Cartao>

      <Cartao className="galeria-bloco">
        <h2>Tabela com seleção</h2>
        <Segmentado>
          {(["todos", "ativo", "visitante", "afastado"] as const).map((f) => (
            <Opcao key={f} marcada={filtro === f} onClick={() => setFiltro(f)}>{f === "todos" ? "Todos" : f === "ativo" ? "Ativos" : f === "visitante" ? "Visitantes" : "Afastados"}</Opcao>
          ))}
        </Segmentado>
        <Tabela
          rotulo="Pessoas"
          linhas={linhas}
          chave={(p) => p.id}
          nomeLinha={(p) => p.nome}
          chaveAnimacao={filtro}
          aoAbrir={(p) => avisar(`Abriria a ficha de ${p.nome}.`, "info")}
          colunas={[
            { id: "pessoa", rotulo: "Pessoa", largura: "2fr", celula: (p) => <div className="cell-person"><Avatar nome={p.nome} tamanho="md" /><div><div className="cell-name">{p.nome}</div><div className="cell-sub">{p.tel || "sem telefone"}</div></div></div> },
            { id: "grupo", rotulo: "Grupo", largura: "1.3fr", celula: (p) => p.grupo },
            { id: "ultima", rotulo: "Última presença", largura: "1.2fr", celula: (p) => p.ultima },
            { id: "sit", rotulo: "Situação", largura: "1fr", celula: (p) => SITUACAO[p.situacao] },
          ]}
          lote={(marcadas, limpar) => (
            <>
              <Botao compacto onClick={() => avisar(`Copiaria ${marcadas.length} telefones.`, "info")}>Copiar telefones</Botao>
              <Botao compacto variante="principal" onClick={() => { avisar(`Baixaria a planilha de ${marcadas.length}.`); limpar(); }}>Baixar planilha</Botao>
            </>
          )}
          vazio={<Vazio titulo="Ninguém com esse filtro." texto="Troque o filtro para ver mais pessoas." />}
        />
        <p className="galeria-nota">As linhas entram em sequência ao filtrar. Marcar alguém faz subir a barra em lote; Esc ou Limpar tira a seleção.</p>
      </Cartao>
    </>
  );
}
