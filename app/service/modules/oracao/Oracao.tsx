"use client";

/* Mural de oração no app do membro (manifesto em ./manifest.ts).
   SheetPedidoOracao: o pedido, com quem vê (só a intercessão, que continua
   indo como conversa, ou o mural da igreja), anônimo e categoria.
   MuralOracao: a tela em Mensagens, com "Orei", os meus pedidos (quantas
   pessoas oraram, em número simples: lei 10) e o respondido com testemunho.
   A casca (MobileApp) passa a folha, o aviso e a navegação por props. */

import { useId, useState } from "react";
import { Icon } from "../../lib/icons";
import { plural } from "../../lib/plural";
import { quandoPublicado } from "../../lib/date";
import { papelDoDestinatario, type Destinatario } from "../../lib/destinatario";
import {
  CATEGORIAS, LIMITE_PEDIDO, LIMITE_TESTEMUNHO, marcarRespondido, orar, pedirOracao, rotuloCategoria, tirarDoMural, useMuralOracao,
  type Categoria, type PedidoMural, type Publico,
} from "./oracao";

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
  const fid = useId();
  const podeIntercessao = !!dest && !!onStartChat;
  const [txt, setTxt] = useState("");
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [publico, setPublico] = useState<Publico>(podeIntercessao ? (muralOn ? inicial : "intercessao") : "mural");
  const [anonimo, setAnonimo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState<{ publico: Publico; chatId: string | null } | null>(null);
  const nome = dest?.name.split(" ")[0] ?? "";

  if (feito) {
    return (
      <div className="m6-donesh">
        <span className="m6-dot feito big"><Icon name="ok" size={28} /></span>
        <h2 className="m6-sh">{feito.publico === "mural" ? "Seu pedido está no mural" : "Pedido enviado"}</h2>
        <p className="m6-txt">
          {feito.publico === "mural"
            ? "A igreja já pode orar com você. Quando Deus responder, conte no mural."
            : `${nome} recebeu e vai orar por você. A conversa fica em Mensagens.`}
        </p>
        <div className="m6-btns">
          {feito.publico === "mural"
            ? <button className="m6-btn pri" type="button" onClick={onVerMural}>Ver o mural</button>
            : feito.chatId && <button className="m6-btn pri" type="button" onClick={() => onVerConversa(feito.chatId as string)}>Ver em Mensagens</button>}
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
      if (id) setFeito({ publico, chatId: id }); else setErro("Não foi possível enviar agora. Tente de novo.");
      return;
    }
    const r = await pedirOracao(organizationId, { body, audience: "mural", anonymous: anonimo, category: categoria ?? "outro" });
    setEnviando(false);
    if (r.id) setFeito({ publico, chatId: null }); else setErro(r.erro ?? "Não foi possível enviar agora. Tente de novo.");
  };

  return (
    <div className="or-sheet">
      <h2 className="m6-sh">Pedido de oração</h2>
      <textarea className="m6-ta" value={txt} maxLength={LIMITE_PEDIDO} onChange={(e) => setTxt(e.target.value)} placeholder="Pelo que podemos orar?" aria-label="Pedido de oração" />
      {txt.length > LIMITE_PEDIDO - 100 && <div className="m6-meta or-conta">{`${LIMITE_PEDIDO - txt.length} caracteres restantes`}</div>}

      <div className="or-campo" id={`${fid}-cat`}>Sobre o quê</div>
      <div className="or-chips" role="group" aria-labelledby={`${fid}-cat`}>
        {CATEGORIAS.map((c) => (
          <button key={c.id} type="button" className={`or-chip${categoria === c.id ? " on" : ""}`} aria-pressed={categoria === c.id} onClick={() => setCategoria(categoria === c.id ? null : c.id)}>{c.rotulo}</button>
        ))}
      </div>

      {podeIntercessao && muralOn && (
        <>
          <div className="or-campo" id={`${fid}-pub`}>Quem vê</div>
          <div className="m6-list flat" role="radiogroup" aria-labelledby={`${fid}-pub`}>
            {([
              ["intercessao", "Só a intercessão", `Vai para ${papelDoDestinatario(dest as Destinatario)}, numa conversa.`],
              ["mural", "Mural de oração", "A igreja vê e pode orar com você."],
            ] as const).map(([v, t, s]) => (
              <button key={v} type="button" role="radio" aria-checked={publico === v} className={`m6-row or-opt${publico === v ? " on" : ""}`} onClick={() => setPublico(v)}>
                <span className="or-radio" aria-hidden="true" />
                <span className="m6-rb"><span className="m6-rt">{t}</span><span className="m6-rs">{s}</span></span>
              </button>
            ))}
          </div>
        </>
      )}
      {!podeIntercessao && <div className="m6-meta or-nota">Seu pedido vai para o mural de oração da igreja.</div>}
      {podeIntercessao && !muralOn && <div className="m6-meta or-nota">{`Vai para ${papelDoDestinatario(dest as Destinatario)}. Só essa pessoa lê.`}</div>}

      {publico === "mural" && (
        <div className="m6-list flat">
          <div className="m6-row or-sw">
            <span className="m6-rb"><span className="m6-rt" id={`${fid}-anon`}>Pedir sem meu nome</span><span className="m6-rs">Só quem cuida da intercessão sabe que foi você.</span></span>
            <button type="button" role="switch" aria-checked={anonimo} aria-labelledby={`${fid}-anon`} className={`m6-tg${anonimo ? " on" : ""}`} onClick={() => setAnonimo(!anonimo)} />
          </div>
        </div>
      )}

      {erro && <div className="m6-err" role="alert">{erro}</div>}
      <div className="m6-btns">
        <button className="m6-btn pri" type="button" disabled={!txt.trim() || enviando} onClick={enviar}>
          {enviando ? "Enviando..." : publico === "mural" ? "Publicar no mural" : "Enviar pedido"}
        </button>
      </div>
    </div>
  );
}

// ── respondido, com testemunho ───────────────────────────────────────────────
export function SheetRespondido({ organizationId, pedido, onFechar, toast, onMudou }: {
  organizationId?: string; pedido: PedidoMural; onFechar: () => void; toast: Toast; onMudou: () => void;
}) {
  const [txt, setTxt] = useState(pedido.testimony ?? "");
  const [salvando, setSalvando] = useState(false);
  const jaRespondido = !!pedido.answered_at;
  return (
    <div className="or-sheet">
      <h2 className="m6-sh">{jaRespondido ? "Seu testemunho" : "Deus respondeu?"}</h2>
      <p className="m6-meta">Se quiser, conte em poucas palavras o que aconteceu. Quem orou com você vai se alegrar junto.</p>
      <textarea className="m6-ta" value={txt} maxLength={LIMITE_TESTEMUNHO} onChange={(e) => setTxt(e.target.value)} placeholder="O que Deus fez (opcional)" aria-label="Testemunho" />
      {txt.length > LIMITE_TESTEMUNHO - 80 && <div className="m6-meta or-conta">{`${LIMITE_TESTEMUNHO - txt.length} caracteres restantes`}</div>}
      <div className="m6-btns col">
        <button className="m6-btn pri" type="button" disabled={salvando} onClick={async () => {
          setSalvando(true);
          const ok = await marcarRespondido(organizationId, pedido.id, true, txt);
          setSalvando(false);
          if (!ok) { toast("Não foi possível salvar agora. Tente de novo."); return; }
          onFechar();
          onMudou();
          if (!jaRespondido) toast("Marcado como respondido.", { label: "Desfazer", fn: async () => { await marcarRespondido(organizationId, pedido.id, false); onMudou(); } });
        }}>{salvando ? "Salvando..." : jaRespondido ? "Salvar" : "Marcar como respondido"}</button>
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
    if (!ok) { setOreiAgora((o) => { const n = { ...o }; delete n[p.id]; return n; }); toast("Não foi possível marcar agora. Tente de novo."); return; }
    if (on) toast("Obrigado por orar.", { label: "Desfazer", fn: () => void marcarOrei(p, false) });
  };
  const tirar = async (p: PedidoMural) => {
    const ok = await tirarDoMural(organizationId, p.id, true);
    if (!ok) { toast("Não foi possível tirar agora. Tente de novo."); return; }
    void recarregar();
    toast("Pedido tirado do mural.", { label: "Desfazer", fn: async () => { await tirarDoMural(organizationId, p.id, false); void recarregar(); } });
  };

  const vazio = {
    igreja: ["Nenhum pedido no mural agora", "Quando alguém da igreja pedir oração, o pedido aparece aqui para você orar junto."],
    meus: ["Você ainda não fez um pedido", "Seus pedidos ficam aqui, com quantas pessoas oraram por você."],
    respondidos: ["Nenhuma resposta contada ainda", "Quando alguém contar o que Deus fez, o testemunho aparece aqui."],
  }[aba];

  return (
    <div className="or-tela">
      {onPedir && (
        <div className="m6-pad or-pedir">
          <button className="m6-btn pri full" type="button" onClick={onPedir}><Icon name="add" size={20} />Fazer um pedido</button>
        </div>
      )}
      <div className="m6-segwrap">
        <div className="ts-seg m6-seg" role="radiogroup" aria-label="O que ver">
          {([["igreja", "Da igreja"], ["meus", "Meus"], ["respondidos", "Respostas"]] as const).map(([v, l]) => (
            <button key={v} type="button" role="radio" aria-checked={aba === v} className={aba === v ? "on" : ""} onClick={() => setAba(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="m6-sec0 or-lista">
        {dados === null && !erro && <div className="m6-card"><div className="m6-meta">Carregando os pedidos...</div></div>}
        {erro && (
          <div className="m6-card">
            <div className="m6-ct">Não deu para abrir o mural</div>
            <div className="m6-meta">Confira a internet e tente de novo.</div>
            <div className="m6-btns"><button className="m6-btn sec" type="button" onClick={() => void recarregar()}>Tentar de novo</button></div>
          </div>
        )}
        {dados !== null && visiveis.length === 0 && (
          <div className="m6-card"><div className="m6-ct">{vazio[0]}</div><div className="m6-meta">{vazio[1]}</div></div>
        )}
        {visiveis.map((p) => {
          const orei = oreiAgora[p.id] ?? p.i_prayed;
          /* o número de quem pediu soma o próprio "orei" dado agora */
          const n = (p.prayed_count ?? 0) + (p.is_mine && oreiAgora[p.id] !== undefined ? (oreiAgora[p.id] ? 1 : 0) - (p.i_prayed ? 1 : 0) : 0);
          return (
            <article className="m6-card or-card" key={p.id}>
              <div className="or-top">
                <span className="or-cat">{rotuloCategoria(p.category)}</span>
                <span className="or-quando">{quandoPublicado(p.created_at)}</span>
              </div>
              <div className="or-quem">{p.is_mine ? (p.anonymous ? "Você, sem seu nome no mural" : "Você") : p.author ?? "Pedido sem nome"}</div>
              <p className="m6-txt or-txt">{p.body}</p>
              {p.answered_at && (
                <div className="or-resp">
                  <span className="m6-st ok"><Icon name="ok" size={16} />Respondido</span>
                  {p.testimony && <p className="or-test">{p.testimony}</p>}
                </div>
              )}
              {p.is_mine ? (
                <>
                  <div className="m6-meta or-info">
                    {p.audience === "intercessao" ? "Só a intercessão vê este pedido."
                      : p.hidden ? "A intercessão tirou este pedido do mural e continua orando por você."
                      : n > 0 ? `${plural(n, "pessoa orou", "pessoas oraram")} por você.`
                      : "Assim que alguém orar, aparece aqui."}
                  </div>
                  <div className="m6-btns">
                    <button className="m6-btn sec small" type="button" onClick={() => sheet(<SheetRespondido organizationId={organizationId} pedido={p} onFechar={() => sheet(null)} toast={toast} onMudou={() => void recarregar()} />)}>
                      {p.answered_at ? "Editar testemunho" : "Deus respondeu"}
                    </button>
                    {p.audience === "mural" && !p.hidden && <button className="m6-btn sec small" type="button" onClick={() => void tirar(p)}>Tirar do mural</button>}
                  </div>
                </>
              ) : !p.answered_at && (
                <div className="m6-btns">
                  <button className={`m6-btn small or-orei${orei ? " on" : ""}`} type="button" aria-pressed={orei} onClick={() => void marcarOrei(p, !orei)}>
                    <Icon name={orei ? "ok" : "oracao"} size={18} />{orei ? "Você orou" : "Orei"}
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>

    </div>
  );
}
