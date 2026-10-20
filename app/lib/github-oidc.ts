import { createPublicKey, verify, type JsonWebKey } from "crypto";

/* Confere o token OIDC que o GitHub Actions emite para um workflow (v7 4.18).
   Assim o agendador do GitHub chama a rota do Service sem segredo guardado
   em lugar nenhum: o GitHub assina o token com a chave dele, e aqui só passa
   se for deste repositório, do branch main e do workflow do agendador.
   Sem biblioteca nova: RS256 com o crypto do Node. */

const EMISSOR = "https://token.actions.githubusercontent.com";
const JWKS_URL = `${EMISSOR}/.well-known/jwks`;

type Jwk = JsonWebKey & { kid?: string };
type Esperado = { audiencia: string; repositorio: string; workflow: string; ref?: string };

let cache: { chaves: Jwk[]; ate: number } | null = null;

async function chavesDoGithub(buscar: typeof fetch): Promise<Jwk[]> {
  if (cache && cache.ate > Date.now()) return cache.chaves;
  const r = await buscar(JWKS_URL, { cache: "no-store" });
  if (!r.ok) throw new Error(`JWKS do GitHub: ${r.status}`);
  const { keys } = (await r.json()) as { keys: Jwk[] };
  cache = { chaves: keys, ate: Date.now() + 60 * 60 * 1000 };
  return keys;
}

const base64url = (s: string) => Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");

/** true só para token válido do workflow esperado; qualquer falha devolve false. */
export async function tokenDoWorkflowValido(
  token: string,
  esperado: Esperado,
  opcoes: { buscar?: typeof fetch; chaves?: Jwk[]; agora?: number } = {},
): Promise<boolean> {
  try {
    const partes = token.split(".");
    if (partes.length !== 3) return false;
    const cabecalho = JSON.parse(base64url(partes[0]).toString("utf8")) as { alg?: string; kid?: string };
    const dados = JSON.parse(base64url(partes[1]).toString("utf8")) as Record<string, unknown>;
    if (cabecalho.alg !== "RS256" || !cabecalho.kid) return false;
    const chaves = opcoes.chaves ?? (await chavesDoGithub(opcoes.buscar ?? fetch));
    const jwk = chaves.find((k) => k.kid === cabecalho.kid);
    if (!jwk) return false;
    const chave = createPublicKey({ key: jwk, format: "jwk" });
    const assinaturaOk = verify("RSA-SHA256", Buffer.from(`${partes[0]}.${partes[1]}`), chave, base64url(partes[2]));
    if (!assinaturaOk) return false;

    const agora = Math.floor((opcoes.agora ?? Date.now()) / 1000);
    const aud = dados.aud;
    const audOk = Array.isArray(aud) ? aud.includes(esperado.audiencia) : aud === esperado.audiencia;
    const ref = esperado.ref ?? "refs/heads/main";
    const workflowRef = String(dados.job_workflow_ref ?? dados.workflow_ref ?? "");
    return (
      dados.iss === EMISSOR &&
      audOk &&
      typeof dados.exp === "number" && dados.exp > agora &&
      (typeof dados.nbf !== "number" || dados.nbf <= agora + 60) &&
      dados.repository === esperado.repositorio &&
      dados.ref === ref &&
      workflowRef === `${esperado.repositorio}/.github/workflows/${esperado.workflow}@${ref}`
    );
  } catch {
    return false;
  }
}
