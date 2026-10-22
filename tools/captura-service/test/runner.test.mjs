import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
for (const args of [['--so=inexistente'], ['--so=jornadas', '--j=INEXISTENTE', '--ap=celular']]) test(`runner recusa captura incompleta: ${args.join(' ')}`, () => {
  const saida = mkdtempSync(join(tmpdir(), 'cex-captura-'));
  try {
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('../capturar.mjs', import.meta.url)), ...args], { env: { ...process.env, CAPTURA_SAIDA: saida }, encoding: 'utf8', timeout: 15000 });
    assert.equal(r.status, 1, r.stderr);
    assert.equal(JSON.parse(readFileSync(join(saida, 'resultado.json'), 'utf8')).sucesso, false);
  } finally { rmSync(saida, { recursive: true, force: true }); }
});
