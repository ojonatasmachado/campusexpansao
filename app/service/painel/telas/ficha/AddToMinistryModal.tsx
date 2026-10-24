"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../../lib/supabase-browser";
import { Icon } from "../../../lib/icons";
import { useTermos } from "../../../lib/vocabulario-context";
import { Av } from "../../ui";
import { timelineEventPayload } from "../../comum";
import type { MemberView, MinistryView, PersonView } from "../../tipos";
import { Botao, botaoClasse } from "../../../ui/Botao";
import { Campo } from "../../../ui/Campo";
import { Selecao } from "../../../ui/Selecao";
import { Vazio } from "../../../ui/Estados";
import { Janela } from "../../../ui/Janela";

export function AddToMinistryModal({
  ministry, people, members, church, onClose,
}: {
  ministry: MinistryView;
  people: PersonView[];
  members: MemberView[];
  church: { id: string; organizationId: string };
  onClose: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [positionId, setPositionId] = useState("");
  const inMinistryIds = new Set(ministry.people.map((link) => link.personId));
  const fora = people.filter((p) => !inMinistryIds.has(p.id) && (!q || p.name.toLowerCase().includes(q.toLowerCase())));

  const add = async (personId: string) => {
    const position = ministry.positions.find((p) => p.id === positionId);
    await createServiceBrowserClient().schema("service").from("person_ministries").insert({
      organization_id: church.organizationId,
      ministry_id: ministry.id,
      person_id: personId,
      is_leader: false,
      functions: position ? [position.name] : [],
    });
    const member = members.find((m) => m.volunteerId === personId);
    if (member) {
      const sb = createServiceBrowserClient().schema("service");
      await sb.from("timeline_events").insert(
        timelineEventPayload(church.organizationId, member.id, "time", `Começou a servir em "${ministry.name}"`),
      );
      const journey = [...member.journey];
      journey[4] = 1;
      await sb.from("members").update({ journey }).eq("id", member.id);
    }
    router.refresh();
    onClose();
  };

  return (
    <Janela acima sobretitulo="Adicionar ao time" titulo={ministry.name} texto={ct("Escolha o {voluntario} e, se souber, a função dele neste time.")}
      aoFechar={onClose} corpoBloco rodape={<Botao onClick={onClose}>Fechar</Botao>}>
          {ministry.positions.length > 0 && (
            <Campo rotulo="Função (opcional)" style={{ marginBottom: 14 }}>
              <Selecao valor={positionId} aoMudar={setPositionId} vazio="Sem função definida" opcoes={ministry.positions.map((p) => ({ v: p.id, l: p.name }))} />
            </Campo>
          )}
          <div className="tb-search" style={{ marginBottom: 12 }}>
            <span className="si"><Icon name="buscar" size={13} /></span>
            <input placeholder={ct("Buscar {voluntario}...")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
          </div>
          {fora.map((p) => (
            <div className="flag-row" key={p.id} style={{ cursor: "pointer" }} onClick={() => add(p.id)}>
              <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
              <div className="flag-main"><div className="flag-nome">{p.name}</div></div>
              <span className={botaoClasse({ variante: "discreto", compacto: true })} style={{ marginLeft: "auto" }}>Adicionar</span>
            </div>
          ))}
          {fora.length === 0 && <Vazio titulo={q ? "Nenhum resultado." : ct("Todos os {voluntarios} já estão no time.")} />}
    </Janela>
  );
}
