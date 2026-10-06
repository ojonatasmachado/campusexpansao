/* Registro único dos módulos do Service (lei 3 de ./README.md).
   Lê os manifestos e filtra por igreja (módulo ligado), papel, permissão e
   dependências. O menu do painel (NAV_GROUPS), as abas de Configurações
   (CFG_TABS) e as telas do app do membro (MEMBER_MODULES) saem daqui.
   Módulo novo: crie a pasta com manifest.ts e acrescente o import abaixo. */

import { GRUPOS_CONFIG, GRUPOS_PAINEL, type ContextoMembro, type ModuleManifest, type TelaMembro, type Termo } from "./define";
import inicio from "./inicio/manifest";
import pessoas from "./pessoas/manifest";
import visitantes from "./visitantes/manifest";
import kids from "./kids/manifest";
import grupos from "./grupos/manifest";
import decisoes from "./decisoes/manifest";
import times from "./times/manifest";
import escalas from "./escalas/manifest";
import ensaios from "./ensaios/manifest";
import reunioes from "./reunioes/manifest";
import cultos from "./cultos/manifest";
import espacos from "./espacos/manifest";
import mural from "./mural/manifest";
import conversas from "./conversas/manifest";
import pesquisas from "./pesquisas/manifest";
import pagina from "./pagina/manifest";
import cursos from "./cursos/manifest";
import batismos from "./batismos/manifest";
import relatorios from "./relatorios/manifest";
import quadros from "./quadros/manifest";
import identidade from "./identidade/manifest";
import historia from "./historia/manifest";
import igreja from "./igreja/manifest";
import acesso from "./acesso/manifest";
import biblia from "./biblia/manifest";
import perfil from "./perfil/manifest";
import cuidado from "./cuidado/manifest";
import configuracao from "./configuracao/manifest";

export const MODULOS: readonly ModuleManifest[] = [
  inicio, pessoas, visitantes, kids, grupos, decisoes, times, escalas, ensaios, reunioes,
  cultos, espacos, mural, conversas, pesquisas, pagina, cursos, batismos, relatorios, quadros,
  identidade, historia, igreja, acesso, biblia, perfil, cuidado, configuracao,
];

const IDS = new Set(MODULOS.map((m) => m.id));

/** Exceções da igreja ao padrão do manifesto (service.churches.modules_on / modules_off, 0055). */
export type EstadoModulos = { on?: string[] | null; off?: string[] | null };

/** Ids dos módulos ligados na igreja. Sem estado, vale o `liga` de cada manifesto.
    `condicoes` responde às dependências nomeadas que não são módulo (ex. "presenca");
    dependência sem resposta conta como ausente (lei 6). */
export function modulosLigados(estado?: EstadoModulos | null, condicoes: Record<string, boolean> = {}): Set<string> {
  const on = new Set(estado?.on ?? []);
  const off = new Set(estado?.off ?? []);
  const ligados = new Set(
    MODULOS.filter((m) => m.essencial || ((m.liga || on.has(m.id)) && !off.has(m.id))).map((m) => m.id),
  );
  /* tira quem perdeu uma dependência, até estabilizar (A depende de B que depende de C) */
  for (let mudou = true; mudou; ) {
    mudou = false;
    for (const m of MODULOS) {
      if (!ligados.has(m.id) || m.essencial) continue;
      const falta = (m.depende ?? []).some((d) => (IDS.has(d) ? !ligados.has(d) : condicoes[d] !== true));
      if (falta) { ligados.delete(m.id); mudou = true; }
    }
  }
  return ligados;
}

export const PADRAO_LIGADOS = modulosLigados();

export type NavItem = { id: string; label: string; icon: string };
export type NavGroup = { group: string; items: NavItem[] };

/** Menu do painel: grupos na ordem da casca, itens pela `ordem` do manifesto. */
export function navGroups(ligados: Set<string> = PADRAO_LIGADOS): NavGroup[] {
  const itens = MODULOS.filter((m) => ligados.has(m.id)).flatMap((m) => m.painel?.menu ?? []);
  return GRUPOS_PAINEL.map((g) => ({
    group: g,
    items: itens.filter((i) => i.grupo === g).sort((a, b) => a.ordem - b.ordem).map((i) => ({ id: i.rota, label: i.rotulo, icon: i.icone })),
  })).filter((g) => g.items.length > 0);
}

export type CfgTab = { id: string; label: string; group: string; s: string };

/** Abas de Configurações: grupos na ordem da casca, abas pela `ordem`. */
export function cfgTabs(ligados: Set<string> = PADRAO_LIGADOS): CfgTab[] {
  const abas = MODULOS.filter((m) => ligados.has(m.id)).flatMap((m) => m.painel?.config ?? []);
  return GRUPOS_CONFIG.flatMap((g) =>
    abas.filter((a) => a.grupo === g).sort((a, b) => a.ordem - b.ordem).map((a) => ({ id: a.id, label: a.rotulo, group: a.grupo, s: a.sub })),
  );
}

/** Grupo de cada tela do painel (título da barra), inclusive as que não estão no menu. */
export const ROTA_GRUPO: Record<string, string> = Object.fromEntries(
  MODULOS.flatMap((m) => [
    ...(m.painel?.menu ?? []).map((i) => [i.rota, i.grupo]),
    ...(m.painel?.rotas ?? []).map((r) => [r.rota, r.grupo]),
  ]),
);

/** Código da matriz de Permissões de cada tela do painel (sem o prefixo "service."). */
export const CODIGO_PERMISSAO: Record<string, string> = Object.fromEntries(
  MODULOS.flatMap((m) => [
    ...(m.painel?.menu ?? []).filter((i) => i.permissao).map((i) => [i.rota, i.permissao as string]),
    ...(m.painel?.rotas ?? []).filter((r) => r.permissao).map((r) => [r.rota, r.permissao as string]),
  ]),
);

/** Módulo dono de uma tela do painel. */
export function moduloDaRota(rota: string): string | undefined {
  return MODULOS.find((m) => (m.painel?.menu ?? []).some((i) => i.rota === rota) || (m.painel?.rotas ?? []).some((r) => r.rota === rota))?.id;
}

/** Termos renomeáveis que a tela usa (manifesto `vocabulario`): a busca acha a tela por eles. */
export function termosDaRota(rota: string): Termo[] {
  const dono = moduloDaRota(rota);
  return MODULOS.find((m) => m.id === dono)?.vocabulario ?? [];
}

/** A tela do painel está num módulo ligado? Telas sem dono (casca) estão sempre. */
export function rotaLigada(rota: string, ligados: Set<string> = PADRAO_LIGADOS): boolean {
  const dono = moduloDaRota(rota);
  return !dono || ligados.has(dono);
}

/** Papel e permissão: a pessoa vê esta tela do painel? (extras = telas liberadas pessoa a pessoa) */
export function podeVerRota(
  rota: string,
  papel: string,
  matriz: Record<string, Record<string, boolean>>,
  extras: string[] = [],
  serveEmTime = false,
): boolean {
  if (papel === "master") return true;
  if (extras.includes(rota)) return true;
  if (rota === "config" && (extras.includes("marca") || extras.includes("pesquisas"))) return true;
  if (rota === "membros" && extras.includes("pessoas")) return true;
  const code = CODIGO_PERMISSAO[rota];
  /* membro que serve num time usa a coluna "Voluntário" da matriz; sem time, só o app */
  if (papel === "membro") return serveEmTime && !!code && matriz.voluntario?.[code] === true;
  if (!code) return true;
  return matriz[papel]?.[code] ?? true;
}

export type TelaDoMembro = Omit<TelaMembro, "quem"> & { modulo: string; quem: (c: ContextoMembro) => boolean };

/** Telas próprias do app do membro, dos módulos ligados. */
export function telasDoMembro(ligados: Set<string> = PADRAO_LIGADOS): TelaDoMembro[] {
  return MODULOS.filter((m) => ligados.has(m.id) && m.membro?.visivel).flatMap((m) =>
    (m.membro?.telas ?? []).map((t) => ({ ...t, modulo: m.id, quem: t.quem ?? (() => true) })),
  );
}
