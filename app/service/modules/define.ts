/* Contrato dos módulos do Service (lei 4 de app/service/modules/README.md).
   Cada módulo exporta `defineModule({...})` no seu manifest.ts; o registro
   (registry.ts) lê os manifestos e filtra por igreja, papel, permissão e
   dependências. Este arquivo só declara os tipos: nada aqui desenha tela. */

/** Lugares que a casca oferece (lei 1). */
export type Lugar =
  | "inicio.fila"
  | "inicio.igreja"
  | "agenda.minha"
  | "agenda.igreja"
  | "mensagens.itens"
  | "caminhada.secoes"
  | "perfil.linhas"
  | "painel.menu"
  | "painel.inicio.saude"
  | "painel.inicio.pendencias"
  | "painel.config"
  | "busca";

/** Seis tipos de cartão (lei 5). */
export type TipoCartao = "acao" | "passo" | "evento" | "aviso" | "pedido" | "destaque";

/** Categorias de aviso que a pessoa pode desligar (lei 9). */
export type CategoriaAviso = "escala" | "mural" | "mensagens" | "caminhada";

/** Termos renomeáveis pela igreja (lei 7). */
export type Termo = "caminhada" | "grupo" | "culto" | "voluntario";

/** Fatos que vão para a linha do tempo da pessoa (lei 10). */
export type Fato = "serviu" | "faltou" | "trocou" | "concluiu_aula" | "concluiu_curso" | "batizou" | "entrou_grupo" | "contato_cuidado";

export type Papel = "master" | "gestao" | "pastor" | "lider" | "membro";

export type Acao = { rotulo: string; acao: string };

/** Contrato do cartão (lei 5). */
export type Cartao = {
  id: string;
  modulo: string;
  tipo: TipoCartao;
  prioridade: number; // 0 a 100
  prazo?: string; // ISO
  contexto?: string;
  titulo: string;
  linhas?: string[];
  principal?: Acao;
  secundaria?: Acao; // no máximo duas ações no total
  resolvido?: { titulo: string; desfazer?: string };
};

export type ModuleManifest = {
  id: string;
  /** Padrão por igreja: ligado ao criar a igreja? */
  liga: boolean;
  /** Ids de módulos (ou dependências nomeadas) sem os quais este some (lei 6). */
  depende?: string[];
  /** Permissões que o módulo usa (as mesmas de Configurações › Permissões). */
  permissoes?: string[];
  membro?: { visivel: boolean; lugares: Lugar[] };
  painel?: {
    menu?: { grupo: string; rotulo: string; icone: string; papeis?: Papel[] }[];
    inicio?: Lugar[];
    config?: { id: string; rotulo: string }[];
  };
  avisos?: { tipo: string; categoria: CategoriaAviso; publico: string; cartao: TipoCartao; quando: string }[];
  rotas?: { caminho: string; tipo: "qr" | "publica" }[];
  vocabulario?: Termo[];
  historico?: Fato[];
};

export function defineModule<M extends ModuleManifest>(m: M): M {
  return m;
}
