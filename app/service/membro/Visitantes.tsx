"use client";

import { useState } from "react";
import { Icon, Caret } from "../lib/icons";
import { Av } from "./comum";
import type { Visitor } from "./tipos";

import { Botao } from "../ui/Botao";
import { Acao } from "../ui/Acao";
import { Cartao } from "../ui/Cartao";
import { Selo } from "../ui/Selo";
export const ETAPAS = [
  { id: "novo", nome: "Novo" },
  { id: "contato", nome: "Contato" },
  { id: "integrando", nome: "Integrando" },
  { id: "membro", nome: "Membro" },
];

// ── aba: Visitantes (Recepcao) ────────────────────────────────────────────────

export function TabVisitantes({ visitors, onAdvanceVisitorStage, onRegisterVisitor }: {
  visitors: Visitor[];
  onAdvanceVisitorStage?: (visitorId: string, nextStageId: string) => void;
  onRegisterVisitor?: (data: { name: string; phone: string; origin: string }) => void;
}) {
  const [novo, setNovo] = useState(false);
  const [aberto, setAberto] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", phone: "", origin: "Primeira visita" });

  const allVisitors = visitors
    .filter((v) => v.stage !== "membro")
    .map((v) => ({ id: v.id, name: v.name, phone: v.phone ?? "", origin: v.origin ?? "", stage: v.stage }));

  const salvar = () => {
    if (!form.name.trim()) return;
    onRegisterVisitor?.({ name: form.name.trim(), phone: form.phone, origin: form.origin });
    setForm({ name: "", phone: "", origin: "Primeira visita" });
    setNovo(false);
  };

  return (
    <>
      <div className="m-section-t">Acolhida de visitantes</div>
      <div style={{ fontSize: "var(--fs-app-13)", color: "var(--muted)", lineHeight: 1.5, marginBottom: 14 }}>
        Registre quem chegou e evolua o acompanhamento direto pelo celular.
      </div>
      <Botao tamanho="toque" variante="principal" largo style={{ width: "100%", marginBottom: 16 }} onClick={() => setNovo(true)}>
        + Registrar visitante
      </Botao>

      {novo && (
        <Cartao estilo="app-solto" style={{ borderColor: "var(--olive-line)" }}>
          <div className="m-when" style={{ marginBottom: 10 }}>Novo visitante</div>
          <input
            className="input"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            style={{ marginBottom: 8 }}
          />
          <input
            className="input"
            placeholder="Telefone"
            value={form.phone}
            onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
            style={{ marginBottom: 8 }}
          />
          <select
            className="select"
            value={form.origin}
            onChange={(e) => setForm((p) => ({ ...p, origin: e.target.value }))}
            style={{ marginBottom: 12 }}
          >
            {["Primeira visita", "Convite de membro", "Instagram", "Indicacao", "Evangelismo"].map(
              (o) => <option key={o}>{o}</option>,
            )}
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <Botao tamanho="toque" variante="principal" style={{ flex: 1 }} onClick={salvar}>Salvar</Botao>
            <Botao tamanho="toque" variante="secundario" style={{ flex: 1 }} onClick={() => setNovo(false)}>Cancelar</Botao>
          </div>
        </Cartao>
      )}

      {allVisitors.map((v) => {
        const etIdx = ETAPAS.findIndex((e) => e.id === v.stage);
        const et = ETAPAS[Math.max(0, etIdx)];
        const isOpen = aberto === v.id;
        return (
          <Cartao estilo="app-solto" key={v.id}>
            <Acao className="m-vis-head" onClick={() => setAberto(isOpen ? null : v.id)}>
              <Av name={v.name} size="sm" />
              <div className="m-vis-main">
                <div className="m-culto" style={{ fontSize: "var(--fs-app-15)" }}>{v.name}</div>
                <div className="m-fn">
                  <Selo>{et.nome}</Selo>
                  {v.origin ? ` · ${v.origin}` : ""}
                </div>
              </div>
              <span className="m-task-caret"><Caret open={isOpen} /></span>
            </Acao>
            {isOpen && (
              <div style={{ marginTop: 12 }}>
                <div className="m-vis-track">
                  {ETAPAS.map((e, i) => (
                    <div key={e.id} style={{ flex: 1, textAlign: "center" }}>
                      <div
                        style={{ height: 5, borderRadius: 3, background: i <= etIdx ? "var(--olive)" : "var(--ink)" }}
                      />
                      <div
                        style={{
                          fontSize: "var(--fs-app-13)",
                          color: i <= etIdx ? "var(--light)" : "var(--muted)",
                          marginTop: 6,
                        }}
                      >
                        {e.nome}
                      </div>
                    </div>
                  ))}
                </div>
                {etIdx < ETAPAS.length - 1 && (
                  <Botao
                    tamanho="toque" variante="principal" largo
                    style={{ width: "100%", marginTop: 8 }}
                    onClick={() => {
                      onAdvanceVisitorStage?.(v.id, ETAPAS[etIdx + 1].id);
                      setAberto(null);
                    }}
                  >
                    Avancar para {`"${ETAPAS[etIdx + 1].nome}"`} →
                  </Botao>
                )}
                {etIdx === ETAPAS.length - 1 && (
                  <div className="m-confirmed" style={{ marginTop: 10 }}><Icon name="ok" size={15} /> Pronto para virar membro</div>
                )}
              </div>
            )}
          </Cartao>
        );
      })}
    </>
  );
}
