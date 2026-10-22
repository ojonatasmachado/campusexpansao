// ETAPA 2: as 15 jornadas passo a passo. Uso: node capturar.mjs --so=jornadas [--j=M2,L1] [--ap=celular|desktop]
// Ordem obrigatória (as jornadas alteram dados): L2a, M1..M9, L2b, L1, L3, L4, L5, L6.
import { jornada, proximoNumero } from "../lib/jornada.mjs";
import { contextoGestao, contextoApp } from "../lib/sessoes.mjs";
import { criarContexto } from "../lib/contexto.mjs";
import { tela } from "../lib/catalogo.mjs";
import { registrarNaoExiste } from "../lib/print.mjs";
import { clicarTexto, abrirConfigAba } from "../lib/nav.mjs";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SAIDA, DIR_FERRAMENTA } from "../lib/config.mjs";
import { tirarPrint } from "../lib/print.mjs";
import { arquivoAuth } from "../lib/contexto.mjs";
import { SENHA } from "../lib/config.mjs";
import { menuPara, abaApp, abrirInicioPainel, abrirInicioApp, tocar, preencher, BTN, esperarTexto } from "../lib/jkit.mjs";

const ORDEM = ["L2a", "M1", "M2", "M3", "M4", "M5", "M6", "M7", "M8", "M9", "M10", "M11", "L2b", "L1", "L3", "L4", "L5", "L6", "L7", "L8", "L9", "L10"];
const DEF = {};
const lider = (codigo, nome, titulo, fn, o = {}) => (DEF[codigo] = { tipo: "L", codigo, nome, titulo, fn, ...o });
const membro = (codigo, nome, titulo, fn, o = {}) => (DEF[codigo] = { tipo: "M", codigo, nome, titulo, fn, ...o });

// ---------------------------------------------------------------- L2 Mural
const L2 = { nome: "aviso-no-mural", titulo: "Publicar aviso no Mural e ver quem leu" };
lider("L2a", L2.nome, L2.titulo, async (j) => {
  const titulo = `Aviso da captura (${j.ap})`;
  await j.passo("painel-inicio", "abrir /service (painel da igreja)", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("comunicacao"), "mural-aberto");
  await j.passo("nova-publicacao-aberta", 'tocar "+ Nova publicação"', tocar("button", "Nova publicação"), { espera: ["Para quem"] });
  await j.passo("titulo-digitado", "digitar o título", preencher('input[placeholder^="Ex.: Ensaio geral"]', titulo));
  await j.passo("mensagem-digitada", "digitar a mensagem", preencher("textarea.textarea", "Teste da captura: toque em ler para confirmar que recebeu este aviso."));
  await j.passo("publico", "escolher quem recebe", async (p) => { await p.getByRole("combobox", { name: "Para quem" }).click(); await p.getByRole("option").first().click(); });
  await j.passo("revisar", "revisar a publicação", tocar("button", "Revisar publicação", { exato: true }));
  await j.passo("publicado", 'tocar "Publicar"', async (p) => { await clicarTexto(p, "button", "Publicar", { exato: true }); await esperarTexto(p, titulo, 20000); }, { espera: [titulo] });
}, { aceitarDialogos: true, parte: "a" });
lider("L2b", L2.nome, L2.titulo, async (j) => {
  const titulo = `Aviso da captura (${j.ap})`;
  await j.passo("mural-de-novo", "abrir /service > Mural", async (p) => { await abrirInicioPainel(p); const { clicarItemMenu } = await import("../lib/jkit.mjs"); const { abrirMenuLateral } = await import("../lib/nav.mjs"); await abrirMenuLateral(p); await clicarItemMenu(p, tela("comunicacao")); }, { espera: [titulo] });
  await j.passo("quem-leu-aberto", `tocar "Ver quem leu" na publicação`, async (p) => {
    const idx = await p.evaluate((t) => { const bs = [...document.querySelectorAll("button")].filter((b) => /ver quem leu/i.test(b.innerText)); for (let i = 0; i < bs.length; i++) { let a = bs[i]; for (let k = 0; k < 6 && a; k++, a = a.parentElement) if (a.innerText.includes(t) && a.innerText.length < 700) return i; } return -1; }, titulo);
    if (idx < 0) throw new Error("não achei Ver quem leu da publicação criada");
    await p.getByRole("button", { name: /ver quem leu/i }).nth(idx).click(); await p.waitForTimeout(600);
  });
}, { parte: "b" });


// ---------------------------------------------------------------- M1 primeiro acesso
membro("M1", "primeiro-acesso", "Primeiro acesso (novo@teste.local)", async (j) => {
  const ob = (n) => ({ espera: [`passo ${n} de 6`] });
  await j.passo("login-vazio", "abrir /service/login", async (p) => { await p.goto("/service/login", { waitUntil: "domcontentloaded" }); await p.locator('input[type="email"]').first().waitFor({ timeout: 40000 }); }, { permiteLogin: true });
  await j.passo("email-digitado", "digitar o e-mail novo@teste.local", preencher('input[type="email"]', "novo@teste.local"), { permiteLogin: true });
  await j.passo("senha-digitada", "digitar a senha", preencher('input[type="password"]', SENHA), { permiteLogin: true });
  await j.passo("passo-1-boas-vindas", 'tocar "Entrar"', async (p) => { await p.locator("button.login-btn").first().click(); await esperarTexto(p, "PASSO 1 DE 6", 60000).catch(() => esperarTexto(p, "Passo 1 de 6", 5000)); }, ob(1));
  await j.passo("passo-2-seus-dados", 'tocar "Começar →"', tocar("button", "Começar"), ob(2));
  await j.passo("passo-2-erros-de-validacao", 'tocar "Continuar →" sem preencher', tocar("button", "Continuar"), { espera: ["DDD"] });
  await j.passo("passo-2-telefone", "digitar o telefone", preencher('input[type="tel"]', "11987654321"));
  await j.passo("passo-2-aniversario", "preencher o aniversário", preencher('input[type="date"]', "1992-04-18"));
  await j.passo("passo-2-cep", "digitar o CEP", async (p) => { await preencher('input[inputmode="numeric"]', "01310100")(p); await p.waitForTimeout(2500); });
  await j.passo("passo-3-foto", 'tocar "Continuar →" (grava os dados)', async (p) => { await clicarTexto(p, "button", "Continuar"); await esperarTexto(p, "PASSO 3 DE 6", 30000).catch(() => esperarTexto(p, "Passo 3 de 6", 3000)); }, ob(3));
  await j.passo("passo-4-tamanho-do-texto", 'tocar "Pular por agora →"', tocar("button", "Pular por agora"), ob(4));
  await j.passo("passo-5-notificacoes", 'tocar "Continuar →"', tocar("button", "Continuar"), ob(5));
  await j.passo("passo-6-tela-de-inicio", 'tocar "Pular por agora →"', tocar("button", "Pular por agora"), ob(6));
  await j.passo("inicio-do-app", 'tocar "Entrar no app →"', async (p) => { await clicarTexto(p, "button", "Entrar no app"); await p.locator("nav.m-tab").first().waitFor({ timeout: 30000 }); }, { espera: ["Para você agora"] });
  j.obs("o tour guiado automático existe só no painel (ServiceExactApp); o app do membro não tem tour no primeiro acesso");
}, { abrir: (ap) => criarContexto(ap, { semPadroes: true, extraStorage: { cex_install_dismiss: "1", cex_setup_hide: "1" } }), conta: "novo" });


// ---------------------------------------------------------------- M2 confirmar escala
membro("M2", "confirmar-escala", "Confirmar escala (Maria)", async (j) => {
  await j.passo("inicio-com-escala-pendente", "abrir /service (Início do app)", (p) => abrirInicioApp(p), { espera: ["Escala para confirmar"] });
  await j.passo("confirmar-tocado-com-aviso", 'tocar "Confirmar"', tocar("button", "Confirmar", { exato: true }), { espera: ["Presença confirmada", "Desfazer"] });
  await j.passo("app-reaberto-escala-gravada", "esperar o aviso sumir e reabrir o app", async (p) => { await p.waitForTimeout(7000); await abrirInicioApp(p); });
  await j.passo("agenda-minha-escala", 'tocar na aba "Agenda"', (p) => abaApp(p, "Agenda"), { espera: ["Minha escala"] });
});

// ---------------------------------------------------------------- M3 recusar, mudar de ideia, pedir troca
membro("M3", "recusar-e-pedir-troca", "Recusar escala, mudei de ideia e pedir troca (Maria)", async (j) => {
  await j.passo("inicio-com-escala-pendente", "abrir /service (Início do app)", (p) => abrirInicioApp(p), { espera: ["Escala para confirmar"] });
  await j.passo("nao-posso-tocado-com-aviso", 'tocar "Não posso"', tocar("button", "Não posso", { exato: true }), { espera: ["Você avisou que não pode", "Desfazer"] });
  await j.passo("mudei-de-ideia", 'tocar "Mudei de ideia"', tocar("button", "Mudei de ideia"), { espera: ["Presença confirmada"] });
  await j.passo("pedir-troca-tocado-conversa", 'tocar "Pedir troca"', tocar("button", "Pedir troca"), { espera: [/Preciso trocar|Não achamos o líder|Pedido de troca enviado/i] });
  if (/Não achamos o líder/.test(await j.page.evaluate(() => document.body.innerText))) {
    registrarNaoExiste("jornadas/M3-pedir-troca", "M3 Pedir troca (Maria)", "Pedir troca não funciona com os dados do seed: o app mostra o aviso 'Não achamos o líder do time. Fale com a liderança.' (causa não investigada: só capturado). A conversa de troca não é criada; passos seguintes (conversa aberta) não existem. Print: jornadas/M3-recusar-e-pedir-troca/04-pedir-troca-tocado-conversa.png");
    j.obs("Pedir troca mostrou o aviso 'Não achamos o líder do time' (ver BLOQUEIOS.md); sem conversa criada");
    return;
  }
  await j.passo("lista-de-mensagens", "tocar em voltar", async (p) => { await p.locator("button.m6-back").first().click(); await p.waitForTimeout(500); }, { opcional: true });
});


// ---------------------------------------------------------------- M4 Mural
membro("M4", "mural", "Mural: das não lidas até zerar (Maria)", async (j) => {
  await j.passo("inicio-com-novidade-no-mural", "abrir /service (Início do app)", (p) => abrirInicioApp(p), { espera: ["Novo no Mural"] });
  await j.passo("aba-mensagens-com-nao-lidas", 'tocar na aba "Mensagens"', (p) => abaApp(p, "Mensagens"), { espera: ["Mural da igreja"] });
  await j.passo("mural-aberto-publicacoes-novas", 'tocar "Mural da igreja"', tocar(BTN, "Mural da igreja"), { espera: ["Nova"] });
  await j.passo("responder-vou-tocado", 'tocar "Vou" no evento Mutirão de limpeza', async (p) => {
    const i = await p.evaluate(() => { const arts = [...document.querySelectorAll("article.m6-card")]; return arts.findIndex((a) => a.innerText.includes("Mutirão de limpeza") && /\bVou\b/.test(a.innerText)); });
    if (i < 0) throw new Error("evento com Vou/Não vou não encontrado");
    await p.locator("article.m6-card").nth(i).locator("button", { hasText: /^Vou$/ }).click(); await p.waitForTimeout(600);
  }, { espera: ["Resposta enviada"] });
  await j.passo("voltar-para-mensagens", "tocar em voltar", async (p) => { await p.locator("button.m6-back").first().click(); await p.waitForTimeout(700); });
  await j.passo("inicio-sem-novidade-no-mural", 'tocar na aba "Início"', async (p) => { await abaApp(p, "Inicio"); await p.waitForTimeout(800); });
  await j.passo("app-reaberto-nada-novo", "reabrir o app (conferir que a leitura ficou gravada)", (p) => abrirInicioApp(p));
});


// ---------------------------------------------------------------- M5 pedir oração
membro("M5", "pedir-oracao", "Pedir oração (Maria)", async (j) => {
  await j.passo("aba-mensagens", 'tocar na aba "Mensagens"', async (p) => { await abrirInicioApp(p); await abaApp(p, "Mensagens"); }, { espera: ["Nova mensagem"] });
  await j.passo("nova-mensagem-aberta", 'tocar "Nova mensagem"', tocar(BTN, "Nova mensagem"), { espera: ["Pedido de oração"] });
  await j.passo("pedido-de-oracao-aberto", 'tocar "Pedido de oração"', tocar(BTN, "Pedido de oração"), { espera: [/Vai para|Ainda não há um líder/] });
  await j.passo("pedido-digitado", "digitar o pedido", preencher("textarea.m6-ta", "Teste da captura: orem pela saúde da minha família, por favor."));
  const habilitado = await j.page.locator("button.pri", { hasText: "Enviar pedido" }).first().isEnabled().catch(() => false);
  if (!habilitado) {
    registrarNaoExiste("jornadas/M5-enviar-pedido", "M5 Pedir oração (Maria)", "O botão 'Enviar pedido' fica desabilitado: não há líder destinatário no app para a Maria (texto da folha: 'Ainda não há um líder no app para receber'). Print: jornadas/M5-pedir-oracao/04-pedido-digitado.png");
    j.obs("Enviar pedido desabilitado (sem líder destinatário); jornada para na folha preenchida");
    return;
  }
  await j.passo("pedido-enviado", 'tocar "Enviar pedido"', tocar("button", "Enviar pedido"), { espera: ["Pedido enviado"] });
  await j.passo("folha-fechada-mensagens", 'tocar "Fechar"', tocar("button", "Fechar", { exato: true }));
  await j.passo("conversa-do-pedido-aberta", "tocar na conversa criada", async (p) => { await p.locator("button.m-conv").first().click(); await p.waitForTimeout(700); }, { opcional: true });
});


// ---------------------------------------------------------------- M6 Caminhada
membro("M6", "caminhada", "Caminhada: próximo passo, curso e Quero servir", async (j) => {
  await j.passo("inicio-com-proximo-passo", "abrir /service (Início do app)", (p) => abrirInicioApp(p), { espera: ["Seu próximo passo"] });
  await j.passo("curso-aberto-pelo-proximo-passo", 'tocar "Continuar →" no cartão "Seu próximo passo"', async (p) => { const i = await p.evaluate(() => [...document.querySelectorAll(".m6-card")].findIndex((c) => /Seu próximo passo/.test(c.innerText))); await p.locator(".m6-card").nth(i).locator("button").first().click(); await p.waitForTimeout(700); }, { espera: ["MEUS CURSOS"] });
  // "Continuar →" dentro de Cursos: segundo o mapa não tem onClick
  const antes = await j.page.evaluate(() => document.body.innerText);
  await j.page.locator("button").first().click().catch(() => {}); await j.page.waitForTimeout(1200);
  const depois = await j.page.evaluate(() => document.body.innerText);
  if (antes === depois) { registrarNaoExiste("jornadas/M6-continuar-curso", "M6 Caminhada > Cursos", "Tocar 'Continuar →' no curso em andamento (Fundamentos da Fé) não muda nada na tela (sem aula, sem página do curso). Não há print desse toque. Não existe 'concluir aula' no app."); j.obs("'Continuar →' do curso não faz nada na tela (sem print); 'concluir aula' não existe"); }
  else await j.passo("continuar-do-curso-tocado", 'tocar "Continuar →" no curso', null);
  await j.passo("voltar-para-caminhada", "tocar em voltar", async (p) => { await p.locator("button.m6-back").first().click(); await p.waitForTimeout(600); await abaApp(p, "Caminhada"); }, { espera: ["Etapas"] });
  await j.passo("pedido-de-etapa-aberto", 'tocar "Já participo →" (etapa Grupo)', tocar("button", "Já participo"), { espera: ["Quando foi"] });
  await j.passo("pedido-de-etapa-fechado", "tocar fora da folha (fechar sem enviar)", async (p) => { await p.locator(".m6-scrim").first().click({ position: { x: 20, y: 40 } }); await p.waitForTimeout(500); }, { opcional: true });
  // segunda pessoa: caminho "Quero servir"
  await j.trocar(() => contextoApp("celular", "membro2"));
  await j.passo("membro2-inicio-card-servir", "entrar como membro2 e abrir /service", (p) => abrirInicioApp(p), { espera: ["Conhecer os times"] });
  await j.passo("times-que-procuram-aberto", 'tocar "Conhecer os times"', tocar("button", "Conhecer os times"), { espera: ["Quero servir neste time"] });
  await j.passo("quero-servir-tocado", 'tocar "Quero servir neste time" (Mídia)', async (p) => { const i = await p.evaluate(() => { const bs = [...document.querySelectorAll("button")]; return bs.findIndex((b) => { let a = b.parentElement; for (let k = 0; k < 4 && a; k++, a = a.parentElement) if (/Mídia/.test(a.innerText) && !/Louvor/.test(a.innerText)) return true; return false; }); }); await p.locator("button").nth(Math.max(i, 0)).click(); await p.waitForTimeout(1200); });
  await j.passo("caminhada-depois-do-pedido", 'fechar a folha e tocar na aba "Caminhada"', async (p) => { await p.keyboard.press("Escape"); const sc = p.locator(".m6-scrim").first(); if (await sc.isVisible().catch(() => false)) await sc.click({ position: { x: 20, y: 40 } }); await p.waitForTimeout(500); await abaApp(p, "Caminhada"); }, { espera: ["Etapas"], opcional: true });
});


// ---------------------------------------------------------------- M7 tamanho do texto
membro("M7", "tamanho-do-texto", "Tamanho do texto", async (j) => DEF.M10.fn(j));

// ---------------------------------------------------------------- M8 Kids
membro("M8", "kids-familia", "Kids: família até onde o app chega (Maria)", async (j) => {
  await j.passo("perfil", 'tocar na aba "Perfil"', async (p) => { await abrirInicioApp(p); await abaApp(p, "Perfil"); }, { espera: ["Minha família"] });
  await j.passo("minha-familia", 'tocar "Minha família"', tocar(BTN, "Minha família"), { espera: ["Minhas crianças"] });
  await j.passo("ficha-do-davi-aberta", "tocar no cartão do Davi", async (p) => { await p.locator("button.m-card", { hasText: "Davi" }).first().click(); await p.waitForTimeout(800); }, { espera: ["Autorizo"] });
  await j.passo("ficha-do-davi-fechada", "tocar de novo no cartão do Davi (recolher, sem salvar)", async (p) => { await p.locator("button.m-card", { hasText: "Davi" }).first().click(); await p.waitForTimeout(500); }, { opcional: true });
  await j.passo("adicionar-crianca-aberto", 'tocar "+ Adicionar criança" (sem salvar)', tocar("button.m-btn-swap", "Adicionar criança"), { opcional: true });
  await j.passo("checkin-kids-pela-rota", "abrir /service/kids-checkin (o check-in da criança só existe nessa rota, vinda de QR)", async (p) => { await p.goto("/service/kids-checkin", { waitUntil: "domcontentloaded" }); await p.waitForTimeout(1500); }, { opcional: true, semAuditoria: false });
  j.obs("não há botão de check-in da criança no app; capturada a rota /service/kids-checkin sem parâmetros");
});

// ---------------------------------------------------------------- M9 Sair
membro("M9", "sair-do-app", "Sair do app até a tela de login (Maria)", async (j) => {
  await j.passo("perfil", 'tocar na aba "Perfil"', async (p) => { await abrirInicioApp(p); await abaApp(p, "Perfil"); }, { espera: ["Sair do app"] });
  await j.passo("sair-confirmacao-aberta", 'tocar "Sair do app"', tocar(BTN, "Sair do app"), { espera: ["Cancelar"] });
  await j.passo("sair-cancelado", 'tocar "Cancelar"', tocar("button", "Cancelar"), { espera: ["Sair do app"] });
  await j.passo("sair-confirmacao-de-novo", 'tocar "Sair do app"', tocar(BTN, "Sair do app"), { espera: ["Cancelar"] });
  await j.passo("tela-de-login", 'tocar "Sair"', async (p) => { await clicarTexto(p, "button", "Sair", { exato: true }); await p.waitForURL(/\/login/, { timeout: 30000 }); await p.waitForTimeout(800); }, { permiteLogin: true });
  rmSync(arquivoAuth("celular", "membro"), { force: true }); // a sessão salva morreu com o "Sair": força novo login na próxima captura
});


// ---------------------------------------------------------------- L1 montar a escala
lider("L1", "montar-escala", "Montar a escala de um culto e acompanhar confirmações", async (j) => {
  await j.passo("painel-inicio", "abrir /service (painel da igreja)", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("escalas"), "escalas-abertas");
  await j.passo("evento-escolhido", "tocar no primeiro evento disponível", async (p) => { await p.locator("button.esc-event").first().click(); }, { espera: ["Louvor"] });
  const primeiraVagaLouvor = (p) => p.locator('xpath=//*[normalize-space(text())="Louvor"]/following::button[contains(@class,"esc-vaga")][1]');
  await j.passo("escalar-vaga-do-louvor-aberto", 'tocar "Escalar" na primeira vaga vazia do Louvor', async (p) => { await primeiraVagaLouvor(p).scrollIntoViewIfNeeded(); await primeiraVagaLouvor(p).click(); await p.waitForTimeout(700); }, { espera: ["ESCALAR"] });
  await j.passo("pessoa-escolhida-para-a-vaga", "tocar na primeira pessoa disponível da lista", async (p) => { await p.locator("button.cand", { hasText: "disponível" }).first().click(); await p.waitForTimeout(1500); }, { espera: ["Louvor"] });
  await j.passo("maria-aguardando-ficha-aberta", "tocar na Maria (Vocal) para ver o status", async (p) => { await p.locator("button.esc-person", { hasText: "Maria" }).first().scrollIntoViewIfNeeded(); await p.locator("button.esc-person", { hasText: "Maria" }).first().click(); await p.waitForTimeout(700); }, { opcional: true });
  await j.passo("ficha-fechada", "tocar fora da janela para fechar sem alterar", async (p) => { await p.locator(".modal-bg").first().click({ position: { x: 4, y: 4 } }); await p.waitForTimeout(500); }, { opcional: true });
  await j.passo("publicar-e-avisar-aberto", 'tocar "Publicar & avisar →"', async (p) => { const b = p.locator("button.btn-pri", { hasText: "Publicar & avisar" }).first(); await b.scrollIntoViewIfNeeded(); await b.click(); await p.waitForTimeout(600); }, { espera: ["Publicar e avisar"] });
  await j.passo("mensagem-digitada", "digitar o recado", async (p) => { const t = p.locator("textarea").last(); await t.click(); await t.fill("Teste da captura: escala do culto de quarta publicada."); });
  await j.passo("escala-publicada", 'tocar "Publicar e avisar →"', async (p) => { await clicarTexto(p, "button", "Publicar e avisar →"); await p.waitForTimeout(1500); });
}, { aceitarDialogos: true });


const campo = (rotulo, tipo = "input") => (p) => p.locator(`xpath=(//div[contains(@class,"modal")]//label[contains(normalize-space(.),"${rotulo}")]/following::${tipo}[1])`).first();
const digitarNoModal = (rotulo, valor, tipo = "input") => async (p) => { const l = campo(rotulo, tipo)(p); await l.click({ timeout: 8000 }); await l.fill(valor); };

// ---------------------------------------------------------------- L3 visitante
lider("L3", "registrar-visitante", "Registrar visitante e levá-lo à etapa seguinte", async (j) => {
  const nome = `Visitante Captura ${j.ap === "celular" ? "Celular" : "Desktop"}`;
  await j.passo("painel-inicio", "abrir /service (painel da igreja)", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("visitantes"), "visitantes-funil");
  await j.passo("novo-visitante-aberto", 'tocar "+ Visitante"', tocar("button", "+ Visitante"), { espera: ["Registrar visitante"] });
  await j.passo("nome-digitado", "digitar o nome", digitarNoModal("Nome", nome));
  await j.passo("telefone-digitado", "digitar o telefone", digitarNoModal("Telefone", "(11) 95555-0101"));
  await j.passo("lista-de-origens-aberta", 'tocar em "Como chegou"', async (p) => { await p.locator(".modal .sel-trigger").first().click(); await p.waitForTimeout(400); }, { espera: ["Instagram"] });
  await j.passo("origem-escolhida", 'tocar em "Instagram"', async (p) => { await p.locator(".modal button.sel-opt", { hasText: "Instagram" }).first().click(); await p.waitForTimeout(400); });
  await j.passo("visitante-registrado", 'tocar "Registrar visitante"', async (p) => { await clicarTexto(p, "button", "Registrar visitante", { exato: true }); await esperarTexto(p, nome, 20000); }, { espera: [nome] });
  await j.passo("ficha-do-visitante-aberta", "tocar no cartão do visitante", async (p) => { await p.getByText(nome, { exact: false }).first().scrollIntoViewIfNeeded(); await p.getByText(nome, { exact: false }).first().click(); await p.waitForTimeout(800); }, { espera: ["Avançar para"] });
  await j.passo("etapa-avancada", 'tocar "Avançar para ... →"', async (p) => { await clicarTexto(p, "button", "Avançar para"); await p.waitForTimeout(1500); });
}, { aceitarDialogos: false });

// ---------------------------------------------------------------- L4 convite do app
lider("L4", "cadastrar-e-convidar", "Cadastrar pessoa e mandar convite do app até o convite válido", async (j) => {
  const sufixo = j.ap === "celular" ? "Celular" : "Desktop";
  const nome = `Convidado Captura ${sufixo}`;
  const dados = { link: null };
  j.page.on("response", async (r) => { if (/\/api\/service\/members\/invite/.test(r.url()) && r.request().method() === "POST") { try { dados.link = (await r.json()).link; } catch {} } });
  await j.passo("painel-inicio", "abrir /service (painel da igreja)", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("membros"), "pessoas-abertas");
  await j.passo("novo-membro-aberto", 'tocar "+ Novo membro"', tocar("button", "+ Novo membro"), { espera: ["Adicionar membro"] });
  await j.passo("nome-digitado", "digitar nome e sobrenome", digitarNoModal("Nome e sobrenome", nome));
  await j.passo("telefone-digitado", "digitar o telefone", digitarNoModal("Telefone", j.ap === "celular" ? "(11) 94444-0202" : "(11) 94444-0303"));
  await j.passo("membro-adicionado-convite-gerado", 'tocar "Adicionar membro" (gera o convite e abre o WhatsApp)', async (p) => { await clicarTexto(p, "button", "Adicionar membro", { exato: true }); await esperarTexto(p, nome, 25000); for (let i = 0; i < 20 && !dados.link; i++) await p.waitForTimeout(500); }, { espera: [nome] });
  if (!dados.link) throw new Error("o POST /api/service/members/invite não devolveu link");
  const u = new URL(dados.link);
  const caminho = u.pathname + u.search;
  writeFileSync(join(SAIDA, "jornadas", `L4-cadastrar-e-convidar`, `convite-${j.ap}.txt`), `link gerado: ${dados.link}\ncaminho usado no app local: ${caminho}\n`);
  await j.trocar(() => criarContexto(j.ap, {}));
  await j.passo("convite-valido", "abrir o link do convite (sem login)", async (p) => { await p.goto(caminho, { waitUntil: "domcontentloaded" }); await esperarTexto(p, "Que bom ter você", 40000); }, { permiteLogin: true, espera: ["Que bom ter você"] });
  await tirarPrint(j.page, { pasta: "telas", nome: `${j.ap}-05-entrada-convite-valido`, conta: null, papel: "convidado (sem login)", tela: "Convite válido", cliques: ["abrir o link do convite gerado por POST /api/service/members/invite"], componente: "app/service/convite/page.tsx:15", espera: ["Que bom ter você"], permiteLogin: true });
}, {
  abrir: async (ap) => { const par = await contextoGestao(ap, "master"); await par.ctx.route(/wa\.me/, (r) => r.fulfill({ contentType: "text/html", body: "<html><body>wa.me (bloqueado na captura)</body></html>" })); return par; },
});

// ---------------------------------------------------------------- L5 check-in por QR
lider("L5", "checkin-por-qr", "Check-in do culto por QR: do painel até a presença confirmada", async (j) => {
  const dados = {};
  await j.passo("painel-inicio", "abrir /service (painel da igreja)", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("cultos"), "cultos-e-agenda");
  await j.passo("checkin-qr-aberto", 'tocar "Check-in QR" no primeiro evento disponível', async (p) => { await p.getByRole("button", { name: /Check-in QR/ }).first().click(); }, { espera: ["Check-in"] });
  await j.passo("aba-presenca", 'tocar na aba "Presença"', async (p) => { await clicarTexto(p, ".modal button, .modal [role=tab]", "Presença"); await p.waitForTimeout(600); }, { opcional: true });
  await j.passo("aba-qr-de-novo", 'tocar na aba do QR', async (p) => { await clicarTexto(p, ".modal button, .modal [role=tab]", /qr/i, { nth: 0 }); await p.waitForTimeout(600); }, { opcional: true });
  await j.page.waitForTimeout(1500);
  dados.link = (await j.page.locator("span.ck-link-txt").first().innerText().catch(() => "")).trim(); // lido depois que o token foi gerado
  await j.passo("simular-leitura-presenca-confirmada", 'tocar "Simular leitura (abrir como voluntário) →"', async (p) => { await clicarTexto(p, "button", "Simular leitura"); await p.waitForTimeout(1500); }, { espera: [/Presença confirmada|confirmad/i] });
  if (dados.link) {
    const u = new URL(dados.link.startsWith("http") ? dados.link : "http://localhost:3000" + dados.link);
    const caminho = u.pathname + u.search;
    await j.trocar(() => contextoApp(j.ap, "membro"));
    await j.passo("rota-checkin-lida-como-voluntaria", "a Maria (escalada) lê o QR: abrir /service/checkin?event=...", async (p) => { await p.goto(caminho, { waitUntil: "domcontentloaded" }); await esperarTexto(p, "resen", 30000); });
  } else j.obs("link do QR (span.ck-link-txt) não encontrado: rota /service/checkin não aberta");
});

// ---------------------------------------------------------------- L6 cor e logo
lider("L6", "cor-e-logo", "Trocar cor e logo da igreja e ver o app do membro", async (j) => {
  const cfg = tela("config");
  await j.passo("painel-inicio", "abrir /service (painel da igreja)", (p) => abrirInicioPainel(p));
  await menuPara(j, cfg, "configuracoes-abertas");
  await j.passo("personalizacao-aberta", 'tocar em "Personalização"', async (p) => { await abrirConfigAba(p, { label: "Personalização" }); }, { espera: ["Cor da igreja"] });
  await j.passo("cor-roxo-escolhida-previa", 'tocar na cor "Roxo"', tocar("button.seg-chip", "Roxo"));
  await j.passo("logo-enviada", 'tocar "Enviar imagem" e escolher logo-teste.png', async (p) => { await p.locator('input[type="file"]').first().setInputFiles(join(DIR_FERRAMENTA, "logo-teste.png")); await p.waitForTimeout(2500); });
  await j.passo("depois-do-envio-da-logo", "(depois do recorte, se houver) confirmar", async (p) => { const b = p.locator("button", { hasText: /^(Usar|Confirmar|Salvar|Recortar|Aplicar|Cortar)/i }).first(); if (await b.isVisible().catch(() => false)) { await b.click(); await p.waitForTimeout(3000); } }, { opcional: true });
  await j.passo("personalizacao-salva", 'tocar "Salvar personalização"', async (p) => { await clicarTexto(p, "button", "Salvar personalização"); await esperarTexto(p, "Salvo!", 15000).catch(() => {}); }, { espera: [/Salvo|Salvar/] });
  await j.trocar(() => contextoApp(j.ap, "membro"));
  await j.passo("app-do-membro-com-a-nova-identidade", "abrir o app da Maria (/service)", (p) => abrirInicioApp(p), { espera: ["Para você agora"] });
  await j.passo("perfil-do-membro", 'tocar na aba "Perfil"', (p) => abaApp(p, "Perfil"), { espera: ["Perfil"] });
});

// ---------------------------------------------------------------- Jornadas v7
membro("M10", "sete-tamanhos", "Trocar o texto nas sete posições", async (j) => {
  await j.passo("perfil", "abrir Perfil", async (p) => { await abrirInicioApp(p); await abaApp(p, "Perfil"); });
  await j.passo("controle", "abrir Tamanho do texto", tocar("button", "Tamanho do texto"));
  const slider = j.page.getByRole("slider", { name: "Tamanho do texto" });
  const original = Number(await slider.getAttribute("aria-valuenow"));
  try {
    for (let pos = 1; pos <= 7; pos++) await j.passo(`posicao-${pos}`, `ajustar texto para posição ${pos} pelo teclado`, async () => {
      await slider.press("Home");
      for (let n = 1; n < pos; n++) await slider.press("ArrowRight");
      if (Number(await slider.getAttribute("aria-valuenow")) !== pos) throw new Error("Tamanho não mudou");
    });
  } finally {
    await slider.press("Home");
    for (let n = 1; n < original; n++) await slider.press("ArrowRight");
  }
});
membro("M11", "destaque-video", "Abrir destaque com vídeo", async (j) => {
  await j.passo("inicio", "abrir o app", (p) => abrirInicioApp(p));
  await j.passo("destaque", "tocar no destaque com vídeo", tocar("button.m6-destaque", "vídeo"));
  await j.passo("video", "conferir o vídeo na página aberta", async (p) => {
    await p.locator(".m6-video iframe").waitFor({ state: "visible" });
    const src = await p.locator(".m6-video iframe").getAttribute("src");
    if (!src?.startsWith("https://")) throw new Error("Vídeo sem endereço HTTPS");
  });
});
lider("L7", "configurar-igreja", "Salvar e reler os dados da igreja", async (j) => {
  await j.passo("inicio", "abrir painel", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("config"), "configuracoes");
  await j.passo("dados", "abrir Dados da igreja", (p) => abrirConfigAba(p, { label: "Dados da igreja" }));
  const nome = j.page.getByLabel("Nome da igreja", { exact: true });
  const original = await nome.inputValue();
  try {
    await j.passo("editar", "acrescentar marca de teste ao nome", () => nome.fill(`${original.slice(0, 60)} (captura)`));
    await j.passo("salvar", "salvar os dados", tocar("button", "Salvar", { exato: true }));
    await j.passo("reler", "reabrir Configurações e reler o nome", async (p) => {
      await abrirInicioPainel(p); await clicarTexto(p, "button.sb-link", "Configurações");
      await abrirConfigAba(p, { label: "Dados da igreja" });
      if (!(await nome.inputValue()).endsWith(" (captura)")) throw new Error("Nome não persistiu");
    });
  } finally {
    if (await nome.isVisible()) { await nome.fill(original); await clicarTexto(j.page, "button", "Salvar", { exato: true }); }
  }
});
lider("L8", "saude", "Abrir a Saúde da igreja e alterar período", async (j) => {
  await j.passo("inicio", "abrir painel", (p) => abrirInicioPainel(p), { espera: ["Saúde da igreja"] });
  const mais = j.page.getByRole("button", { name: /Ver o panorama/ });
  if (await mais.isVisible()) await j.passo("panorama", "abrir panorama", () => mais.click());
  await j.passo("noventa-dias", "trocar período para 90 dias", tocar('[role="radio"]', "90 dias"));
  const numero = j.page.locator("button.saude-n:not(:disabled)").first();
  await j.passo("pessoas", "abrir lista de um indicador", () => numero.click());
});
lider("L9", "registrar-cuidado", "Registrar contato na lista de cuidado", async (j) => {
  await j.passo("inicio", "abrir painel", (p) => abrirInicioPainel(p));
  await j.passo("registrar", "abrir registro de contato", tocar("button", "Registrar contato", { nth: 0 }));
  await j.passo("mensagem", "registrar contato por mensagem", tocar("button", "Mensagem", { exato: true }), { espera: ["Contato registrado"] });
});
lider("L10", "aviso-lembrete", "Publicar aviso com lembrete em 24h", async (j) => {
  const titulo = `Captura Q1 ${Date.now()}`;
  await j.passo("inicio", "abrir painel", (p) => abrirInicioPainel(p));
  await menuPara(j, tela("comunicacao"), "mural");
  await j.passo("novo", "abrir nova publicação", tocar("button", "Nova publicação"));
  await j.passo("conteudo", "preencher título e mensagem", async (p) => {
    await p.getByLabel("Título", { exact: true }).fill(titulo);
    await p.getByLabel("Mensagem", { exact: true }).fill("Aviso de teste local da captura Q1.");
    const publico = p.getByRole("combobox", { name: "Para quem" });
    await publico.click(); await p.getByRole("option").first().click();
  });
  await j.passo("canal", "abrir canais e lembrete", tocar("summary", "Canais"));
  await j.passo("lembrete", "escolher Em 24h", tocar("button", "Em 24h", { exato: true }));
  await j.passo("revisar", "revisar publicação", tocar("button", "Revisar publicação", { exato: true }), { espera: ["Lembrete:"] });
  await j.passo("publicar", "publicar aviso", tocar("button", "Publicar", { exato: true }));
  await j.passo("reler", "reabrir Mural e conferir aviso publicado", async (p) => {
    await abrirInicioPainel(p); await clicarTexto(p, "button.sb-link", "Mural");
    await esperarTexto(p, titulo, 15000);
  });
  j.obs("Agendamento conferido pela interface. Disparo do cron e destinatários exigem a matriz autenticada da Q3; não testados nesta captura.");
});

// ---------------------------------------------------------------- execução
export async function rodar({ aparelhos, args = {} }) {
  let alvo = args.j ? String(args.j).split(",").flatMap((c) => (c === "L2" ? ["L2a", "L2b"] : [c])) : ORDEM;
  alvo = ORDEM.filter((c) => alvo.includes(c));
  for (const cod of alvo) {
    const d = DEF[cod];
    if (!d) { console.log(`jornada ${cod} ainda não implementada`); continue; }
    const aps = d.tipo === "M" ? ["celular"].filter((a) => aparelhos.includes(a)) : aparelhos;
    for (const ap of aps) {
      const conta = d.conta ?? (d.tipo === "L" ? "master" : "membro");
      const subpasta = d.tipo === "L";
      const inicio = d.parte === "b" ? proximoNumero(d.codigo.replace(/[ab]$/, ""), d.nome, ap, subpasta) : 1;
      await jornada({
        codigo: d.codigo.replace(/[ab]$/, ""), nome: d.nome, titulo: d.titulo, ap, conta, papel: d.tipo === "L" ? "master (painel)" : "membro (app)",
        abrir: d.abrir ? () => d.abrir(ap) : d.antes ? async () => { await d.antes(); return contextoApp(ap, conta); } : d.tipo === "L" ? () => contextoGestao(ap, conta) : () => contextoApp(ap, conta),
        corpo: d.fn, subpasta, inicio, chave: d.codigo, aceitarDialogos: !!d.aceitarDialogos,
      });
    }
  }
}
