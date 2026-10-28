"use client";

import { useState } from "react";
import { createServiceBrowserClient } from "../../../lib/supabase-browser";
import { useTermos } from "../../../lib/vocabulario-context";
import { timelineEventPayload } from "../../comum";
import type { ChurchView, FellowshipGroupView, MemberView } from "../../tipos";
import { Botao } from "../../../ui/Botao";
import { Campo, Entrada } from "../../../ui/Campo";
import { Selecao } from "../../../ui/Selecao";
import { SeletorData } from "../../../ui/Data";
import { Janela } from "../../../ui/Janela";

export function MemberEditModal({
  member, fellowshipGroups, church, onClose, onRefresh,
}: {
  member: MemberView;
  fellowshipGroups: FellowshipGroupView[];
  church: ChurchView | undefined;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const { termo } = useTermos();
  const [birth, setBirth] = useState(member.birth ?? "");
  const [neighborhood, setNeighborhood] = useState(member.neighborhood ?? "");
  const [groupId, setGroupId] = useState(member.groupId ?? "");
  const [family, setFamily] = useState(member.family ?? "");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    const sb = createServiceBrowserClient().schema("service");
    await sb.from("members").update({
      birth: birth || null,
      neighborhood: neighborhood.trim() || null,
      group_id: groupId || null,
      family: family.trim() || null,
    }).eq("id", member.id);
    if (groupId && groupId !== (member.groupId ?? "") && church?.organizationId) {
      const group = fellowshipGroups.find((g) => g.id === groupId);
      await sb.from("timeline_events").insert(
        timelineEventPayload(church.organizationId, member.id, "integracao", `Entrou no ${termo("grupo")}${group?.name ? ` "${group.name}"` : ""}`),
      );
      const journey = [...member.journey];
      journey[3] = 1;
      await sb.from("members").update({ journey }).eq("id", member.id);
    }
    onRefresh();
    onClose();
  };

  return (
    <Janela sobretitulo="Editar dados" titulo={member.name} texto="Aniversário, bairro, grupo de comunhão e família." aoFechar={onClose} corpoBloco rodape={<>
          <Botao onClick={onClose}>Cancelar</Botao>
          <Botao variante="principal" desativado={saving} onClick={salvar}>Salvar</Botao>
      </>}>
      <Campo rotulo="Aniversário"><SeletorData valor={birth} aoMudar={setBirth} limpavel /></Campo>
      <Campo rotulo="Bairro"><Entrada value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Onde mora" /></Campo>
      {(church?.settings?.gruposCfg?.ativo ?? true) && (
        <Campo rotulo={termo("grupo")}>
          <Selecao valor={groupId} aoMudar={setGroupId} vazio="Sem grupo" opcoes={fellowshipGroups.map((g) => ({ v: g.id, l: g.name }))} />
        </Campo>
      )}
      <Campo rotulo="Família"><Entrada value={family} onChange={(e) => setFamily(e.target.value)} placeholder="ex: Família Lima (agrupa parentes na ficha)" /></Campo>
    </Janela>
  );
}
