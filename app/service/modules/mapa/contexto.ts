import type { Map as MlMap } from "maplibre-gl";
import type { CorMapa } from "./estilo";
import type { Acesso, Area, Cidade, LocalMapa, PessoaMapa, Regiao } from "./dados";

/* O que cada modo do mapa (criar área, rota, emergência, linha do tempo,
   pontos) recebe da tela principal. Cada modo põe e tira as próprias camadas. */
export type PessoaLider = { id: string; name: string };

export type ContextoMapa = {
  org: string;
  mapa: MlMap;
  cores: Record<CorMapa, string>;
  acesso: Acesso;
  cidade: Cidade | null;
  regioes: Regiao[];
  pessoas: PessoaMapa[];
  locais: LocalMapa[];
  areas: Area[];
  people: PessoaLider[];
  igreja: string;
  recarregar: () => void;
  fechar: () => void;
};

/* tira as camadas e fontes que um modo criou */
export function limparCamadas(mapa: MlMap, prefixo: string) {
  if (!mapa.getStyle()) return;
  for (const l of [...(mapa.getStyle().layers ?? [])].reverse()) if (l.id.startsWith(prefixo)) mapa.removeLayer(l.id);
  for (const id of Object.keys(mapa.getStyle().sources ?? {})) if (id.startsWith(prefixo)) mapa.removeSource(id);
}
