import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { auditar } from '../lib/auditoria.mjs';
import { avaliar } from '../lib/leis.mjs';
test('mede DOM real e rejeita alvo, fonte, contraste, rolagem e densidade', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 860 } });
    const page = await context.newPage();
    await page.setContent('<style>:root{--olive:rgb(0,0,0)}body{background:white;color:black;font:14px Arial}button{width:44px;height:44px;background:white;color:black}</style><main><p>Texto legível</p><button>OK</button></main>');
    const boa = await auditar(page);
    assert.deepEqual(avaliar(boa), []);
    await page.setContent('<style>:root{--olive:rgb(0,0,0)}body{font:8px Arial;background:white;color:#ddd}button{width:10px;height:10px;padding:0;background:white;color:#ddd}.longo{width:1800px}</style><main><p class="longo">Texto ilegível e rolagem lateral</p>' + '<button>X</button>'.repeat(26) + '</main>');
    const ruim = await auditar(page);
    assert.ok(ruim.alvos_menores_que_24px > 0);
    assert.ok(ruim.textos_menores_que_12px > 0);
    assert.equal(ruim.rolagem_lateral, true);
    assert.ok(ruim.axe.contraste_nos_total > 0);
    assert.ok(ruim.densidade.acoes > 25);
    assert.ok(avaliar(ruim).length >= 5);
    await page.setContent('<style>body{background:white;color:black;font:14px Arial}[role=slider]{display:block;width:20px;height:20px}</style><div role="slider" tabindex="0" aria-label="Tamanho" aria-valuemin="1" aria-valuemax="7" aria-valuenow="1"></div>');
    const slider = await auditar(page);
    assert.equal(slider.alvos_menores_que_24px, 1);
    assert.equal(slider.densidade.acoes, 1);
    await page.setContent('<style>body{font:14px Arial;background:white;color:black}summary{padding:12px}button{height:8px;width:8px;font-size:8px}</style><details><summary>Opções</summary><button>Oculto</button></details>');
    const recolhido = await auditar(page);
    assert.equal(recolhido.densidade.acoes, 1);
    assert.equal(recolhido.densidade.nSobre, 0);
    assert.equal(recolhido.alvos_menores_que_24px, 0);
    assert.equal(recolhido.textos_menores_que_12px, 0);
  } finally { await browser.close(); }
});
test('conteúdo recortado na área de rolagem não se sobrepõe à barra externa', async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await page.setContent('<style>:root{--olive:black}body{margin:0;color:black;background:white;font:14px Arial}.rolagem{height:100px;overflow:auto}button{display:block;width:120px;height:44px}nav{position:absolute;top:100px;background:white}</style><div class="rolagem"><div style="height:90px"></div><button>Parte recortada</button></div><nav><button>Barra</button></nav>');
    const a = await auditar(page);
    assert.equal(a.densidade.nSobre, 0);
    assert.equal(a.densidade.alvosPequenos, 0);
    assert.equal(a.densidade.acoes, 2);
  } finally { await browser.close(); }
});
test('foco sozinho não valida botão sem ação', async () => {
  const { efeito } = await import('../lib/jornada.mjs');
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.setContent('<button>Inerte</button><button onclick="document.querySelector(\'p\').textContent=\'Salvo\'">Salvar</button><p>Pendente</p>');
    const antes = await efeito(page);
    await page.getByRole('button', { name: 'Inerte' }).click();
    assert.equal(await efeito(page), antes);
    await page.getByRole('button', { name: 'Salvar' }).click();
    assert.notEqual(await efeito(page), antes);
    await page.setContent('<span role="slider" tabindex="0" aria-valuenow="1" onkeydown="this.setAttribute(\'aria-valuenow\',2)">A</span>');
    const tamanho = await efeito(page);
    await page.getByRole('slider').press('ArrowRight');
    assert.notEqual(await efeito(page), tamanho);
    await page.setContent('<style>aside{position:fixed;left:-200px;width:180px;height:200px}</style><button onclick="document.querySelector(\'aside\').style.left=\'0\'">Menu</button><aside><button>Destino</button></aside>');
    const fechado = await efeito(page);
    await page.getByRole('button', { name: 'Menu', exact: true }).click();
    assert.notEqual(await efeito(page), fechado);
  } finally { await browser.close(); }
});
