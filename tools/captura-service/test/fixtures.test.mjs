import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
for (const [projeto, url] of [['cex-rls-123456abcdef', 'http://127.0.0.1:54321'], ['compartilhado', 'http://127.0.0.1:58000']]) {
  test(`preparação recusa ${projeto} em ${url}`, () => {
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', "import { prepararRascunhoEscala } from './lib/fixtures.mjs'; await prepararRascunhoEscala();"], {
      cwd: fileURLToPath(new URL('..', import.meta.url)),
      env: { ...process.env, CAPTURA_BASE_URL: 'http://localhost:3000', CAPTURA_SUPABASE_URL: url, CAPTURA_DESCARTAVEL: projeto, CAPTURA_SERVICE_ROLE_KEY: 'chave-invalida-de-teste' }, encoding: 'utf8', timeout: 45000,
    });
    assert.equal(r.status, 1, r.stderr);
    assert.match(r.stderr, /exige o projeto descartável/);
  });
}
