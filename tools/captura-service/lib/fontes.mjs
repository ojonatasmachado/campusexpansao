// As linhas recuperadas do stash precedem a separação dos componentes.
// Resolve a referência para a declaração atual, sem inventar arquivos/linhas.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { RAIZ } from './config.mjs';
const cache = new Map();
let arquivos, importacoes;
const ler = (p) => readFileSync(join(RAIZ, p), 'utf8');
function listar(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? listar(join(dir, e.name)) : [join(dir, e.name)]);
}
function importsDoPainel() {
  if (importacoes) return importacoes;
  importacoes = new Map();
  for (const m of ler('app/service/ServiceExactApp.tsx').matchAll(/import\s*\{([^}]+)\}\s*from\s*["'](\.[^"']+)["']/g)) {
    for (const nome of m[1].split(',').map((s) => s.trim()).filter((s) => /^\w+$/.test(s))) importacoes.set(nome, `app/service/${m[2].replace(/^\.\//, '')}.tsx`);
  }
  return importacoes;
}
function declarar(caminho, nome) {
  const linhas = ler(caminho).split('\n');
  const seguro = nome && /^\w+$/.test(nome) ? nome : basename(caminho).replace(/\.tsx?$/, '');
  let i = linhas.findIndex((l) => new RegExp(`^(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?(?:function|const|class)\\s+${seguro}\\b`).test(l.trim()));
  if (i < 0) i = linhas.findIndex((l) => /^export\s+default\s+/.test(l.trim()));
  if (i < 0) i = linhas.findIndex((l) => /^export\s+/.test(l.trim()));
  return `${caminho}:${i < 0 ? 1 : i + 1}`;
}
export function referenciaAtual(referencia) {
  if (!referencia) return null;
  if (cache.has(referencia)) return cache.get(referencia);
  const partes = [];
  for (const m of referencia.matchAll(/(app\/[^\s:+()]+\.tsx?)(?::\d+)?(?:\s*\(([^)]+)\))?/g)) {
    let caminho = m[1];
    const nome = m[2]?.match(/^\w+/)?.[0];
    if (caminho === 'app/service/ServiceExactApp.tsx' && nome && importsDoPainel().has(nome)) caminho = importsDoPainel().get(nome);
    if (!existsSync(join(RAIZ, caminho))) {
      arquivos ??= listar(join(RAIZ, 'app'));
      const candidatos = arquivos.filter((p) => basename(p) === basename(caminho));
      if (candidatos.length !== 1) continue;
      caminho = relative(resolve(RAIZ), candidatos[0]);
    }
    partes.push(declarar(caminho, nome));
  }
  const atual = partes.length ? partes.join(' + ') : null;
  cache.set(referencia, atual);
  return atual;
}
