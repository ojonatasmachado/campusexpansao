"use client";
import { useEffect, useState } from "react";
import { getEnqueteElegivelSite, enviarRespostaSite, type EnqueteElegivelView, type TipoPergunta } from "../lib/enquetes-site";

const REACOES = ["Ótimo", "Bom", "Neutro", "Ruim", "Péssimo"];

function opcoesPara(tipo: TipoPergunta, escala: 5 | 10 | null, opcoes: string[] | null): string[] {
  if (tipo === "nota") return Array.from({ length: (escala ?? 10) + 1 }, (_, i) => String(i));
  if (tipo === "emoji") return REACOES;
  if (tipo === "simnao") return ["Sim", "Não"];
  if (tipo === "multipla") return opcoes ?? [];
  return [];
}

/* Botão fixo + modal de "Avaliação de experiência", montado uma vez no
   layout do site (visível em qualquer página). Resolve sozinho se há
   enquete elegível (livre/campanha/periódica/pós-acesso) via server action
   — some da tela quando não há nenhuma. Ver HANDOFF Avaliação de
   Experiência + app/lib/enquetes-site.ts. */
export default function AvaliacaoModal() {
  const [enquete, setEnquete] = useState<EnqueteElegivelView | null>(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getEnqueteElegivelSite().then(setEnquete).catch(() => setEnquete(null));
  }, []);

  if (!enquete) return null;

  const pergunta = enquete.perguntas[step];
  const last = step === enquete.perguntas.length - 1;

  const fechar = () => { setOpen(false); setStep(0); setRespostas({}); setError(""); };

  const enviar = async () => {
    setSending(true);
    setError("");
    const payload = enquete.perguntas.map((p) => ({ perguntaId: p.id, valor: respostas[p.id] ?? "" }));
    const result = await enviarRespostaSite(enquete.id, payload);
    setSending(false);
    if (!result.ok) { setError(result.error ?? "Não foi possível enviar sua resposta."); return; }
    setOpen(false);
    setEnquete(null);
  };

  const proximo = () => {
    if (!respostas[pergunta.id]) return;
    if (last) void enviar();
    else setStep(step + 1);
  };

  return (
    <>
      <button type="button" className="btn btn-primary avaliacao-fixed-btn" onClick={() => setOpen(true)}>
        Avaliar experiência
      </button>
      {open && (
        <div className="modal-overlay open" onClick={fechar}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close" onClick={fechar} aria-label="Fechar">×</button>
            <p className="modal-eyebrow">{enquete.nome}</p>
            <h2 className="modal-title">{pergunta.texto}</h2>
            {pergunta.tipo === "texto" ? (
              <div className="field">
                <textarea
                  className="textarea"
                  value={respostas[pergunta.id] ?? ""}
                  onChange={(e) => setRespostas({ ...respostas, [pergunta.id]: e.target.value })}
                  placeholder="Escreva aqui..."
                />
              </div>
            ) : (
              <div className="chip-group" style={{ marginBottom: 22 }}>
                {opcoesPara(pergunta.tipo, pergunta.escala, pergunta.opcoes).map((op) => (
                  <button
                    key={op}
                    type="button"
                    className={`chip${respostas[pergunta.id] === op ? " active" : ""}`}
                    onClick={() => setRespostas({ ...respostas, [pergunta.id]: op })}
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
            {error && <p className="field-error" style={{ marginBottom: 16 }}>{error}</p>}
            <div className="modal-actions" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", gap: 5 }}>
                {enquete.perguntas.map((_, idx) => (
                  <span key={idx} style={{ width: 5, height: 5, borderRadius: "50%", background: idx === step ? "var(--olive)" : "var(--border-2)" }} />
                ))}
              </div>
              <button type="button" className="btn btn-primary" disabled={sending || !respostas[pergunta.id]} onClick={proximo}>
                {sending ? "Enviando..." : last ? "Enviar" : "Próxima →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
