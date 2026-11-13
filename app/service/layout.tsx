import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { familyById } from "./lib/theme";
import "../../evolucoes/service_app/service-app.css";
/* mapa da igreja: CSS do módulo, depois do Service */
import "./modules/mapa/mapa.css";
/* visual das peças da biblioteca (lei 17), por último para vencer as regras antigas */
import "./ui/biblioteca.css";
/* Panorama do culto (E2): superfície só de leitura */
import "./painel/telas/panorama.css";
import PwaBootstrap from "./PwaBootstrap";
import DialogosAcessiveis from "./DialogosAcessiveis";
import { ServiceLocaleProvider } from "./lib/internacional/contexto";
import { getServiceInternational } from "./lib/internacional/servidor";
import { Carregando } from "./ui/Estados";

/* Título e descrição fixos em pt-BR, sem depender da resolução de locale (que pede rede):
   o rollout de idioma (service.international_rollout) está desligado em produção, então o
   texto traduzido seria sempre este mesmo pt-BR hoje; quando a N2 ligar o rollout, title/
   description plenamente localizados ficam para quando essa integração chegar a esta tela. */
export const metadata: Metadata = {
  title: "CE.X Service · Gestão ministerial",
  description: "Plataforma de gestão de pessoas, escala e agenda para igrejas CE.X.",
  manifest: "/service-manifest.json",
};

/* viewportFit "cover": o app ocupa a tela inteira do celular e o CSS v5
   afasta o que é fixo do notch, da Dynamic Island e da barra de gestos
   (--safe-*, seção 6 do service-v5.css). Só no Service: o site e a
   Página da igreja continuam sem cover. */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: familyById(undefined, "dark").tokens.ink,
};

/* Abertura instantânea (Q21): resolver o locale/sessão da pessoa pede rede (RPC, cookies,
   auth), e numa função fria (abrir o app instalado depois de fechado) isso soma segundos.
   Antes, o layout inteiro esperava essa resposta antes de pintar qualquer coisa: tela preta
   ou branca, sem indício de que algo está acontecendo. Agora o Suspense deixa o HTML da
   splash sair na hora (sem rede, sem depender de locale) enquanto o resto carrega atrás.
   Não mexe na resolução em si (lib/internacional/servidor.ts), só na fronteira em volta dela.
   Reaproveita Carregando (ui/Estados.tsx) com o mesmo rótulo do loading.tsx de rota: se a
   pessoa ver as duas por causa de uma rede bem lenta, é a mesma tela, sem o texto trocar.
   Carregando usa useTexto()/useVocabularioDaIgreja(), mas os dois têm retorno seguro sem
   Provider (pt-BR puro), então funciona normalmente aqui fora do ServiceLocaleProvider. */
async function ServiceConteudo({ children }: { children: React.ReactNode }) {
  const international = await getServiceInternational();
  return (
    <ServiceLocaleProvider {...international}>
      {children}
      <PwaBootstrap />
      <DialogosAcessiveis />
    </ServiceLocaleProvider>
  );
}

export default function ServiceLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<Carregando telaInteira rotulo="Carregando o Service…" />}>
      <ServiceConteudo>{children}</ServiceConteudo>
    </Suspense>
  );
}
