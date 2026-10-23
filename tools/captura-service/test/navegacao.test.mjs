import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { irPara } from '../lib/nav.mjs';

test('navega por Mais e grupos nativos aninhados sem exigir a classe antiga do título', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    page.__aparelho = 'desktop';
    await page.setContent(`<aside class="sb"><button class="sb-group-btn" aria-expanded="false" onclick="this.setAttribute('aria-expanded','true');document.querySelector('#mais').hidden=false">Mais</button><div id="mais" hidden><details name="grupo"><summary>Outro grupo</summary><button>Outro</button></details><details name="grupo"><summary>Formação</summary><details><summary>Cursos</summary><button class="sb-link" data-tour="cursos" onclick="document.querySelector('main h1').textContent='Cursos'">Cursos</button></details></details></div></aside><main><h1 class="mp-titulo">Painel</h1></main>`);
    const cliques = await irPara(page, { id: 'cursos', label: 'Cursos', grupo: 'Formação', h1: /^cursos$/ });
    assert.equal(await page.locator('main h1').innerText(), 'Cursos');
    assert.equal(await page.locator('details').first().getAttribute('open'), null);
    assert.ok(cliques.includes('abrir Formação'));
    assert.ok(cliques.includes('abrir Cursos'));
  } finally { await browser.close(); }
});
