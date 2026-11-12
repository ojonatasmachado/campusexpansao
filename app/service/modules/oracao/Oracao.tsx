"use client";

/* Mural de oração no app do membro (manifesto em ./manifest.ts).
   SheetPedidoOracao: o pedido, com quem vê (só a intercessão, que continua
   indo como conversa, ou o mural da igreja), anônimo e categoria.
   MuralOracao: a tela em Mensagens, com "Orei", os meus pedidos (quantas
   pessoas oraram, em número simples: lei 10) e o respondido com testemunho.
   A casca (MobileApp) passa a folha, o aviso e a navegação por props. */

import { useId, useState } from "react";
import { Icon } from "../../lib/icons";
import { useRelogioDaIgreja } from "../../lib/relogio-context";
import { useRascunho } from "../../lib/retorno";

import { papelDoDestinatario, type Destinatario } from "../../lib/destinatario";
import {
  CATEGORIAS, LIMITE_PEDIDO, LIMITE_TESTEMUNHO, marcarRespondido, orar, pedirOracao, rotuloCategoria, tirarDoMural, useMuralOracao,
  type Categoria, type PedidoMural, type Publico,
} from "./oracao";

import { Botao } from "../../ui/Botao";
import { Interruptor } from "../../ui/Interruptor";
import { Opcao } from "../../ui/Opcao";
import { Linha, Lista } from "../../ui/Linha";
import { Cartao } from "../../ui/Cartao";
import { Selo } from "../../ui/Selo";
import { Carregando } from "../../ui/Estados";
import { useTexto } from "../../lib/internacional/contexto";

type Toast = (msg: string, action?: { label: string; fn: () => void }) => void;

// ── o pedido ─────────────────────────────────────────────────────────────────
export function SheetPedidoOracao({ organizationId, memberId, dest, muralOn, onStartChat, onVerConversa, onVerMural, inicial = "intercessao" }: {
  organizationId?: string;
  memberId: string;
  /* quem recebe a conversa; null: ninguém cuida da intercessão (só o mural) */
  dest: Destinatario | null;
  muralOn: boolean;
  onStartChat?: (selfMemberId: string, targetMemberId: string, firstMessage: string) => Promise<string | null>;
  onVerConversa: (chatId: string) => void;
  onVerMural: () => void;
  inicial?: Publico;
}) {
  const traduzirUi = useTexto();

  const fid = useId();
  const podeIntercessao = !!dest && !!onStartChat;
  /* M3: o pedido em escrita volta na recarga (sessionStorage, some na saída da conta) */
  const [rascunho, setRascunho, limparRascunho] = useRascunho<{ txt: string; categoria: Categoria | null; publico: Publico | null; anonimo: boolean }>(
    `oracao:${memberId}`, { txt: "", categoria: null, publico: null, anonimo: false });
  const { txt, categoria, anonimo } = rascunho;
  const publicoPadrao: Publico = podeIntercessao ? (muralOn ? inicial : "intercessao") : "mural";
  const publico: Publico = rascunho.publico && (rascunho.publico === "mural" ? muralOn || !podeIntercessao : podeIntercessao) ? rascunho.publico : publicoPadrao;
  const setTxt = (v: string) => setRascunho((r) => ({ ...r, txt: v }));
  const setCategoria = (v: Categoria | null) => setRascunho((r) => ({ ...r, categoria: v }));
  const setPublico = (v: Publico) => setRascunho((r) => ({ ...r, publico: v }));
  const setAnonimo = (v: boolean) => setRascunho((r) => ({ ...r, anonimo: v }));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState<{ publico: Publico; chatId: string | null } | null>(null);
  const nome = dest?.name.split(" ")[0] ?? "";

  if (feito) {
    return (
      <div className="m6-donesh">
        <span className="m6-dot feito big"><Icon name="ok" size={28} /></span>
        <h2 className="m6-sh">{feito.publico === "mural" ? traduzirUi("Seu pedido está no mural") : traduzirUi("Pedido enviado")}</h2>
        <p className="m6-txt">
          {feito.publico === "mural"
            ? traduzirUi("A igreja já pode orar com você. Quando Deus responder, conte no mural.")
            : traduzirUi("{nome} recebeu e vai orar por você. A conversa fica em Mensagens.", { nome })}
        </p>
        <div className="m6-btns">
          {feito.publico === "mural"
            ? <Botao tamanho="toque" variante="principal" onClick={onVerMural}>{traduzirUi("Ver o mural")}</Botao>
            : feito.chatId && <Botao tamanho="toque" variante="principal" onClick={() => onVerConversa(feito.chatId as string)}>{traduzirUi("Ver em Mensagens")}</Botao>}
        </div>
      </div>
    );
  }

  const enviar = async () => {
    const body = txt.trim();
    if (!body) return;
    setEnviando(true);
    setErro("");
    if (publico === "intercessao") {
      if (!dest || !onStartChat) { setEnviando(false); return; }
      /* o registro alimenta a lista de quem cuida; a conversa continua sendo o caminho do pedido */
      void pedirOracao(organizationId, { body, audience: "intercessao", anonymous: false, category: categoria ?? "outro" });
      const id = await onStartChat(memberId, dest.member_id, `Pedido de oração: ${body}`);
      setEnviando(false);
      if (id) { limparRascunho(); setFeito({ publico, chatId: id }); } else setErro(traduzirUi("Não foi possível enviar agora. Tente de novo."));
      return;
    }
    const r = await pedirOracao(organizationId, { body, audience: "mural", anonymous: anonimo, category: categoria ?? "outro" });
    setEnviando(false);
    if (r.id) { limparRascunho(); setFeito({ publico, chatId: null }); } else setErro(r.erro ?? traduzirUi("Não foi possível enviar agora. Tente de novo."));
  };

  return (
    <div className="or-sheet">
      <h2 className="m6-sh">{traduzirUi("Pedido de oração")}</h2>
      <textarea className="m6-ta" value={txt} maxLength={LIMITE_PEDIDO} onChange={(e) => setTxt(e.target.value)} placeholder={traduzirUi("Pelo que podemos orar?")} aria-label={traduzirUi("Pedido de oração")} />
      {txt.length > LIMITE_PEDIDO - 100 && <div className="m6-meta or-conta">{traduzirUi("{n} caracteres restantes", { n: String(LIMITE_PEDIDO - txt.length) })}</div>}

      <div className="or-campo" id={`${fid}-cat`}>{traduzirUi("Sobre o quê")}</div>
      <div className="or-chips" role="group" aria-labelledby={`${fid}-cat`}>
        {CATEGORIAS.map((c) => (
          <Opcao key={c.id} marcada={categoria === c.id} estilo="or-chip" aria-pressed={categoria === c.id} onClick={() => setCategoria(categoria === c.id ? null : c.id)}>{c.rotulo}</Opcao>
        ))}
      </div>

      {podeIntercessao && muralOn && (
        <>
          <div className="or-campo" id={`${fid}-pub`}>{traduzirUi("Quem vê")}</div>
          <Lista plano role="radiogroup" aria-labelledby={`${fid}-pub`}>
            {([
              ["intercessao", traduzirUi("Só a intercessão"), traduzirUi("Vai para {destino}, numa conversa.", { destino: papelDoDestinatario(dest as Destinatario) })],
              ["mural", traduzirUi("Mural de oração"), traduzirUi("A igreja vê e pode orar com você.")],
            ] as const).map(([v, t, s]) => (
              <Opcao key={v} role="radio" aria-checked={publico === v} marcada={publico === v} estilo="m6-row" className="or-opt" onClick={() => setPublico(v)}>
                <span className="or-radio" aria-hidden="true" />
                <span className="m6-rb"><span className="m6-rt">{t}</span><span className="m6-rs">{s}</span></span>
              </Opcao>
            ))}
          </Lista>
        </>
      )}
      {!podeIntercessao && <div className="m6-meta or-nota">{traduzirUi("Seu pedido vai para o mural de oração da igreja.")}</div>}
      {podeIntercessao && !muralOn && <div className="m6-meta or-nota">{traduzirUi("Vai para {destino}. Só essa pessoa lê.", { destino: papelDoDestinatario(dest as Destinatario) })}</div>}

      {publico === "mural" && (
        <Lista plano>
          <Linha estilo="app" className="or-sw">
            <span className="m6-rb"><span className="m6-rt" id={`${fid}-anon`}>{traduzirUi("Pedir sem meu nome")}</span><span className="m6-rs">{traduzirUi("Só quem cuida da intercessão sabe que foi você.")}</span></span>
            <Interruptor ligado={anonimo} tamanho="toque" rotuloId={`${fid}-anon`} onClick={() => setAnonimo(!anonimo)} />
          </Linha>
        </Lista>
      )}

      {erro && <div className="m6-err" role="alert">{erro}</div>}
      <div className="m6-btns">
        <Botao tamanho="toque" variante="principal" desativado={!txt.trim() || enviando} onClick={enviar}>
          {enviando ? traduzirUi("Enviando...") : publico === "mural" ? traduzirUi("Publicar no mural") : traduzirUi("Enviar pedido")}
        </Botao>
      </div>
    </div>
  );
}

// ── respondido, com testemunho ───────────────────────────────────────────────
export function SheetRespondido({ organizationId, pedido, onFechar, toast, onMudou }: {
  organizationId?: string; pedido: PedidoMural; onFechar: () => void; toast: Toast; onMudou: () => void;
}) {
  const traduzirUi = useTexto();

  const [txt, setTxt] = useState(pedido.testimony ?? "");
  const [salvando, setSalvando] = useState(false);
  const jaRespondido = !!pedido.answered_at;
  return (
    <div className="or-sheet">
      <h2 className="m6-sh">{jaRespondido ? traduzirUi("Seu testemunho") : traduzirUi("Deus respondeu?")}</h2>
      <p className="m6-meta">{traduzirUi("Se quiser, conte em poucas palavras o que aconteceu. Quem orou com você vai se alegrar junto.")}</p>
      <textarea className="m6-ta" value={txt} maxLength={LIMITE_TESTEMUNHO} onChange={(e) => setTxt(e.target.value)} placeholder={traduzirUi("O que Deus fez (opcional)")} aria-label={traduzirUi("Testemunho")} />
      {txt.length > LIMITE_TESTEMUNHO - 80 && <div className="m6-meta or-conta">{traduzirUi("{n} caracteres restantes", { n: String(LIMITE_TESTEMUNHO - txt.length) })}</div>}
      <div className="m6-btns col">
        <Botao tamanho="toque" variante="principal" desativado={salvando} onClick={async () => {
          setSalvando(true);
          const ok = await marcarRespondido(organizationId, pedido.id, true, txt);
          setSalvando(false);
          if (!ok) { toast(traduzirUi("Não foi possível salvar agora. Tente de novo.")); return; }
          onFechar();
          onMudou();
          if (!jaRespondido) toast(traduzirUi("Marcado como respondido."), { label: traduzirUi("Desfazer"), fn: async () => { await marcarRespondido(organizationId, pedido.id, false); onMudou(); } });
        }}>{salvando ? traduzirUi("Salvando...") : jaRespondido ? traduzirUi("Salvar") : traduzirUi("Marcar como respondido")}</Botao>
      </div>
    </div>
  );
}

// ── a tela ───────────────────────────────────────────────────────────────────
type Aba = "igreja" | "meus" | "respondidos";

export function MuralOracao({ organizationId, onPedir, sheet, toast }: {
  organizationId?: string;
  /* abre a folha do pedido; sem quem receba, nulo (a ação some: lei 6) */
  onPedir: (() => void) | null;
  sheet: (el: React.ReactNode | null) => void;
  toast: Toast;
}) {
  const traduzirUi = useTexto();

  const { quandoPublicado } = useRelogioDaIgreja();
  const { dados, erro, recarregar } = useMuralOracao(organizationId);
  const [aba, setAba] = useState<Aba>("igreja");
  /* "orei" já dado na tela, antes de o banco responder */
  const [oreiAgora, setOreiAgora] = useState<Record<string, boolean>>({});
  const lista = dados ?? [];
  const daIgreja = lista.filter((p) => !p.is_mine && !p.answered_at);
  const meus = lista.filter((p) => p.is_mine);
  const respondidos = lista.filter((p) => p.answered_at && p.audience === "mural" && !p.hidden);
  const visiveis = aba === "igreja" ? daIgreja : aba === "meus" ? meus : respondidos;

  const marcarOrei = async (p: PedidoMural, on: boolean) => {
    setOreiAgora((o) => ({ ...o, [p.id]: on }));
    const ok = await orar(organizationId, p.id, on);
    if (!ok) { setOreiAgora((o) => { const n = { ...o }; delete n[p.id]; return n; }); toast(traduzirUi("Não foi possível marcar agora. Tente de novo.")); return; }
    if (on) toast(traduzirUi("Obrigado por orar."), { label: traduzirUi("Desfazer"), fn: () => void marcarOrei(p, false) });
  };
  const tirar = async (p: PedidoMural) => {
    const ok = await tirarDoMural(organizationId, p.id, true);
    if (!ok) { toast(traduzirUi("Não foi possível tirar agora. Tente de novo.")); return; }
    void recarregar();
    toast(traduzirUi("Pedido tirado do mural."), { label: traduzirUi("Desfazer"), fn: async () => { await tirarDoMural(organizationId, p.id, false); void recarregar(); } });
  };

  const vazio = {
    igreja: [traduzirUi("Nenhum pedido no mural agora"), traduzirUi("Quando alguém da igreja pedir oração, o pedido aparece aqui para você orar junto.")],
    meus: [traduzirUi("Você ainda não fez um pedido"), traduzirUi("Seus pedidos ficam aqui, com quantas pessoas oraram por você.")],
    respondidos: [traduzirUi("Nenhuma resposta contada ainda"), traduzirUi("Quando alguém contar o que Deus fez, o testemunho aparece aqui.")],
  }[aba];

  return (
    <div className="or-tela">
      {onPedir && (
        <div className="m6-pad or-pedir">
          <Botao tamanho="toque" variante="principal" largo onClick={onPedir}><Icon name="add" size={20} />{traduzirUi("Fazer um pedido")}</Botao>
        </div>
      )}
      <div className="m6-segwrap">
        <div className="ts-seg m6-seg" role="radiogroup" aria-label={traduzirUi("O que ver")}>
          {([["igreja", traduzirUi("Da igreja")], ["meus", traduzirUi("Meus")], ["respondidos", traduzirUi("Respostas")]] as const).map(([v, l]) => (
            <Opcao key={v} role="radio" aria-checked={aba === v} marcada={aba === v} onClick={() => setAba(v)}>{l}</Opcao>
          ))}
        </div>
      </div>

      <div className="m6-sec0 or-lista">
        {dados === null && !erro && <Carregando forma="lista" />}
        {erro && (
          <Cartao estilo="app">
            <div className="m6-ct">{traduzirUi("Não deu para abrir o mural")}</div>
            <div className="m6-meta">{traduzirUi("Confira a internet e tente de novo.")}</div>
            <div className="m6-btns"><Botao tamanho="toque" onClick={() => void recarregar()}>{traduzirUi("Tentar de novo")}</Botao></div>
          </Cartao>
        )}
        {dados !== null && visiveis.length === 0 && (
          <Cartao estilo="app"><div className="m6-ct">{vazio[0]}</div><div className="m6-meta">{vazio[1]}</div></Cartao>
        )}
        {visiveis.map((p) => {
          const orei = oreiAgora[p.id] ?? p.i_prayed;
          /* o número de quem pediu soma o próprio "orei" dado agora */
          const n = (p.prayed_count ?? 0) + (p.is_mine && oreiAgora[p.id] !== undefined ? (oreiAgora[p.id] ? 1 : 0) - (p.i_prayed ? 1 : 0) : 0);
          return (
            <Cartao estilo="app" como="article" className="or-card" key={p.id}>
              <div className="or-top">
                <span className="or-cat">{rotuloCategoria(p.category)}</span>
                <span className="or-quando">{quandoPublicado(p.created_at)}</span>
              </div>
              <div className="or-quem">{p.is_mine ? (p.anonymous ? traduzirUi("Você, sem seu nome no mural") : traduzirUi("Você")) : p.author ?? traduzirUi("Pedido sem nome")}</div>
              <p className="m6-txt or-txt">{p.body}</p>
              {p.answered_at && (
                <div className="or-resp">
                  <Selo tamanho="toque" tom="ok"><Icon name="ok" size={16} />{traduzirUi("Respondido")}</Selo>
                  {p.testimony && <p className="or-test">{p.testimony}</p>}
                </div>
              )}
              {p.is_mine ? (
                <>
                  <div className="m6-meta or-info">
                    {p.audience === "intercessao" ? traduzirUi("Só a intercessão vê este pedido.")
                      : p.hidden ? traduzirUi("A intercessão tirou este pedido do mural e continua orando por você.")
                      : n > 0 ? traduzirUi("{count, plural, =1 {# pessoa orou} other {# pessoas oraram}} por você.", { count: n })
                      : traduzirUi("Assim que alguém orar, aparece aqui.")}
                  </div>
                  <div className="m6-btns">
                    <Botao tamanho="toque" compacto onClick={() => sheet(<SheetRespondido organizationId={organizationId} pedido={p} onFechar={() => sheet(null)} toast={toast} onMudou={() => void recarregar()} />)}>
                      {p.answered_at ? traduzirUi("Editar testemunho") : traduzirUi("Deus respondeu")}
                    </Botao>
                    {p.audience === "mural" && !p.hidden && <Botao tamanho="toque" compacto onClick={() => void tirar(p)}>{traduzirUi("Tirar do mural")}</Botao>}
                  </div>
                </>
              ) : !p.answered_at && (
                <div className="m6-btns">
                  <Botao tamanho="toque" variante="discreto" compacto className={`or-orei${orei ? " on" : ""}`} aria-pressed={orei} onClick={() => void marcarOrei(p, !orei)}>
                    <Icon name={orei ? "ok" : "oracao"} size={18} />{orei ? traduzirUi("Você orou") : traduzirUi("Orei")}
                  </Botao>
                </div>
              )}
            </Cartao>
          );
        })}
      </div>

    </div>
  );
}
