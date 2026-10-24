"use client";

import { plural } from "../../../lib/plural";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../../lib/supabase-browser";
import { Icon } from "../../../lib/icons";
import { useTermos } from "../../../lib/vocabulario-context";
import { Av } from "../../ui";
import type { PersonView, TagView } from "../../tipos";
import { Botao } from "../../../ui/Botao";
import { Acao } from "../../../ui/Acao";
import { Vazio } from "../../../ui/Estados";
import { Janela } from "../../../ui/Janela";

export function TagElencoModal({
  tag, people, onClose,
}: {
  tag: TagView;
  people: PersonView[];
  onClose: () => void;
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [localTag, setLocalTag] = useState(tag);
  const [localPeople, setLocalPeople] = useState(people);

  const lista = localPeople.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const dentro = localPeople.filter((p) => p.tags.includes(tag.id)).length;

  const toggleElenco = async (personId: string) => {
    const pessoa = localPeople.find((p) => p.id === personId);
    if (!pessoa) return;
    const dentroAgora = pessoa.tags.includes(tag.id);
    const nextTags = dentroAgora ? pessoa.tags.filter((x) => x !== tag.id) : [...pessoa.tags, tag.id];
    const removendoLider = dentroAgora && localTag.leaders.includes(personId);
    const nextLeaders = removendoLider ? localTag.leaders.filter((x) => x !== personId) : localTag.leaders;

    setLocalPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, tags: nextTags } : p)));
    if (removendoLider) setLocalTag((prev) => ({ ...prev, leaders: nextLeaders }));

    const supabase = createServiceBrowserClient();
    await supabase.schema("service").from("people").update({ tags: nextTags }).eq("id", personId);
    if (removendoLider) await supabase.schema("service").from("tags").update({ leaders: nextLeaders }).eq("id", tag.id);
    router.refresh();
  };

  const toggleLider = async (personId: string) => {
    const ehLider = localTag.leaders.includes(personId);
    const nextLeaders = ehLider ? localTag.leaders.filter((x) => x !== personId) : [...localTag.leaders, personId];
    const pessoa = localPeople.find((p) => p.id === personId);
    const precisaEntrarNoElenco = !ehLider && pessoa && !pessoa.tags.includes(tag.id);
    const nextTags = precisaEntrarNoElenco ? [...(pessoa?.tags ?? []), tag.id] : pessoa?.tags ?? [];

    setLocalTag((prev) => ({ ...prev, leaders: nextLeaders }));
    if (precisaEntrarNoElenco) setLocalPeople((prev) => prev.map((p) => (p.id === personId ? { ...p, tags: nextTags } : p)));

    const supabase = createServiceBrowserClient();
    await supabase.schema("service").from("tags").update({ leaders: nextLeaders }).eq("id", tag.id);
    if (precisaEntrarNoElenco) await supabase.schema("service").from("people").update({ tags: nextTags }).eq("id", personId);
    router.refresh();
  };

  return (
    <Janela larga sobretitulo={<>Frente · {tag.name}</>} titulo={<>Quem serve nos {tag.name}</>} aoFechar={onClose} cabecalho={<>
          <div className="modal-sub">
            {ct("Marque os {voluntarios} que fazem parte deste time.")} Toque na estrela para definir quem é líder do time. {plural(dentro, "marcado")}.
          </div>
      </>} corpoBloco rodape={<>
          <Botao variante="principal" onClick={onClose}>Concluído</Botao>
      </>}>
      <div className="tb-search" style={{ marginBottom: 14 }}>
        <span className="si"><Icon name="buscar" size={13} /></span>
        <input placeholder={ct("Buscar {voluntario}...")} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
      </div>
      {lista.map((p) => {
        const on = p.tags.includes(tag.id);
        const lider = localTag.leaders.includes(p.id);
        return (
          <div className={`flag-row${on ? " on" : ""}`} key={p.id} style={{ cursor: "pointer" }} onClick={() => toggleElenco(p.id)}>
            <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
            <div className="flag-main">
              <div className="flag-nome">{p.name}{lider && <span style={{ marginLeft: 8, fontSize: "var(--fs-pn-12)", color: "var(--amber)", display: "inline-flex", alignItems: "center", gap: 4 }}><Icon name="estrela" size={12} /> líder</span>}</div>
            </div>
            <Acao
              title={lider ? "Remover como líder" : "Tornar líder do time"}
              aria-label={lider ? "Remover como líder" : "Tornar líder do time"}
              aria-pressed={lider}
              onClick={(e) => { e.stopPropagation(); toggleLider(p.id); }}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: "var(--fs-pn-16)", color: lider ? "var(--amber)" : "var(--muted)" }}
            >
              <Icon name="estrela" size={16} />
            </Acao>
          </div>
        );
      })}
      {lista.length === 0 && <Vazio titulo="Ninguém encontrado." />}
    </Janela>
  );
}
