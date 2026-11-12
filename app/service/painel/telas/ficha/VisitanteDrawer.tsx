"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../../lib/supabase-browser";
import { Icon } from "../../../lib/icons";
import { formatDateBR } from "../../../lib/date";
import { useTermos } from "../../../lib/vocabulario-context";
import AutocadastroDados from "../../../modules/visitantes/AutocadastroDados";
import { Av } from "../../ui";
import { VISITOR_STAGES } from "../../comum";
import { DrawerSection, DrawerShell } from "../../campos";
import type { ChurchView, ModalState, PersonView, VisitorNoteView, VisitorView } from "../../tipos";
import { Botao, BotaoIcone } from "../../../ui/Botao";
import { Acao } from "../../../ui/Acao";
import { Selo } from "../../../ui/Selo";
import { Etapas, type Etapa } from "../../../ui/Etapas";
import { useTexto } from "../../../lib/internacional/contexto";


export function VisitanteDrawer({
  visitor: initVisitor, notes, church, people, onClose, onOpenMember, setModal,
}: {
  visitor: VisitorView; notes: VisitorNoteView[]; church: ChurchView | undefined;
  people: PersonView[]; onClose: () => void; onOpenMember: (id: string) => void;
  setModal: (modal: ModalState) => void;
}) {
  const traduzirUi = useTexto();

  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [nota, setNota] = useState("");
  const [resp, setResp] = useState<"" | "respondeu" | "sem_resposta">("");
  const [saving, setSaving] = useState(false);
  const [currentStage, setCurrentStage] = useState(initVisitor.stage);
  const [currentReply, setCurrentReply] = useState(initVisitor.reply_status);
  const stageIdx = VISITOR_STAGES.findIndex((s) => s.id === currentStage);
  const owner = initVisitor.responsible_id ? people.find((p) => p.id === initVisitor.responsible_id) : null;
  const visitorNotes = notes.filter((n) => n.visitor_id === initVisitor.id);

  const addNota = async () => {
    if (!nota.trim() && !resp) return;
    setSaving(true);
    const sb = createServiceBrowserClient().schema("service");
    if (resp) {
      await sb.from("visitors").update({ reply_status: resp }).eq("id", initVisitor.id);
      setCurrentReply(resp as "respondeu" | "sem_resposta");
    }
    if (nota.trim() || resp) {
      const body = nota.trim() || (resp === "respondeu" ? "Contato registrado: respondeu." : "Contato registrado: sem resposta.");
      await sb.from("visitor_notes").insert({ organization_id: church?.organizationId, visitor_id: initVisitor.id, body, author: "Equipe", is_milestone: false });
    }
    router.refresh();
    setNota("");
    setResp("");
    setSaving(false);
  };

  const avancar = async () => {
    if (stageIdx >= VISITOR_STAGES.length - 1) return;
    const next = VISITOR_STAGES[stageIdx + 1];
    setSaving(true);
    const sb = createServiceBrowserClient().schema("service");
    await sb.from("visitors").update({ stage: next.id }).eq("id", initVisitor.id);
    await sb.from("visitor_notes").insert({ organization_id: church?.organizationId, visitor_id: initVisitor.id, body: `Avançou para "${next.name}".`, author: "Equipe", is_milestone: true });
    setCurrentStage(next.id as VisitorView["stage"]);
    router.refresh();
    setSaving(false);
  };

  return (
    <DrawerShell onClose={onClose}>
      <div className="drawer-head">
        <BotaoIcone className="drawer-close" rotulo={traduzirUi("Fechar")} onClick={onClose}>✕</BotaoIcone>
        <div className="profile-top">
          <Av name={initVisitor.name} size="lg" />
          <div>
            <div className="profile-name">{initVisitor.name}</div>
            <div className="profile-role">{traduzirUi("{origem} · primeira visita {data}", { origem: initVisitor.origin || traduzirUi("Visitante"), data: formatDateBR(initVisitor.visited_on) || traduzirUi("sem data") })}</div>
            <div style={{ marginTop: 10 }}>
              <Selo style={{ color: VISITOR_STAGES[stageIdx]?.color }}>{VISITOR_STAGES[stageIdx]?.name ?? currentStage}</Selo>
            </div>
          </div>
        </div>
      </div>
      <div className="drawer-body">
        <DrawerSection title={traduzirUi("Contato")}>
          <dl className="kv">
            <dt>{traduzirUi("Telefone")}</dt><dd>{initVisitor.phone || "-"}</dd>
            <AutocadastroDados visitor={initVisitor} />
            <dt>{traduzirUi("Como chegou")}</dt><dd>{initVisitor.origin || traduzirUi("Visitante")}</dd>
            <dt>{traduzirUi("Responsável")}</dt><dd>{owner?.name || traduzirUi("sem dono fixo")}</dd>
            <dt>{traduzirUi("Próximo passo")}</dt><dd><span className={`vcard-due ${initVisitor.due_status || "ok"}`}>{initVisitor.due || traduzirUi("sem prazo")}</span></dd>
          </dl>
        </DrawerSection>
        <DrawerSection title={ct(traduzirUi("{Caminhada} de integração"))}>
          <div style={{ display: "flex", gap: 6 }}>
            {VISITOR_STAGES.map((s, i) => (
              <div key={s.id} style={{ flex: 1, textAlign: "center" }}>
                <div style={{ height: 5, borderRadius: 3, background: i <= stageIdx ? s.color : "var(--ink)" }} />
                <div style={{ fontSize: "var(--fs-pn-12)", color: i <= stageIdx ? "var(--light)" : "var(--muted)", marginTop: 7 }}>{s.name}</div>
              </div>
            ))}
          </div>
          {stageIdx < VISITOR_STAGES.length - 1
            ? <Botao variante="principal" compacto style={{ marginTop: 16, width: "100%", justifyContent: "center" }} onClick={avancar} desativado={saving}>{traduzirUi("Mover para {etapa}", { etapa: VISITOR_STAGES[stageIdx + 1]?.name ?? "" })}</Botao>
            : (
              <div className="vmember-cta">
                <div className="vmember-t"><Icon name="ok" size={13} /> {traduzirUi("Chegou a membro")}</div>
                <div className="vmember-s">{traduzirUi("Complete os dados cadastrais para liberar o acesso ao app.")}</div>
                {initVisitor.member_id
                  ? <Botao variante="principal" compacto style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => { onClose(); onOpenMember(initVisitor.member_id!); }}>{traduzirUi("Ver ficha")}</Botao>
                  : (
                    <Botao variante="principal" compacto style={{ width: "100%", justifyContent: "center", marginTop: 12 }} onClick={() => setModal({
                      eyebrow: traduzirUi("Criar"),
                      title: traduzirUi("Completar dados de membro"),
                      subtitle: traduzirUi("Finalize o cadastro para liberar o acesso ao app."),
                      saveLabel: traduzirUi("Adicionar membro"),
                      formFields: [
                        { k: "nome", label: traduzirUi("Nome completo"), type: "text", req: true, ph: traduzirUi("Como a pessoa se chama"), value: initVisitor.name },
                        { k: "tel", label: traduzirUi("Telefone (WhatsApp)"), type: "text", half: true, ph: "(11) 9...", value: initVisitor.phone ?? "" },
                        { k: "email", label: traduzirUi("E-mail"), type: "text", half: true, req: true, ph: traduzirUi("usado para entrar no app") },
                        { k: "nasc", label: traduzirUi("Aniversário"), type: "date", half: true },
                        { k: "bairro", label: traduzirUi("Bairro"), type: "text", half: true, ph: traduzirUi("Onde mora") },
                      ],
                      action: { kind: "member", visitorId: initVisitor.id },
                    })}>{traduzirUi("Completar dados de membro →")}</Botao>
                  )}
              </div>
            )
          }
        </DrawerSection>
        <DrawerSection title={traduzirUi("Registrar contato")}>
          {currentReply && <div className={`vresp-now ${currentReply}`}>{currentReply === "respondeu" ? traduzirUi("Último contato: respondeu") : traduzirUi("Último contato: sem resposta, refazer")}</div>}
          <textarea className="textarea" placeholder={traduzirUi("O que rolou nesse contato? (ligação, WhatsApp, visita...)")} value={nota} onChange={(e) => setNota(e.target.value)} />
          <div className="vresp-pick">
            <span className="vresp-lbl">{traduzirUi("A pessoa respondeu?")}</span>
            <div className="seg-check">
              <Acao className={`seg-chip ${resp === "respondeu" ? "on" : ""}`} onClick={() => setResp(resp === "respondeu" ? "" : "respondeu")}>{traduzirUi("Respondeu")}</Acao>
              <Acao className={`seg-chip ${resp === "sem_resposta" ? "on" : ""}`} onClick={() => setResp(resp === "sem_resposta" ? "" : "sem_resposta")}>{traduzirUi("Não respondeu")}</Acao>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Botao variante="principal" compacto onClick={addNota} desativado={saving}>{saving ? traduzirUi("Salvando…") : traduzirUi("Salvar no histórico")}</Botao>
          </div>
        </DrawerSection>
        <DrawerSection title={traduzirUi("Histórico de contato")}>
          {visitorNotes.length > 0
            ? (
              <Etapas rotulo={traduzirUi("Histórico de contato")} itens={visitorNotes.map((n): Etapa => ({ id: n.id, estado: "feito", tom: n.is_milestone ? undefined : "neutro", detalhe: n.body, quando: formatDateBR(n.happened_on || n.created_at) || undefined, por: n.author || undefined }))} />
            )
            : <div style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{traduzirUi("Nenhum contato registrado ainda.")}</div>}
        </DrawerSection>
      </div>
    </DrawerShell>
  );
}
