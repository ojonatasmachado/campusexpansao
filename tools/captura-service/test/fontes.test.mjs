import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { referenciaAtual } from '../lib/fontes.mjs';
import { RAIZ } from '../lib/config.mjs';
test('referência legada aponta para a declaração atual após extração do painel', () => {
  const atual = referenciaAtual('app/service/ServiceExactApp.tsx:2097 (Painel)');
  const [arquivo, linha] = atual.split(':');
  assert.equal(arquivo, 'app/service/painel/telas/Inicio.tsx');
  assert.match(readFileSync(join(RAIZ, arquivo), 'utf8').split('\n')[Number(linha) - 1], /function Painel\b/);
});
test('referência inexistente não vira um link de fonte inventado', () => {
  assert.equal(referenciaAtual('app/service/arquivo-que-nao-existe.tsx:9000'), null);
});
