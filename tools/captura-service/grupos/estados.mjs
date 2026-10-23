// 3.3 Estados internos de cada tela (abas, criação aberta sem salvar, detalhe, confirmações) + estado vazio com outra@.
import { TELAS, CFG_TABS, tela, antes } from "../lib/catalogo.mjs";
import { contextoGestao } from "../lib/sessoes.mjs";
import { irPara, clicarTexto, abrirPainel, abrirConfigAba } from "../lib/nav.mjs";
import { tirarPrint, registrarDialogo } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";
import { telaBase, configCompleta, pad } from "../lib/painelkit.mjs";

// passos: B = botão/link por texto; S = seletor css (nth); SEG = botão dentro de seletor
const B = (txt, o = {}) => ({ d: `clicar "${txt}"`, f: (p) => clicarTexto(p, "button, a, summary", txt, o) });
const BX = (txt) => B(txt, { exato: true });
const S = (sel, nth = 0) => ({ d: `clicar ${sel}${nth ? `[${nth}]` : ""}`, f: async (p) => { await p.locator(sel).nth(nth).scrollIntoViewIfNeeded().catch(() => {}); await p.locator(sel).nth(nth).click({ timeout: 8000 }); await p.waitForTimeout(400); } });
const IN = (sel, txt, o = {}) => ({ d: `clicar "${txt}" em ${sel}`, f: (p) => clicarTexto(p, sel, txt, o) });
const MAIS = (item, rotulo = "Mais") => [IN('button[aria-haspopup="menu"]', rotulo), B(item)];

const T = (id, estados) => ({ t: tela(id), estados });
const ESTADOS = [
  T("membros", [["seg-membros", [IN("div.seg button", "Membros")]], ["seg-voluntarios", [IN("div.seg button", "Voluntários")]], ["seg-lideres", [IN("div.seg button", "Líderes")]], ["seg-novos", [IN("div.seg button", "Novos")]], ["criar", [B("+ Novo membro")]], ["detalhe", [S("button.tr.click")]]]),
  T("visitantes", [["seg-lista", [IN("div.seg button", "Lista")]], ["seg-painel", MAIS("Indicadores de visitantes", "Mais opções")], ["seg-regras", MAIS("Regras de acolhimento", "Mais opções")], ["regras-ajustar", [...MAIS("Regras de acolhimento", "Mais opções"), BX("Ajustar")]], ["criar", [BX("Registrar visitante")]], ["detalhe", [S("button.vcard-open")]]]),
  T("criancas", [["turma-1", [S("div.seg button", 1)]], ["turma-2", [S("div.seg button", 2)]], ["criar", [B("+ Nova criança")]], ["detalhe", [S("button.tr.click")]], ["evento-criar", [B("+ Criar evento")]]]),
  T("grupos", [["criar", [B("+ Novo grupo")]], ["remover-confirmacao", [BX("Remover")]]]),
  T("times", [["criar", [B("+ Novo time")]], ["detalhe", [S("button.team-card")]], ["editar-funcoes", [S("button.team-card"), BX("Editar")]]]),
  T("escalas", [["outro-culto", [S("button.esc-event", 1)]], ["escalar-vaga", [S("button.esc-vaga")]], ["pessoa-escalada", [{ d: "selecionar evento com pessoa escalada", f: async (p) => { const eventos = p.locator("button.esc-event"); for (let i = 0; i < await eventos.count(); i++) { await eventos.nth(i).click(); await p.waitForTimeout(400); const pessoa = p.locator("button.esc-person:visible").first(); if (await pessoa.isVisible()) { await pessoa.click(); return; } } throw new Error("Nenhum evento da fixture tem pessoa escalada visível"); } }]], ["delegar", MAIS("Delegar a gestão")], ["qr-checkin", MAIS("QR do check-in")], ["publicar-e-avisar", [B("Publicar e avisar")]], ["como-gerar", [S("details.esc-gerar summary")]], ["editar-funcoes", [S("button.esc-col-edit")]]]),
  T("ensaios", [["criar", [B("+ Novo ensaio")]], ["detalhe", [S("button.ens-card")]]]),
  T("reunioes", [["criar", [B("+ Marcar reunião")]], ["detalhe", [S("button.reu-card")]]]),
  T("cultos", [["seg-mes", [IN("div.seg button", "Mês")]], ["criar", [B("+ Novo culto")]], ["detalhe", [S("button.panel.click")]], ["checkin-qr", [B("Check-in QR")]], ["kids-menu", [BX("Kids")]], ["setup-celebracao", [B("Arte")]]]),
  T("espacos", [["nova-sala", [B("+ Nova sala")]], ["reservar", [B("+ Reservar espaço")]], ["filtro-sala", [S("button.sala-card")]]]),
  T("comunicacao", [["criar", [B("+ Nova publicação")]], ["ver-quem-leu", [B("Ver quem leu")]], ["automaticas-ajustar", [BX("Ajustar")]]]),
  T("conversas", [["nova-conversa", [B("+ Nova conversa")]], ["nova-em-grupo", [B("+ Nova conversa"), IN("button", "Em grupo")]]]),
  T("pesquisas", [["criar", [B("+ Nova pesquisa")]], ["excluir-confirmacao", [BX("Excluir")]]]),
  T("pagina", [["aba-modelo", [IN("button.cfg-tab", "Modelo")]], ["aba-aparencia", [IN("button.cfg-tab", "Aparência")]], ["aba-links", [IN("button.cfg-tab", "Links")]], ["aba-redes-sociais", [IN("button.cfg-tab", "Redes sociais")]], ["aba-noticias", [IN("button.cfg-tab", "Notícias")]], ["link-novo", [IN("button.cfg-tab", "Links"), B("+ Link")]]]),
  T("cursos", [["filtro-trilhas", [IN(".cursos-filtros button", "Trilhas")]], ["filtro-conteudo", [IN(".cursos-filtros button", "Conteúdo")]], ["filtro-presenciais", [IN(".cursos-filtros button", "Presenciais")]], ["organizar", [IN(".cursos-filtros button", "Organizar")]], ["criar-trilha", [B("+ Nova trilha")]], ["detalhe", [S("button.team-card")]], ["qr-presenca", [S("button.team-card"), B("QR de presença")]], ["matricular", [S("button.team-card"), B("+ Matricular pessoa")]]]),
  T("batismos", [["criar", [B("+ Nova turma")]], ["detalhe", [S("button.bat-card")]], ["adicionar-candidato", [S("button.bat-card"), B("+ Adicionar candidato")]]]),
  T("quadros", [["criar", [B("+ Novo quadro")]]]),
  T("identidade", [["editar", [BX("Editar")]], ["editar-valores", [B("Editar valores")]], ["novo-ciclo", [B("+ Novo ciclo")]]]),
  T("historia", [["adicionar-capitulo", [B("+ Adicionar capítulo")]]]),
];
const ESTADOS_CFG = [
  ["igreja", "editado-com-barra-salvar", () => [{ d: "digitar no 1º campo (sem salvar)", f: async (q) => { const i = q.locator(".cfg-main input[type=text], .cfg-main input:not([type])").first(); await i.click(); await i.press("End"); await i.type(" "); await q.waitForTimeout(400); } }]],
  ["rede", "gerir-congregacao", () => [B("Gerir")]],
  ["rede", "adicionar-congregacao", () => [B("+ Adicionar congregação")]],
  ["operacao", "tipo-de-evento-adicionar", () => [B("Adicionar")]],
  ["kids", "nova-turma", () => [B("+ Nova turma")]],
  ["perm", "papel-2", () => [S('button[role="tab"].pmx-mob-role', 1)]],
  ["perm", "papel-3", () => [S('button[role="tab"].pmx-mob-role', 2)]],
  ["acessos", "pessoa-selecionada", () => [S("button.flag-row", 1)]],
];

async function rodarPassos(page, passos) {
  const cliques = [];
  const antesD = page.__col.dialogos.length;
  for (const s of passos) { await s.f(page); cliques.push(s.d); }
  return { cliques, dialogos: page.__col.dialogos.slice(antesD) };
}

export async function rodar({ aparelhos, args = {} }) {
  const filtro = args.nome ? String(args.nome) : null; // --nome=<trecho> refaz só os estados cujo arquivo contém o trecho
  for (const ap of aparelhos) {
    const { ctx, page } = await contextoGestao(ap, "master");
    try {
      for (const { t, estados } of ESTADOS) {
        for (const [estado, passos] of estados) {
          const nome = `${ap}-${pad(t.n)}-estados-${t.nome}--${estado}`;
          if (filtro && !filtro.split(",").some((f) => nome.includes(f))) continue;
          await tentar(`estados/${nome}.png`, { page, tela: `${t.label} / ${estado}`, passo: passos.map((s) => s.d).join(" > ") }, async () => {
            await abrirPainel(page, /./);
            const c0 = await irPara(page, t);
            const { cliques, dialogos } = await rodarPassos(page, passos);
            const meta = { pasta: "estados", nome, conta: "master@teste.local", papel: "master", tela: t.label, estado, cliques: [...c0, ...cliques], componente: t.comp, antes: antes(ap, t.antes), aparelho: ap };
            if (passos.some((s) => s.dialogo)) {
              if (dialogos.length) registrarDialogo(meta, dialogos); else throw new Error("confirmação nativa não apareceu");
            } else await tirarPrint(page, meta);
          });
        }
      }
      // estados das abas de Configurações
      for (const [id, estado, mk] of ESTADOS_CFG) {
        const tab = CFG_TABS.find((x) => x.id === id);
        if (id === "perm" && ap === "desktop") continue; // matriz só no desktop, abas por papel só no celular
        const nome = `${ap}-${pad(tab.n)}-estados-${tab.nome}--${estado}`;
        if (filtro && !filtro.split(",").some((f) => nome.includes(f))) continue;
        await tentar(`estados/${nome}.png`, { page, tela: `${tab.label} / ${estado}`, passo: estado }, async () => {
          await abrirPainel(page, /./);
          const c0 = await irPara(page, tela("config"));
          const c1 = await abrirConfigAba(page, tab);
          const { cliques } = await rodarPassos(page, mk());
          await tirarPrint(page, { pasta: "estados", nome, conta: "master@teste.local", papel: "master", tela: `Configurações > ${tab.label}`, estado, cliques: [...c0, ...c1, ...cliques], componente: tab.comp, antes: antes(ap, tab.antes) });
        });
      }
    } finally { await ctx.close(); }

    if (filtro && !filtro.includes("vazio")) continue;
    // estado vazio: outra@teste.local vê as mesmas telas
    const o = await contextoGestao(ap, "outra");
    try {
      await abrirPainel(o.page, /./);
      for (const t of TELAS) await telaBase(o.page, { ap, conta: "outra@teste.local", papel: "master da Outra Igreja Local (só a conta gestora)", t, pasta: "estados", grupo: "estados", sufixo: t.id === "membros" ? "--so-conta-gestora" : "--vazio", estado: t.id === "membros" ? "só a conta gestora" : "vazio" });
      await configCompleta(o.page, { ap, conta: "outra@teste.local", papel: "master da Outra Igreja Local (só a conta gestora)", pasta: "estados", sufixo: "--vazio", estado: "vazio" });
    } finally { await o.ctx.close(); }
  }
}
