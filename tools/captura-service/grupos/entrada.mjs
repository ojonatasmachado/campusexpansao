// 3.1 Entrada sem login (cada tela em contexto novo, sem cookies).
import { criarContexto } from "../lib/contexto.mjs";
import { SLUG } from "../lib/config.mjs";
import { antes, ANTES_ENTRADA } from "../lib/catalogo.mjs";
import { tirarPrint, esperar } from "../lib/print.mjs";
import { tentar } from "../lib/runner.mjs";
import { clicarTexto } from "../lib/nav.mjs";

const ETAPA_LOGIN = "app/service/login/LoginForm.tsx:14";
const TELAS = [
  { n: 1, nome: "login-gestao", url: "/service/login", tela: "Login gestão", espera: ["Entrar no Service"], comp: ETAPA_LOGIN, antes: ANTES_ENTRADA.login, permiteLogin: true },
  { n: 2, nome: "login-igreja", url: `/${SLUG}/entrar`, tela: "Login com identidade da igreja", espera: ["Entrar", "Igreja Teste Local"], comp: "app/[slug]/entrar/page.tsx:14", antes: ANTES_ENTRADA.igreja, permiteLogin: true },
  { n: 3, nome: "convite-expirado", url: "/service/convite?t=invalido", tela: "Convite expirado ou inválido", espera: ["Este convite não vale mais"], comp: "app/service/convite/page.tsx:15", antes: ANTES_ENTRADA.convite },
  { n: 4, nome: "senha-nova-link-invalido", url: "/service/nova-senha", tela: "Nova senha com link inválido", espera: ["Este link não vale mais"], comp: "app/service/nova-senha/NovaSenhaForm.tsx:38", antes: ANTES_ENTRADA.senha },
  { n: 5, nome: "onboarding", url: "/service/onboarding", tela: "Onboarding (sem sessão)", estado: "sem sessão: redireciona ao login", comp: "app/service/onboarding/page.tsx:36", permiteLogin: true, espera: ["Entrar"] },
  { n: 6, nome: "conexao", url: "/service/conexao", tela: "Conexão (diagnóstico)", espera: ["Teste de conexão"], comp: "app/service/conexao/page.tsx:57", permiteLogin: true },
  { n: 7, nome: "checkin", url: "/service/checkin", tela: "Check-in de escala (sem parâmetros, sem sessão)", estado: "sem sessão: redireciona", comp: "app/service/checkin/page.tsx:21", permiteLogin: true, espera: ["Entrar"] },
  { n: 8, nome: "kids-checkin", url: "/service/kids-checkin", tela: "Check-in Kids (sem parâmetros, sem sessão)", estado: "sem sessão: redireciona", comp: "app/service/kids-checkin/page.tsx:10", permiteLogin: true, espera: ["Entrar"] },
  { n: 9, nome: "aula-checkin", url: "/service/aula-checkin", tela: "Check-in de aula (sem parâmetros, sem sessão)", estado: "sem sessão: redireciona", comp: "app/service/aula-checkin/page.tsx:20", permiteLogin: true, espera: ["Entrar"] },
  { n: 10, nome: "pagina-publica", url: `/${SLUG}`, tela: "Página pública da igreja", comp: "app/[slug]/page.tsx:32", permiteLogin: true },
];
const pad = (n) => String(n).padStart(2, "0");

export async function rodar({ aparelhos }) {
  for (const ap of aparelhos) {
    for (const t of TELAS) {
      const nome = `${ap}-${pad(t.n)}-entrada-${t.nome}`;
      await tentar(`telas/${nome}.png`, { tela: t.tela, passo: `abrir ${t.url}` }, async () => {
        const { ctx, page } = await criarContexto(ap);
        try {
          await page.goto(t.url, { waitUntil: "domcontentloaded" });
          await page.waitForTimeout(1200);
          await tirarPrint(page, {
            pasta: "telas", nome, conta: null, papel: "visitante (sem login)", tela: t.tela, estado: t.estado ?? null,
            cliques: [`abrir ${t.url}`], componente: t.comp, antes: antes(ap, t.antes), espera: t.espera, permiteLogin: t.permiteLogin,
          });
        } finally { await ctx.close(); }
      });
    }
    // estados do login (formulário alternativo; nada é enviado)
    for (const [n, nome, botao, esperaTxt] of [[1, "cadastro", "Cadastrar minha igreja", "Criar meu acesso"], [1, "esqueci-senha", "Esqueci minha senha", null]]) {
      const arq = `${ap}-${pad(n)}-entrada-login-gestao--${nome}`;
      await tentar(`estados/${arq}.png`, { tela: "Login gestão", passo: `clicar ${botao}` }, async () => {
        const { ctx, page } = await criarContexto(ap);
        try {
          await page.goto("/service/login", { waitUntil: "domcontentloaded" });
          await esperar(page);
          await clicarTexto(page, "button, a", botao);
          await tirarPrint(page, {
            pasta: "estados", nome: arq, papel: "visitante (sem login)", tela: "Login gestão", estado: nome, cliques: ["abrir /service/login", botao],
            componente: ETAPA_LOGIN, antes: antes(ap, ANTES_ENTRADA.login), espera: esperaTxt ? [esperaTxt] : [], permiteLogin: true,
          });
        } finally { await ctx.close(); }
      });
    }
  }
}
