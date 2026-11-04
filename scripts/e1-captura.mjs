#!/usr/bin/env node
// Captura específica da história E1: Escalas por time
import { chromium } from '@playwright/test';

const SAIDA = '/Users/macbook/campusexpansao/.claude/worktrees/E1/docs/service-v7/historias/screenshots';

async function main() {
 const browser = await chromium.launch({ headless: false });
 const context = await browser.newContext();
 const page = await context.newPage();

 try {
 // Login como líder (senha do seed-local-service.ts)
 console.log('Fazendo login como líder@teste.local...');
 await page.goto('http://localhost:3000/service', { waitUntil: 'networkidle' });

 // Aguardar a página carregar completamente
 await page.waitForLoadState('domcontentloaded');
 await new Promise(r => setTimeout(r, 3000)); // aguardar JS executar

 // Debug: mostrar estrutura da página
 const html = await page.content();
 console.log('HTML length:', html.length);

 // Tentar encontrar campos de login de forma mais genérica
 const inputs = await page.locator('input').all();
 console.log(`Encontrados ${inputs.length} inputs na página`);

 for (let i = 0; i < inputs.length; i++) {
 const type = await inputs[i].getAttribute('type');
 const name = await inputs[i].getAttribute('name');
 const placeholder = await inputs[i].getAttribute('placeholder');
 console.log(`Input ${i}: type=${type}, name=${name}, placeholder=${placeholder}`);
 }

 // Preencher campos encontrados
 if (inputs.length >= 2) {
 await inputs[0].fill('lider@teste.local');
 await inputs[1].fill('TesteLocal123');

 // Clicar botão de submit
 const buttons = await page.locator('button').all();
 for (const btn of buttons) {
 const text = await btn.textContent();
 console.log(`Botão encontrado: "${text}"`);
 if (text && /entrar|login/i.test(text)) {
 await btn.click();
 break;
 }
 }
 }

 // Aguardar login completar
 await page.waitForURL(/\/service(\/|$)/, { timeout: 15000 });
 await new Promise(r => setTimeout(r, 2000));

 // Navegar para Escalas
 console.log('Navegando para Escalas...');
 await page.goto('http://localhost:3000/service/escalas', { waitUntil: 'networkidle' });
 await new Promise(r => setTimeout(r, 3000));

 // Esconder selo Next.js
 await page.evaluate(() => {
 const nextSelo = document.querySelector('[class*="nextjs"], [data-nextjs]');
 if (nextSelo) nextSelo.style.display = 'none';
 });

 // Fechar tour se existir
 const botaoFecharTour = page.locator('button').filter({ hasText: /fechar|encerrar|pular|começar/i }).first();
 if (await botaoFecharTour.isVisible()) {
 await botaoFecharTour.click();
 await new Promise(r => setTimeout(r, 1000));
 }

 // === DESKTOP (1366x860) ===
 console.log('\n=== DESKTOP (1366x860) ===');
 await page.setViewportSize({ width: 1366, height: 860 });

 // Verificar seletor de time no topo
 const seletorTime = page.locator('[class*="segmentado"], [class*="seg-"], select').first();
 const seletorVisivel = await seletorTime.isVisible().catch(() => false);
 console.log(`Seletor de time visível: ${seletorVisivel}`);

 // Verificar que NÃO tem "Como gerar" nem "Pendências da semana"
 const bodyText = await page.locator('body').textContent();
 const comoGerar = /Como gerar/i.test(bodyText);
 const pendenciasSemana = /Pendências da semana/i.test(bodyText);
 console.log(`"Como gerar" presente: ${comoGerar}`);
 console.log(`"Pendências da semana" presente: ${pendenciasSemana}`);

 // Contar itens clicáveis na primeira dobra
 const itensClicaveis = await page.locator('button, a, [role="button"], input, select, [tabindex="0"]').count();
 console.log(`Itens clicáveis na dobra: ${itensClicaveis}`);

 // Contar palavras visíveis
 const palavras = bodyText ? bodyText.trim().split(/\s+/).length : 0;
 console.log(`Palavras visíveis: ${palavras}`);

 // Foto 1: Visão geral desktop
 await page.screenshot({
 path: `${SAIDA}/E1-escala-visao-geral.png`,
 fullPage: false
 });
 console.log('Foto desktop salva: E1-escala-visao-geral.png');

 // === MOBILE (390x844) ===
 console.log('\n=== MOBILE (390x844) ===');
 await page.setViewportSize({ width: 390, height: 844 });

 // Foto 2: Modo mobile
 await page.screenshot({
 path: `${SAIDA}/E1-escala-mobile.png`,
 fullPage: false
 });
 console.log('Foto mobile salva: E1-escala-mobile.png');

 // Resumo dos critérios
 console.log('\n=== RESUMO DOS CRITÉRIOS E1 ===');
 console.log(`✓ Seletor de time no topo: ${seletorVisivel ? 'SIM' : 'NÃO'}`);
 console.log(`✓ "Como gerar" removido: ${!comoGerar ? 'SIM' : 'NÃO'}`);
 console.log(`✓ "Pendências da semana" removido: ${!pendenciasSemana ? 'SIM' : 'NÃO'}`);
 console.log(`✓ Itens clicáveis ≤ 25: ${itensClicaveis <= 25 ? 'SIM' : `NÃO (${itensClicaveis})`}`);
 console.log(`✓ Palavras ≤ 90: ${palavras <= 90 ? 'SIM' : `NÃO (${palavras})`}`);

 } catch (error) {
 console.error('Erro durante a captura:', error.message);
 } finally {
 await browser.close();
 }
}

main();