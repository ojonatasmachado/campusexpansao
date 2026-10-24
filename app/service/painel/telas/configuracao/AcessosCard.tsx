"use client";

import { plural } from "../../../lib/plural";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createServiceBrowserClient } from "../../../lib/supabase-browser";
import { Icon } from "../../../lib/icons";
import { useTermos } from "../../../lib/vocabulario-context";
import { useServiceAccess } from "../../../AccessContext";
import { Av } from "../../ui";
import { ACESSO_FIN_LANCAR, ACESSO_FIN_VER } from "../../../modules/financeiro/manifest";
import { CEX_ICON_FOR } from "../../comum";
import type { ChurchView, PersonView } from "../../tipos";
import { Interruptor } from "../../../ui/Interruptor";
import { Opcao } from "../../../ui/Opcao";
import { Linha } from "../../../ui/Linha";
import { Vazio } from "../../../ui/Estados";
import { ACESSO_ROTAS } from "./constantes";

export function AcessosCard({
  people,
  church,
  currentRole,
  onlyPersonId,
}: {
  /* dentro da ficha da pessoa: só os acessos dela, sem a lista */
  onlyPersonId?: string;
  people: PersonView[];
  church: ChurchView | undefined;
  currentRole: "master" | "pastor" | "lider" | "membro";
}) {
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  const { personGrants, currentPersonId } = useServiceAccess();
  const [q, setQ] = useState("");
  const [selectedIdState, setSelectedId] = useState<string | null>(null);
  const selectedId = onlyPersonId ?? selectedIdState;
  const [erro, setErro] = useState("");
  const podeDelegar = currentRole === "master";
  const pessoa = people.find((p) => p.id === selectedId) ?? null;
  const lista = people.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()));
  const grantsDe = (personId: string) => personGrants.filter((g) => g.personId === personId).map((g) => g.code);
  const pessoaGrants = pessoa ? grantsDe(pessoa.id) : [];
  const ehDelegado = pessoaGrants.includes("acessos.delegar");
  /* liberações vivem em service.person_grants (migração 0043); o banco só
     deixa master/pastor/delegado gravar, e só master mexe em 'acessos.delegar' */
  const toggleGrant = async (code: string) => {
    if (!pessoa || !church?.organizationId) return;
    setErro("");
    const db = createServiceBrowserClient().schema("service").from("person_grants");
    const { error } = pessoaGrants.includes(code)
      ? await db.delete().eq("person_id", pessoa.id).eq("grant_code", code)
      : await db.insert({ organization_id: church.organizationId, person_id: pessoa.id, grant_code: code, granted_by: currentPersonId });
    if (error) setErro("Não foi possível salvar. Você pode não ter permissão para liberar esse acesso.");
    router.refresh();
  };
  return (
    <div className={onlyPersonId ? "" : "cfg-grid2"}>
      {!onlyPersonId && (
      <div className="cfg-card">
        <div className="cfg-card-t">Quem pode acessar o quê</div>
        <div className="cfg-card-s">Líderes já enxergam toda a Operação. Aqui você abre telas extras para uma pessoa específica, Membros, Visitantes, Times... Escolha a pessoa e marque o que ela pode ver.</div>
        <div className="tb-search" style={{ marginBottom: 12 }}>
          <span className="si"><Icon name="buscar" size={13} /></span>
          <input placeholder="Buscar pessoa pelo nome..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="acesso-list">
          {lista.slice(0, 40).map((p) => {
            const n = grantsDe(p.id).filter((c) => c !== "acessos.delegar").length;
            return (
              <Opcao key={p.id} marcada={selectedId === p.id} estilo="flag-row" onClick={() => setSelectedId(p.id)}>
                <Av name={p.name} size="sm" photoUrl={p.photoUrl} />
                <div className="flag-main"><div className="flag-nome">{p.name}</div><div className="flag-meta">{n ? `${plural(n, "acesso extra", "acessos extras")}` : "sem acesso extra"}</div></div>
              </Opcao>
            );
          })}
          {lista.length === 0 && <Vazio titulo="Ninguém encontrado." />}
        </div>
      </div>
      )}

      <div className="cfg-card">
        {!pessoa && <Vazio titulo="Escolha uma pessoa na lista para liberar telas." />}
        {pessoa && (
          <>
            <div className="cfg-card-t">Acessos de {pessoa.name.split(" ")[0]}</div>
            <div className="cfg-card-s">Marque as telas que {pessoa.name.split(" ")[0]} pode abrir além do padrão do papel.</div>
            <div className="acesso-toggles">
              {ACESSO_ROTAS.map((r) => {
                const on = pessoaGrants.includes(r.id);
                return (
                  <Opcao key={r.id} marcada={on} estilo="acesso-tog" onClick={() => toggleGrant(r.id)}>
                    <span className="acesso-tog-ic"><Icon name={CEX_ICON_FOR[r.id] ?? "config"} size={15} /></span>
                    <span className="acesso-tog-l">{ct(r.label)}</span>
                    <span className={`acesso-tog-sw${on ? " on" : ""}`} />
                  </Opcao>
                );
              })}
            </div>
            {/* financeiro (0073): só dono, master e pastor liberam; o banco confere */}
            {(currentRole === "master" || currentRole === "pastor") && (
              <div className="fin-acesso">
                <div className="cfg-row-t">Financeiro</div>
                <div className="cfg-row-s">Dízimo de cada pessoa é dado sensível. Libere só para quem cuida do caixa.</div>
                <div className="acesso-toggles">
                  {([[ACESSO_FIN_VER, "Ver o financeiro"], [ACESSO_FIN_LANCAR, "Ver e lançar"]] as const).map(([code, label]) => {
                    const on = pessoaGrants.includes(code);
                    return (
                      <Opcao key={code} marcada={on} estilo="acesso-tog" aria-pressed={on} onClick={() => toggleGrant(code)}>
                        <span className="acesso-tog-ic"><Icon name="carteira" size={15} /></span>
                        <span className="acesso-tog-l">{label}</span>
                        <span className={`acesso-tog-sw${on ? " on" : ""}`} />
                      </Opcao>
                    );
                  })}
                </div>
              </div>
            )}
            <Linha estilo="config" style={{ marginTop: 18 }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Pode liberar acessos a outras pessoas</div>
                <div className="cfg-row-s">{ehDelegado ? "É um delegado de acessos" : "Só vê os próprios acessos"}</div>
              </div>
              <Interruptor ligado={ehDelegado} rotulo="Pode liberar acessos a outras pessoas" desativado={!podeDelegar} onClick={() => toggleGrant("acessos.delegar")} />
            </Linha>
            {erro && <div className="field-error" style={{ marginTop: 8 }}>{erro}</div>}
            {!podeDelegar && <div style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)", marginTop: 8 }}>Só a Direção (master) define quem pode delegar acessos.</div>}
          </>
        )}
      </div>
    </div>
  );
}
