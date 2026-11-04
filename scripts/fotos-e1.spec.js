import { test, expect } from '@playwright/test';

test('E1 - Fotos e medição da tela Escalas', async ({ page }) => {
  // Login
  await page.goto('http://localhost:3000/service');
  await page.getByLabel(/e-mail|email/i).fill('lider@teste.local');
  await page.getByLabel(/senha|password/i).fill('TesteLocal123');
  await page.getByRole('button', { name: /entrar|login/i }).click();

  // Aguardar login completar
  await page.waitForURL(/\/service(\/|$)/, { timeout: 15000 });
  await expect(page.getByText(/Precisa de você|Início|Agenda/)).toBeVisible({ timeout: 10000 });

  // Navegar para Escalas
  await page.getByRole('link', { name: /Escalas/i }).click();
  await page.waitForURL(/\/service\/escalas/, { timeout: 10000 });
  await expect(page.locator('h1, [role="heading"]').filter({ hasText: /Escalas/i })).toBeVisible({ timeout: 10000 });

  // Esconder selo Next.js
  await page.evaluate(() => {
    const nextSelo = document.querySelector('[class*="nextjs"]');
    if (nextSelo) nextSelo.style.display = 'none';
  });

  // Fechar tour se existir
  const botaoFecharTour = page.getByRole('button', { name: /fechar|encerrar|pular/i });
  if (await botaoFecharTour.isVisible()) {
    await botaoFecharTour.click();
  }

  // Foto 1: Visão geral da tela Escalas com seletor de time (desktop)
  await page.setViewportSize({ width: 1366, height: 860 });
  await page.screenshot({
    path: '/Users/macbook/campusexpansao/.claude/worktrees/E1/docs/service-v7/historias/screenshots/E1-escala-visao-geral.png',
    fullPage: false
  });

  // Verificar seletor de time no topo
  const seletorTime = page.locator('[class*="segmentado"], [class*="seg-"], select').first();
  await expect(seletorTime).toBeVisible();

  // Verificar que NÃO tem "Como gerar" nem "Pendências da semana"
  const comoGerar = page.getByText(/Como gerar/i);
  const pendenciasSemana = page.getByText(/Pendências da semana/i);

  console.log('Seletor de time visível:', await seletorTime.isVisible());
  console.log('"Como gerar" presente:', await comoGerar.count() > 0);
  console.log('"Pendências da semana" presente:', await pendenciasSemana.count() > 0);

  // Contar itens clicáveis na primeira dobra (viewport padrão)
  const itensClicaveis = await page.locator('button, a, [role="button"], input, select, [tabindex="0"]').count();
  console.log(`Itens clicáveis na dobra (1366x860): ${itensClicaveis}`);

  // Contar palavras visíveis
  const textoVisivel = await page.locator('body').textContent();
  const palavras = textoVisivel ? textoVisivel.trim().split(/\s+/).length : 0;
  console.log(`Palavras visíveis: ${palavras}`);

  // Foto 2: Modo mobile (390px)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: '/Users/macbook/campusexpansao/.claude/worktrees/E1/docs/service-v7/historias/screenshots/E1-escala-mobile.png',
    fullPage: false
  });

  console.log('Fotos salvas em docs/service-v7/historias/screenshots/');
});