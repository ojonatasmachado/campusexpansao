// 3.5 App do membro (toques reais): membro@ (todas as abas e subtelas), membro2@ (Início, Agenda, Caminhada), lider@ (Perfil com a porta do painel).
import { contextoApp } from "../lib/sessoes.mjs";
import { antes, ANTES_APP } from "../lib/catalogo.mjs";
import { abaApp, clicarTexto } from "../lib/nav.mjs";
import { esperar, tirarPrint } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";
import { pad } from "../lib/painelkit.mjs";

const MA = "app/service/MobileApp.tsx";
const tab = (n) => ({ d: `aba ${n}`, f: (p) => abaApp(p, n) });
const lnk = (txt, o = {}) => ({ d: `tocar "${txt}"`, f: (p) => clicarTexto(p, "button, a, .m6-row, [role=button]", txt, o) });
const sel = (s, nth = 0) => ({ d: `tocar ${s}`, f: async (p) => { await p.locator(s).nth(nth).scrollIntoViewIfNeeded().catch(() => {}); await p.locator(s).nth(nth).click({ timeout: 8000 }); await p.waitForTimeout(500); } });
const seg = (txt) => ({ d: `segmento "${txt}"`, f: (p) => clicarTexto(p, '.m6-seg button, [role="radio"]', txt) });

const MEMBRO = [
  ["inicio", "Início", `${MA}:2591`, ANTES_APP.inicio, [], ["Boa noite|Bom dia|Boa tarde"]],
  ["agenda-minha-escala", "Agenda > Minha escala", `${MA}:2704`, ANTES_APP.agenda, [tab("Agenda")], ["Minha escala"]],
  ["agenda-igreja", "Agenda > Igreja", `${MA}:2806`, ANTES_APP.agenda, [tab("Agenda"), seg("Igreja")], []],
  ["mensagens", "Mensagens", `${MA}:441`, ANTES_APP.mensagens, [tab("Mensagens")], ["Nova mensagem"]],
  ["mural", "Mensagens > Mural", `${MA}:2878`, ANTES_APP.mensagens, [tab("Mensagens"), lnk("Mural da igreja")], []],
  ["conversa-aberta", "Mensagens > conversa aberta", `${MA}:441`, ANTES_APP.mensagens, [tab("Mensagens"), sel("button.m-conv")], []],
  ["nova-mensagem", "Mensagens > Nova mensagem (folha)", `${MA}:3247`, null, [tab("Mensagens"), lnk("Nova mensagem")], ["Pedido de oração"]],
  ["pedido-de-oracao", "Pedido de oração (folha)", `${MA}:2552`, null, [tab("Mensagens"), lnk("Nova mensagem"), lnk("Pedido de oração")], []],
  ["falar-com-lider", "Nova mensagem > Falar com um líder", `${MA}:3249`, null, [tab("Mensagens"), lnk("Nova mensagem"), lnk("Falar com um líder")], []],
  ["caminhada", "Caminhada", `${MA}:2986`, ANTES_APP.caminhada, [tab("Caminhada")], ["Etapas"]],
  ["cursos", "Caminhada > Cursos", `${MA}:1277`, ANTES_APP.caminhada, [tab("Caminhada"), lnk("Continuar →")], []],
  ["biblia-livros", "Bíblia > livros", `${MA}:665`, null, [tab("Caminhada"), lnk("Ler a Bíblia")], ["Gênesis"]],
  ["biblia-capitulos", "Bíblia > capítulos", `${MA}:665`, null, [tab("Caminhada"), lnk("Ler a Bíblia"), sel("button.bib-book")], ["Livros"]],
  ["biblia-leitor", "Bíblia > leitor", `${MA}:665`, null, [tab("Caminhada"), lnk("Ler a Bíblia"), sel("button.bib-book"), sel("button.bib-chapter")], ["No princípio"]],
  ["biblia-versiculo", "Bíblia > versículo aberto", `${MA}:665`, null, [tab("Caminhada"), lnk("Ler a Bíblia"), sel("button.bib-book"), sel("button.bib-chapter"), sel("button.bib-verse", 2)], []],
  ["biblia-marcacoes", "Bíblia > minhas marcações", `${MA}:665`, null, [tab("Caminhada"), lnk("Ler a Bíblia"), sel("button.bib-marks-cta")], []],
  ["perfil", "Perfil", `${MA}:1595`, ANTES_APP.perfil, [tab("Perfil")], ["Meus dados"]],
  ["perfil-dados", "Perfil > Meus dados", `${MA}:1669`, ANTES_APP.perfil, [tab("Perfil"), lnk("Meus dados")], []],
  ["perfil-senha", "Perfil > Trocar senha", `${MA}:1704`, ANTES_APP.perfil, [tab("Perfil"), lnk("Trocar senha")], []],
  ["perfil-familia", "Perfil > Minha família", `${MA}:2063`, ANTES_APP.perfil, [tab("Perfil"), lnk("Minha família")], []],
  ["conheca-o-app", "Perfil > Conheça o app", `${MA}:1823`, null, [tab("Perfil"), lnk("Conheça o app")], []],
  ["sair-do-app", "Perfil > Sair do app (confirmação aberta)", `${MA}:1787`, null, [tab("Perfil"), lnk("Sair do app")], ["Cancelar"]],
];
const MEMBRO2 = [
  ["inicio", "Início", `${MA}:2591`, ANTES_APP.inicio, [], []],
  ["agenda", "Agenda", `${MA}:2704`, ANTES_APP.agenda, [tab("Agenda")], []],
  ["caminhada", "Caminhada", `${MA}:2986`, ANTES_APP.caminhada, [tab("Caminhada")], []],
  ["times-que-procuram", "Início > Conhecer os times (folha)", `${MA}:2976`, null, [lnk("Conhecer os times")], []],
];

async function lista(ap, conta, papel, itens, grupo, start = 1, { gestao = false, filtro = null } = {}) {
  const { ctx, page } = await contextoApp(ap, conta, { gestao });
  try {
    let n = start;
    for (const [nome0, tela, comp, ant, passos, espera] of itens) {
      const nome = `${ap}-${pad(n++)}-${grupo}-${nome0}`;
      if (filtro && !filtro.split(",").some((f) => nome.includes(f))) continue;
      await tentar(`telas/${nome}.png`, { tela, passo: passos.map((s) => s.d).join(" > ") || "abrir /service" }, async () => {
        await page.goto("/service", { waitUntil: "domcontentloaded" });
        await page.locator("nav.m-tab").first().waitFor({ timeout: 20000 });
        await esperar(page);
        const cliques = [];
        for (const s of passos) { await s.f(page); cliques.push(s.d); }
        await tirarPrint(page, { pasta: "telas", nome, conta: `${conta}@teste.local`, papel, tela, cliques: cliques.length ? cliques : ["abrir /service (app do membro)"], componente: comp, antes: antes(ap, ant), semExpandir: nome0 === "biblia-versiculo", espera: espera.map((e) => (e.includes("|") ? new RegExp(e, "i") : e)) });
      });
    }
  } finally { await ctx.close(); }
}

export async function rodar({ aparelhos, args = {} }) {
  const filtro = args.nome ? String(args.nome) : null; // --nome=<trecho>: refaz só os arquivos que contêm o trecho
  for (const ap of aparelhos) {
    await lista(ap, "membro", "membro", MEMBRO, "membro", 1, { filtro });
    await lista(ap, "membro2", "membro", MEMBRO2, "membro2", 1, { filtro });
    await lista(ap, "lider", "lider (app do membro com a porta para o painel)", [["perfil", "Perfil do líder (porta para o painel)", `${MA}:1774`, ANTES_APP.perfil, [tab("Perfil")], ["Abrir o painel da igreja"]]], "lider", 1, { gestao: true, filtro });
  }
}
