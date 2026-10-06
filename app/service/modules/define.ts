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

/** Grupos do menu do painel, na ordem da casca (lei 1). */
export const GRUPOS_PAINEL = ["Início", "Pessoas", "Ministério", "Agenda", "Comunicação", "Formação", "Gestão"] as const;
export type GrupoPainel = (typeof GRUPOS_PAINEL)[number];

/** Grupos do índice de Configurações, na ordem da casca. */
export const GRUPOS_CONFIG = ["Igreja", "Ministério", "Acesso"] as const;
export type GrupoConfig = (typeof GRUPOS_CONFIG)[number];

/** Abas do app do membro (lei 1). */
export type AbaMembro = "inicio" | "agenda" | "mensagens" | "caminhada" | "perfil";

/** O que o app sabe da pessoa para decidir se uma tela do módulo aparece. */
export type ContextoMembro = { serves: boolean; isRecep: boolean; isKids: boolean; isGuardian: boolean };

/** Item do menu do painel. `rota` é a tela que abre (estado `route` do painel). */
export type ItemMenu = {
  rota: string;
  grupo: GrupoPainel;
  rotulo: string;
  icone: string;
  /** posição no menu (crescente, vale entre todos os módulos) */
  ordem: number;
  /** código da ação na matriz de Permissões (sem o prefixo "service."); sem código, qualquer papel da liderança vê */
  permissao?: string;
  papeis?: Papel[];
};

/** Tela do painel fora do menu (atalho interno): herda o grupo para o título da barra. */
export type RotaPainel = { rota: string; grupo: string; permissao?: string };

/** Aba de Configurações. */
export type AbaConfig = { id: string; rotulo: string; grupo: GrupoConfig; sub: string; ordem: number };

/** Tela própria do módulo no app do membro (abre como subtela com "voltar"). */
export type TelaMembro = {
  id: string;
  /** aba onde a tela mora (lei 2) */
  aba: AbaMembro;
  titulo?: string;
  /** categoria do aviso que a tela dispara (lei 9) */
  aviso?: CategoriaAviso;
  /** quem vê; sem isso, todo membro */
  quem?: (c: ContextoMembro) => boolean;
};

export type ModuleManifest = {
  id: string;
  /** Padrão por igreja: ligado ao criar a igreja? */
  liga: boolean;
  /** Parte da casca: não se desliga por igreja. */
  essencial?: boolean;
  /** Ids de módulos (ou dependências nomeadas) sem os quais este some (lei 6). */
  depende?: string[];
  /** Permissões que o módulo usa (as mesmas de Configurações › Permissões). */
  permissoes?: string[];
  membro?: { visivel: boolean; lugares: Lugar[]; telas?: TelaMembro[] };
  painel?: {
    menu?: ItemMenu[];
    rotas?: RotaPainel[];
    inicio?: Lugar[];
    config?: AbaConfig[];
  };
  avisos?: { tipo: string; categoria: CategoriaAviso; publico: string; cartao: TipoCartao; quando: string }[];
  rotas?: { caminho: string; tipo: "qr" | "publica" }[];
  vocabulario?: Termo[];
  historico?: Fato[];
};

export function defineModule<M extends ModuleManifest>(m: M): M {
  return m;
}
