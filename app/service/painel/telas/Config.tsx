"use client";

import { FusoField } from "../../modules/configuracao/FusoField";
import { fusoValido, normalizarFuso } from "../../lib/fuso";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { Fragment, useId, useRef, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "../../lib/upload-image";
import { Icon } from "../../lib/icons";
import { type BrandCfg } from "../../lib/theme";
import { AccentField } from "../../AccentField";
import ThemePicker from "../../ThemePicker";
import { PublicPageEditor } from "../../PublicPageEditor";
import { ContribuirConfig } from "../../modules/contribuir/ContribuirConfig";
import { LogoField, BackgroundField } from "../../IdentidadeFields";
import { useChurchSettingsField, useChurchSettingsValor } from "../../lib/settings-field";
import { normalizarVocabulario, vocabularioParaGravar, LIMITE_CURTO, LIMITE_TELA, TERMOS, TERMOS_IDS, type Vocabulario } from "../../lib/vocabulario";
import { useTermos } from "../../lib/vocabulario-context";
import { IDENTIDADE_CFG_DEFAULT } from "../../../lib/church-page";
import type { IdentidadeCfg } from "../../../lib/church-page";
import { useServiceAccess } from "../../AccessContext";
import CepInput from "../../CepInput";
import { HelpDot } from "../../HelpSystem";
import { Av, PageHead } from "../ui";
import { FormScreen, FormSection, type FormScreenHandle } from "../form/FormScreen";
import { ACESSO_FIN_LANCAR, ACESSO_FIN_VER } from "../../modules/financeiro/manifest";
import { ESCALA_DEFAULT, type EscalaSettings } from "../../modules/escalas/regras";
import { friendlyWriteError } from "../erros";
import { EntradaConfig } from "../../modules/entrada/EntradaConfig";
import { GrupoEditModal } from "../../modules/grupos/GrupoEditModal";
import { cfgTabs as gerarCfgTabs } from "../../modules/registry";
import { ACOES_V2, CEX_ICON_FOR, PAPEIS_V2, ligadosDa, matrizComFallback } from "../comum";
import { TimePicker } from "../campos";
import { MinisterioEditModal, RequisitosServirCard } from "./Times";
import { Espacos } from "./Agenda";
import { TurmasKids } from "./Kids";
import { PesquisasView } from "./Pesquisas";
import type { ChurchView, CourseView, FellowshipGroupView, GruposCfg, KidsClassView, MatrizV2, MinisterialTitleView, MinistryView, ModalState, PapelV2, PersonView, ReservationView, RoomView, StatusCriterios, TagView } from "../tipos";

import { Botao } from "../../ui/Botao";
import { Interruptor } from "../../ui/Interruptor";
import { Acao } from "../../ui/Acao";
import { Opcao } from "../../ui/Opcao";
import { Linha } from "../../ui/Linha";
import { Etiqueta, Selo } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
export const STATUS_CFG_DEFAULT: StatusCriterios = { recusasInativando: 2, recusasInativo: 4, diasIndispInativo: 30, considerarFerias: false };
export const GRUPOS_CFG_DEFAULT: GruposCfg = { ativo: true, termo: "Grupos de Comunhão", termoP: "Grupo de Comunhão", sigla: "GC" };

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];


/* telas extras liberáveis pessoa a pessoa, além do que o papel já dá
   (Configurações → Acessos por pessoa). Só rotas que já têm entrada real
   no menu lateral. */
export const ACESSO_ROTAS: { id: string; label: string }[] = [
  { id: "painel", label: "Início" },
  { id: "membros", label: "Pessoas" },
  { id: "pessoas", label: "{Voluntarios}" },
  { id: "times", label: "Times" },
  { id: "visitantes", label: "Visitantes" },
  { id: "batismos", label: "Batismos" },
  { id: "cursos", label: "Cursos e trilhas" },
  { id: "relatorios", label: "Relatórios" },
  { id: "secretaria", label: "Secretaria" },
  { id: "marca", label: "Personalização (cor e logo)" },
  { id: "pesquisas", label: "Pesquisas" },
  { id: "oracao", label: "Pedidos de oração" },
];


export const TAG_CORES = [
  { v: "olive", l: "Oliva" },
  { v: "wheat", l: "Trigo" },
  { v: "clay", l: "Argila" },
  { v: "terra", l: "Terracota" },
  { v: "sand", l: "Areia" },
  { v: "amber", l: "Âmbar" },
  { v: "rust", l: "Ferrugem" },
];

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
          {lista.length === 0 && <div className="empty" style={{ padding: "16px 0" }}>Ninguém encontrado.</div>}
        </div>
      </div>
      )}

      <div className="cfg-card">
        {!pessoa && <div className="empty" style={{ padding: "30px 0" }}>Escolha uma pessoa na lista para liberar telas.</div>}
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
    <div className="modal-bg" onClick={onClose}>
      <div className="modal wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="modal-eyebrow">Frente · {tag.name}</div>
          <div className="modal-title">Quem serve nos {tag.name}</div>
          <div className="modal-sub">
            {ct("Marque os {voluntarios} que fazem parte deste time.")} Toque na estrela para definir quem é líder do time. {plural(dentro, "marcado")}.
          </div>
        </div>
        <div className="modal-body" style={{ display: "block" }}>
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
          {lista.length === 0 && <div className="empty">Ninguém encontrado.</div>}
        </div>
        <div className="modal-foot">
          <Botao variante="principal" onClick={onClose}>Concluído</Botao>
        </div>
      </div>
    </div>
  );
}

export function CongregacaoEditModal({
  churchRow, ministries, tags, onClose, onRefresh,
}: {
  churchRow: ChurchView;
  ministries: MinistryView[];
  tags: TagView[];
  onClose: () => void;
  onRefresh: () => void;
}) {
  const churchMinistries = ministries.filter((m) => m.churchId === churchRow.id);
  const churchTags = tags.filter((t) => t.churchId === churchRow.id);
  const [form, setForm] = useState({
    nome: churchRow.nome,
    cidade: churchRow.cidade ?? "",
    doc: churchRow.doc ?? "",
    fundada: churchRow.foundedYear ?? "",
    endereco: churchRow.address ?? "",
    cep: churchRow.postalCode ?? "",
    email: churchRow.email ?? "",
    tel: churchRow.phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const telaRef = useRef<FormScreenHandle>(null);
  const fid = useId();
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const salvar = async () => {
    if (!form.nome.trim()) return;
    setSaving(true);
    setError("");
    const { error: erro } = await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({
        name: form.nome.trim(),
        city: form.cidade.trim() || null,
        doc: form.doc.trim() || null,
        founded_year: form.fundada.trim() || null,
        address: form.endereco.trim() || null,
        postal_code: form.cep.trim() || null,
        email: form.email.trim() || null,
        phone: form.tel.trim() || null,
      })
      .eq("id", churchRow.id);
    if (erro) { setSaving(false); setError(friendlyWriteError(erro.message)); return; }
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
    onRefresh();
  };

  const retrato = JSON.stringify(form);
  const [retratoInicial] = useState(retrato);

  return (
    <FormScreen
      ref={telaRef}
      eyebrow={churchRow.matriz ? "Matriz · rede" : "Congregação"}
      title={form.nome.trim() || churchRow.nome}
      saveLabel="Salvar"
      saving={saving}
      missing={form.nome.trim() ? [] : ["nome"]}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      <FormSection title="Congregação">
        <div className="fs-grid">
          <div className="field"><label className="field-label req" htmlFor={`${fid}-nome`}>Nome</label><input id={`${fid}-nome`} className="input" aria-required="true" value={form.nome} onChange={set("nome")} /></div>
          <div className="field"><label className="field-label" htmlFor={`${fid}-cid`}>Cidade ou bairro</label><input id={`${fid}-cid`} className="input" value={form.cidade} onChange={set("cidade")} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-doc`}>CNPJ</label><input id={`${fid}-doc`} className="input" autoCapitalize="characters" value={form.doc} onChange={set("doc")} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-ano`}>Ano de fundação</label><input id={`${fid}-ano`} className="input" inputMode="numeric" value={form.fundada} onChange={set("fundada")} /></div>
        </div>
      </FormSection>

      <FormSection title="Endereço e contato">
        <div className="fs-grid">
          <div className="field"><label className="field-label" htmlFor={`${fid}-end`}>Endereço</label><input id={`${fid}-end`} className="input" autoComplete="street-address" value={form.endereco} onChange={set("endereco")} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-cep`}>CEP</label>{/* consulta o CEP: põe a congregação no mapa da igreja */}<CepInput id={`${fid}-cep`} value={form.cep} onChange={(v) => setForm((p) => ({ ...p, cep: v }))} onResult={() => {}} /></div>
          <div className="field half"><label className="field-label" htmlFor={`${fid}-tel`}>Telefone</label><input id={`${fid}-tel`} className="input" type="tel" autoComplete="tel" value={form.tel} onChange={set("tel")} /></div>
          <div className="field"><label className="field-label" htmlFor={`${fid}-mail`}>E-mail</label><input id={`${fid}-mail`} className="input" type="email" autoComplete="email" value={form.email} onChange={set("email")} /></div>
        </div>
      </FormSection>

      <FormSection title="Times desta congregação">
        {churchMinistries.map((m) => {
          const leader = m.people.find((p) => p.isLeader);
          return (
            <Linha estilo="config" key={m.id}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{m.name}</div>
                <div className="cfg-row-s">{leader ? `líder ${leader.personName}` : "sem líder definido"}</div>
              </div>
            </Linha>
          );
        })}
        {churchMinistries.length === 0 && <p className="fs-note">Nenhum time cadastrado nesta congregação.</p>}
      </FormSection>

      <FormSection title="Etiquetas">
        <div className="cell-tags" style={{ gap: 8 }}>
          {churchTags.map((t) => <span key={t.id} className="papel-tag">{t.name}</span>)}
        </div>
        {churchTags.length === 0 && <p className="fs-note">Nenhuma etiqueta cadastrada nesta congregação.</p>}
      </FormSection>
    </FormScreen>
  );
}

export function Config({
  church,
  churches,
  ministries,
  people,
  rooms,
  reservations,
  kidsClasses,
  currentRole,
  currentExtraAccess = [],
  ministerialTitles,
  fellowshipGroups,
  tags,
  courses,
  setModal,
  permissionsMatrix,
  only,
  embedded,
}: {
  /* abre uma aba só, sem a fileira de abas (telas que saíram de Configurações para o menu) */
  only?: string;
  /* dentro de outra tela (ex.: funções dos times em Times): sem cabeçalho de página */
  embedded?: boolean;
  church?: ChurchView;
  churches: ChurchView[];
  ministries: MinistryView[];
  people: PersonView[];
  rooms: RoomView[];
  reservations: ReservationView[];
  kidsClasses: KidsClassView[];
  currentRole: "master" | "pastor" | "lider" | "membro";
  currentExtraAccess?: string[];
  ministerialTitles: MinisterialTitleView[];
  fellowshipGroups: FellowshipGroupView[];
  tags: TagView[];
  courses: CourseView[];
  setModal: (modal: ModalState) => void;
  permissionsMatrix: Record<string, Record<string, boolean>>;
}) {
  const cid = useId();
  const { comTermos: ct } = useTermos();
  const router = useRouter();
  /* alguém sem acesso geral a Configurações, mas liberado só pra abas específicas
     (Config → Acessos por pessoa: "marca" ou "pesquisas"), só enxerga essas abas. */
  /* abas de Configurações : geradas pelo registro de módulos, só dos ligados */
  const CFG_TABS = gerarCfgTabs(ligadosDa(church));
  const somenteExtras = currentRole !== "master" && currentRole !== "pastor"
    ? CFG_TABS.filter((t) => (t.id === "visual" && currentExtraAccess.includes("marca")) || (t.id === "pesquisas" && currentExtraAccess.includes("pesquisas")))
    : null;
  const cfgTabs = somenteExtras && somenteExtras.length > 0 ? somenteExtras : CFG_TABS;
  const [tabState, setTab] = useState(cfgTabs[0]?.id ?? "igreja");
  const tab = only ?? tabState;
  /* celular: lista primeiro; ao escolher, abre a página com voltar */
  const [cfgAberta, setCfgAberta] = useState(false);
  const ONLY_HEAD: Record<string, { t: string; s: string }> = {
    grupos: { t: ct("{Grupos}"), s: "Os pequenos grupos da igreja: nome, líderes, dia e lugar." },
    pesquisas: { t: "Pesquisas", s: "Perguntas para a igreja responder pelo app, com resultado em tempo real." },
    pagina: { t: "Página da igreja", s: "O link da bio: o que aparece, a ordem e as cores da página." },
  };
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [tagNomeEdit, setTagNomeEdit] = useState("");
  const [elencoTag, setElencoTag] = useState<TagView | null>(null);
  const [gerirCongId, setGerirCongId] = useState<string | null>(null);
  const [gerirGrupoId, setGerirGrupoId] = useState<string | null>(null);

  /* church.address guarda rua + número já combinados numa string só (mesmo
     formato que o lookup de CNPJ monta : "logradouro, numero"). Pra poder
     reaproveitar isso no autopreenchimento por CEP, separa na 1ª vírgula ao
     carregar : dado legado sem vírgula cai inteiro em "rua", sem número. */
  const [addrLegacyRua, addrLegacyNumero] = (() => {
    const full = church?.address ?? "";
    const idx = full.indexOf(",");
    return idx === -1 ? [full, ""] : [full.slice(0, idx).trim(), full.slice(idx + 1).trim()];
  })();
  const [igrejaForm, setIgrejaForm] = useState({
    fuso: normalizarFuso(church?.timeZone),
    nome: church?.nome ?? "",
    cidade: church?.cidade ?? "",
    doc: church?.doc ?? "",
    fundada: church?.foundedYear ?? "",
    rua: addrLegacyRua,
    numero: addrLegacyNumero,
    bairro: church?.neighborhood ?? "",
    estado: church?.state ?? "",
    cep: church?.postalCode ?? "",
    email: church?.email ?? "",
    tel: church?.phone ?? "",
  });
  const [igrejaLoading, setIgrejaLoading] = useState(false);
  /* o "Salvar" fixo no rodapé só aparece quando algo mudou (S49) */
  const [igrejaSalva, setIgrejaSalva] = useState(() => JSON.stringify(igrejaForm));
  const igrejaMudou = JSON.stringify(igrejaForm) !== igrejaSalva;

  const saveIgreja = async () => {
    if (!church?.id) return;
    if (!fusoValido(igrejaForm.fuso)) { avisar("Escolha um fuso horário válido.", "warn"); return; }
    setIgrejaLoading(true);
    try {
    const endereco = [igrejaForm.rua.trim(), igrejaForm.numero.trim()].filter(Boolean).join(", ");
    const { data: igrejaGravada, error: igrejaErro } = await createServiceBrowserClient()
      .schema("service")
      .from("churches")
      .update({
        time_zone: igrejaForm.fuso,
        name: igrejaForm.nome.trim() || church.nome,
        city: igrejaForm.cidade.trim() || null,
        doc: igrejaForm.doc.trim() || null,
        founded_year: igrejaForm.fundada.trim() || null,
        address: endereco || null,
        postal_code: igrejaForm.cep.trim() || null,
        neighborhood: igrejaForm.bairro.trim() || null,
        state: igrejaForm.estado.trim() || null,
        email: igrejaForm.email.trim() || null,
        phone: igrejaForm.tel.trim() || null,
      })
      .eq("id", church.id).select("id").single();
    if (igrejaErro || !igrejaGravada) { avisar(friendlyWriteError(igrejaErro?.message ?? "Não foi possível salvar."), "warn"); return; }
    setIgrejaSalva(JSON.stringify(igrejaForm));
    avisar("Dados da igreja salvos.");
    router.refresh();
    } catch { avisar("Não foi possível salvar os dados da igreja. Tente novamente.", "warn"); } finally { setIgrejaLoading(false); }
  };

  async function removeRow(table: string, id: string) {
    if (!window.confirm("Remover este registro?")) return;
    await createServiceBrowserClient().schema("service").from(table).delete().eq("id", id);
    router.refresh();
  }

  const renomearTag = async (id: string, name: string) => {
    if (!name.trim()) return;
    await createServiceBrowserClient().schema("service").from("tags").update({ name: name.trim() }).eq("id", id);
    router.refresh();
  };

  const recolorirTag = async (id: string, color: string) => {
    await createServiceBrowserClient().schema("service").from("tags").update({ color }).eq("id", id);
    router.refresh();
  };

  const [editMin, setEditMin] = useState<MinistryView | null>(null);

  /* gravações de settings em fila, lendo o banco antes (lib/settings-field):
     dois cliques seguidos num interruptor não se atropelam mais */
  const avisoFalha = (ok: boolean) => { if (!ok) avisar("Não foi possível salvar. Tente novamente.", "warn"); };
  const [escalaCfg, , salvarEscala] = useChurchSettingsField<EscalaSettings>("escala", ESCALA_DEFAULT, church, () => router.refresh());
  const setEscala = (k: keyof EscalaSettings, v: unknown) => salvarEscala({ [k]: v } as Partial<EscalaSettings>).then(avisoFalha);

  const [statusCfg, , salvarStatus] = useChurchSettingsField<StatusCriterios>("statusCfg", STATUS_CFG_DEFAULT, church, () => router.refresh());
  const setStatus = (k: keyof StatusCriterios, v: number | boolean) => salvarStatus({ [k]: v } as Partial<StatusCriterios>).then(avisoFalha);

  const [tiposEvento, , salvarTiposEvento] = useChurchSettingsValor<string[]>("tiposEvento", [], church, () => router.refresh());
  const [novoTipoEvento, setNovoTipoEvento] = useState("");
  const saveTiposEvento = (next: string[]) => salvarTiposEvento(next).then(avisoFalha);
  const addTipoEvento = () => {
    const v = novoTipoEvento.trim();
    if (v && !tiposEvento.includes(v)) saveTiposEvento([...tiposEvento, v]);
    setNovoTipoEvento("");
  };

  const [horariosCulto, , salvarHorariosCulto] = useChurchSettingsValor<string[]>("horariosCulto", [], church, () => router.refresh());
  const [novoHorarioDia, setNovoHorarioDia] = useState(DIAS_SEMANA[0]);
  const [novoHorarioHora, setNovoHorarioHora] = useState("");
  const saveHorariosCulto = (next: string[]) => salvarHorariosCulto(next).then(avisoFalha);
  const addHorarioCulto = () => {
    if (!novoHorarioHora) return;
    const v = `${novoHorarioDia} ${novoHorarioHora}`;
    if (!horariosCulto.includes(v)) {
      saveHorariosCulto([...horariosCulto, v]);
      setNovoHorarioHora("");
    }
  };

  const [checkinPermitirExtra, , salvarCheckinExtra] = useChurchSettingsValor<boolean>("checkinPermitirExtra", false, church, () => router.refresh());
  const setCheckinPermitirExtra = (v: boolean) => salvarCheckinExtra(v).then(avisoFalha);

  const [gruposCfg, setGruposCfgState, salvarGruposCfg] = useChurchSettingsField<GruposCfg>("gruposCfg", GRUPOS_CFG_DEFAULT, church, () => router.refresh());
  const saveGruposCfg = (next: GruposCfg) => salvarGruposCfg(next).then(avisoFalha);

  /* Personalização (marca + identidade) : os campos só mexem em estado
     local (patchBrand/patchIdentidade) enquanto a pessoa ajusta cor, logo,
     fundo... Nada grava sozinho no banco : um único "Salvar personalização"
     no fim da aba manda tudo de uma vez, mesmo padrão do "Dados da igreja"
     (Aba Igreja) — apply/salvar consistente em vez de um botão por campo. */
  /* a marca do app é da organização: mora na igreja matriz, mesmo quando a
     gestão está olhando uma congregação (a identidade da página da igreja
     continua por igreja) */
  const sede = churches.find((c) => c.matriz) ?? church;
  const [brand, setBrand] = useState<BrandCfg>(() => ({ ...(sede?.settings?.brandCfg ?? {}) }));
  const patchBrand = (patch: Partial<BrandCfg>) => setBrand((prev) => ({ ...prev, ...patch }));

  const [identidade, setIdentidade] = useChurchSettingsField<IdentidadeCfg>("identidadeCfg", IDENTIDADE_CFG_DEFAULT, church, () => router.refresh());
  const patchIdentidade = (patch: Partial<IdentidadeCfg>) => setIdentidade((prev) => ({ ...prev, ...patch }));

  /* vocabulário da igreja (lei 7): mora na matriz, como a marca */
  const [vocabEdit, setVocabEdit] = useState<Vocabulario>(() => normalizarVocabulario(sede?.vocabulario, sede?.settings?.gruposCfg?.termoP));
  const patchVocab = (id: keyof Vocabulario, campo: "tela" | "curto", valor: string) =>
    setVocabEdit((prev) => ({ ...prev, [id]: { ...prev[id], [campo]: valor.slice(0, campo === "tela" ? LIMITE_TELA : LIMITE_CURTO) } }));

  const [personalizacaoSaving, setPersonalizacaoSaving] = useState(false);
  const [personalizacaoMsg, setPersonalizacaoMsg] = useState("");
  const salvarPersonalizacao = async () => {
    if (!church?.id) return;
    setPersonalizacaoSaving(true);
    const db = createServiceBrowserClient().schema("service").from("churches");
    const mesmaIgreja = !sede || sede.id === church.id;
    const results = await Promise.all([
      db.update({ settings: { ...church.settings, identidadeCfg: identidade, ...(mesmaIgreja ? { brandCfg: brand } : {}) }, ...(mesmaIgreja ? { vocabulario: vocabularioParaGravar(vocabEdit) } : {}) }).eq("id", church.id).select("id"),
      ...(mesmaIgreja ? [] : [db.update({ settings: { ...sede.settings, brandCfg: brand }, vocabulario: vocabularioParaGravar(vocabEdit) }).eq("id", sede.id).select("id")]),
    ]);
    setPersonalizacaoSaving(false);
    /* sem linha de volta = o banco não gravou (sem permissão ou igreja inexistente) */
    const falhou = results.some((r) => r.error || !r.data?.length);
    setPersonalizacaoMsg(falhou ? "Não foi possível salvar" : "Salvo!");
    router.refresh();
    setTimeout(() => setPersonalizacaoMsg(""), 2000);
  };
  const identidadeBgHex = identidade.bgMode === "imagem" ? "#0E110D" : identidade.bgMode === "degrade" ? (identidade.bgFrom ?? IDENTIDADE_CFG_DEFAULT.bgFrom) : (identidade.bgColor ?? IDENTIDADE_CFG_DEFAULT.bgColor);

  const [matriz, setMatriz] = useState<MatrizV2>(() => matrizComFallback(permissionsMatrix));
  /* no celular a matriz vira: escolhe o papel em cima, liga e desliga embaixo */
  const [papelMob, setPapelMob] = useState<PapelV2>("pastor");
  const [matrizMsg, setMatrizMsg] = useState("");
  const [matrizSaving, setMatrizSaving] = useState(false);
  const toggleMx = (papel: PapelV2, acao: string) => {
    if (papel === "master" || papel === "membro") return;
    setMatriz((prev) => ({ ...prev, [papel]: { ...prev[papel], [acao]: !prev[papel][acao] } }));
  };
  const salvarMatriz = async () => {
    if (!church?.organizationId) return;
    setMatrizSaving(true);
    const rows = (Object.keys(matriz) as PapelV2[]).flatMap((papel) =>
      Object.entries(matriz[papel]).map(([acao, allowed]) => ({
        organization_id: church.organizationId,
        role: papel,
        permission_code: `service.${acao}`,
        allowed,
      })),
    );
    await createServiceBrowserClient()
      .schema("core")
      .from("role_permissions")
      .upsert(rows, { onConflict: "organization_id,role,permission_code" });
    setMatrizSaving(false);
    setMatrizMsg("Permissões salvas.");
    router.refresh();
    setTimeout(() => setMatrizMsg(""), 2000);
  };
  const gruposAcoes = Array.from(new Set(ACOES_V2.map((a) => a.grupo)));

  const head = only ? ONLY_HEAD[only] : null;
  return (
    <div className={embedded ? "content wide cfg-embedded" : "content wide"}>
      {embedded ? null : head ? (
        <PageHead title={head.t} eyebrow="" help={head.s} />
      ) : (
      <div className="ph">
        <div>
          <div className="ph-eyebrow">Configurações</div>
          <h1 className="ph-title">Configurações <HelpDot text="Dados da igreja, regras de escala, permissões, marca do app e convites pra outros líderes ficam aqui." /></h1>
        </div>
      </div>
      )}

      {/* índice agrupado (S49): no computador fica à esquerda; no celular a
          lista abre cada página, com voltar */}
      <div className={only ? "" : `cfg-shell${cfgAberta ? " open" : ""}`}>
      {!only && (
        <nav className="cfg-index" aria-label="Seções de Configurações">
          {[...new Set(cfgTabs.map((t) => t.group))].map((g) => (
            <div key={g} className="cfg-index-group">
              <div className="cfg-index-gt">{g}</div>
              {cfgTabs.filter((t) => t.group === g).map((t) => (
                <Opcao key={t.id} marcada={tab === t.id} estilo="cfg-index-item" aria-current={tab === t.id ? "page" : undefined} onClick={() => { setTab(t.id); setCfgAberta(true); }}>
                  <span className="cfg-index-t">{ct(t.label)}</span>
                  <span className="cfg-index-s">{t.s}</span>
                </Opcao>
              ))}
            </div>
          ))}
        </nav>
      )}
      <div className={only ? "" : "cfg-main"}>
      {!only && (
        <Acao className="cfg-back" onClick={() => setCfgAberta(false)}>
          <Icon name="voltar" size={18} /> Configurações
        </Acao>
      )}

      {/* ─── IGREJA ─── */}
      {tab === "igreja" && (
        <div className="cfg-grid2">
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">Dados da igreja</div>
            <div className="cfg-card-s">Como sua igreja aparece no app, nas publicações e como a secretaria pode ser encontrada.</div>
            <div className="field">
              <label className="field-label" htmlFor={`${cid}-nome`}>Nome da igreja</label>
              <input id={`${cid}-nome`} name="nome" className="input" value={igrejaForm.nome} onChange={(e) => setIgrejaForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label" htmlFor={`${cid}-doc`}>CNPJ</label><input id={`${cid}-doc`} name="doc" className="input" autoCapitalize="characters" value={igrejaForm.doc} onChange={(e) => setIgrejaForm((p) => ({ ...p, doc: e.target.value }))} /></div>
              <div className="field"><label className="field-label" htmlFor={`${cid}-fundada`}>Fundada em</label><input id={`${cid}-fundada`} name="fundada" className="input" value={igrejaForm.fundada} onChange={(e) => setIgrejaForm((p) => ({ ...p, fundada: e.target.value }))} /></div>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field">
                <label className="field-label">CEP</label>
                <CepInput
                  value={igrejaForm.cep}
                  onChange={(v) => setIgrejaForm((p) => ({ ...p, cep: v }))}
                  onResult={(data) => {
                    if (!data) return;
                    setIgrejaForm((p) => ({
                      ...p,
                      rua: data.street || p.rua,
                      bairro: data.neighborhood || p.bairro,
                      cidade: data.city || p.cidade,
                      estado: data.state || p.estado,
                    }));
                  }}
                />
              </div>
              <div className="field"><label className="field-label" htmlFor={`${cid}-numero`}>Número</label><input id={`${cid}-numero`} name="numero" className="input" inputMode="numeric" value={igrejaForm.numero} onChange={(e) => setIgrejaForm((p) => ({ ...p, numero: e.target.value }))} /></div>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label" htmlFor={`${cid}-rua`}>Rua</label><input id={`${cid}-rua`} name="rua" className="input" autoComplete="address-line1" value={igrejaForm.rua} onChange={(e) => setIgrejaForm((p) => ({ ...p, rua: e.target.value }))} /></div>
              <div className="field"><label className="field-label" htmlFor={`${cid}-bairro`}>Bairro</label><input id={`${cid}-bairro`} name="bairro" className="input" value={igrejaForm.bairro} onChange={(e) => setIgrejaForm((p) => ({ ...p, bairro: e.target.value }))} /></div>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label" htmlFor={`${cid}-cidade`}>Cidade</label><input id={`${cid}-cidade`} name="cidade" className="input" autoComplete="address-level2" value={igrejaForm.cidade} onChange={(e) => setIgrejaForm((p) => ({ ...p, cidade: e.target.value }))} /></div>
              <div className="field"><label className="field-label" htmlFor={`${cid}-estado`}>Estado</label><input id={`${cid}-estado`} name="estado" className="input" autoComplete="address-level1" value={igrejaForm.estado} onChange={(e) => setIgrejaForm((p) => ({ ...p, estado: e.target.value }))} /></div>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field"><label className="field-label" htmlFor={`${cid}-email`}>E-mail</label><input id={`${cid}-email`} name="email" className="input" type="email" autoComplete="email" inputMode="email" value={igrejaForm.email} onChange={(e) => setIgrejaForm((p) => ({ ...p, email: e.target.value }))} /></div>
              <div className="field"><label className="field-label" htmlFor={`${cid}-tel`}>Telefone</label><input id={`${cid}-tel`} name="tel" className="input" type="tel" autoComplete="tel" inputMode="tel" value={igrejaForm.tel} onChange={(e) => setIgrejaForm((p) => ({ ...p, tel: e.target.value }))} /></div>
            </div>
            <FusoField value={igrejaForm.fuso} onChange={(fuso) => setIgrejaForm((p) => ({ ...p, fuso }))} />
            {igrejaMudou && (
              <div className="save-bar">
                <span>Você tem alterações não salvas.</span>
                <Botao variante="principal" desativado={igrejaLoading} onClick={saveIgreja}>
                  {igrejaLoading ? "Salvando..." : "Salvar"}
                </Botao>
              </div>
            )}
          </div>
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">{ct("Horários de {culto}")}</div>
            <div className="cfg-card-s">Aparecem na agenda e ajudam a montar as escalas.</div>
            <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
              {horariosCulto.map((h) => (
                <span key={h} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon name="cultos" size={12} /> {h}
                  <Acao onClick={() => saveHorariosCulto(horariosCulto.filter((x) => x !== h))} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "var(--fs-pn-12)", padding: 0 }}>✕</Acao>
                </span>
              ))}
              {horariosCulto.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum horário cadastrado.</span>}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
              {DIAS_SEMANA.map((dia) => (
                <Opcao key={dia} marcada={novoHorarioDia === dia} estilo="opt" style={{ padding: "8px 12px" }} onClick={() => setNovoHorarioDia(dia)}>
                  {dia.slice(0, 3)}
                </Opcao>
              ))}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <TimePicker value={novoHorarioHora} onChange={setNovoHorarioHora} />
              <Botao desativado={!novoHorarioHora} onClick={addHorarioCulto}>Adicionar</Botao>
            </div>
          </div>
        </div>
      )}

      {/* ─── MINISTÉRIOS & FUNÇÕES ─── */}
      {tab === "min" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Times e funções</div>
          <div className="cfg-card-s">{ct("Cada time tem um líder e suas funções. As funções alimentam a escala e as habilidades de cada {voluntario}.")}</div>
          {ministries.map((m) => {
            const leader = m.people.find((p) => p.isLeader);
            return (
              <Linha estilo="config" key={m.id}>
                <div className="bd-mark"><Icon name={m.icon || "times"} size={18} /></div>
                <div className="cfg-row-main">
                  <div className="cfg-row-t">
                    {m.name}
                    {leader && <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: "var(--fs-pn-12)" }}> · líder {leader.personName.split(" ")[0]}</span>}
                  </div>
                  <div className="cell-tags" style={{ marginTop: 7 }}>
                    {m.positions.map((p) => <Etiqueta key={p.id}>{p.name}</Etiqueta>)}
                    {m.positions.length === 0 && <span style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>Sem funções</span>}
                  </div>
                </div>
                <Botao compacto onClick={() => setEditMin(m)}>Editar</Botao>
              </Linha>
            );
          })}
          {ministries.length === 0 && <div className="empty">Nenhum time ainda.</div>}
        </div>
      )}

      {tab === "min" && (
        <div className="cfg-card" style={{ marginTop: 16 }}>
          <div className="cfg-card-t">Papéis ministeriais</div>
          <div className="cfg-card-s">Os títulos que a sua igreja reconhece (Pastor, Diácono, Presbítero...). Atribuídos aos membros na ficha de cada um.</div>
          <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
            {ministerialTitles.map((t) => (
              <span key={t.id} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t.name}
                <Acao onClick={() => removeRow("ministerial_titles", t.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "var(--fs-pn-12)", padding: 0, cursor: "pointer" }}>✕</Acao>
              </span>
            ))}
            {ministerialTitles.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum papel cadastrado.</span>}
          </div>
          <Botao compacto onClick={() => setModal({ eyebrow: "Criar", title: "Novo papel ministerial", subtitle: "ex: Pastor, Diácono, Presbítero.", saveLabel: "Adicionar papel", formFields: [{ k:"nome", label:"Nome do papel", type:"text", req:true, ph:"ex: Diácono" }], action: { kind: "title" } })}>+ Papel ministerial</Botao>
        </div>
      )}

      {tab === "min" && <RequisitosServirCard />}
      {tab === "min" && (
        <div className="cfg-card" style={{ marginTop: 16 }}>
          <div className="cfg-card-t">Etiquetas</div>
          <div className="cfg-card-s">Etiquetas livres como Jovens, Kids ou Casais. Uma pessoa pode ter várias: servem para juntar pessoas de times diferentes num mesmo grupo.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "4px 0 14px" }}>
            {tags.map((t) => {
              const dentro = people.filter((p) => p.tags.includes(t.id)).length;
              const lideres = t.leaders.map((id) => people.find((p) => p.id === id)?.name.split(" ")[0]).filter(Boolean);
              return (
                <Linha estilo="config" key={t.id}>
                  <div className="cong-mark" style={{ background: "var(--ink)" }}><span style={{ width: 9, height: 9, borderRadius: "50%", background: `var(--${t.color})`, display: "inline-block" }} /></div>
                  <div className="cfg-row-main">
                    {editTagId === t.id ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <input
                          className="input"
                          style={{ flex: "1 1 140px" }}
                          value={tagNomeEdit}
                          onChange={(e) => setTagNomeEdit(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && renomearTag(t.id, tagNomeEdit)}
                          autoFocus
                        />
                        <span style={{ display: "flex", gap: 6 }}>
                          {TAG_CORES.map((c) => (
                            <Acao
                              key={c.v}
                              title={c.l}
                              onClick={() => recolorirTag(t.id, c.v)}
                              style={{ width: 20, height: 20, borderRadius: "50%", background: `var(--${c.v})`, border: t.color === c.v ? "2px solid var(--white)" : "2px solid transparent", cursor: "pointer", padding: 0 }}
                            />
                          ))}
                        </span>
                        <Botao compacto onClick={() => { renomearTag(t.id, tagNomeEdit); setEditTagId(null); }}>Pronto</Botao>
                      </div>
                    ) : (
                      <>
                        <div className="cfg-row-t">{t.name}</div>
                        <div className="cfg-row-s">
                          {plural(dentro, ct("{voluntario}"))}{lideres.length > 0 ? <> · líder: <span style={{ color: "var(--olive-soft)" }}>{lideres.join(", ")}</span></> : " · sem líder"}
                        </div>
                      </>
                    )}
                  </div>
                  {editTagId !== t.id && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Botao compacto onClick={() => setElencoTag(t)}>Elenco</Botao>
                      <Botao compacto onClick={() => { setEditTagId(t.id); setTagNomeEdit(t.name); }}>Editar</Botao>
                      <Botao compacto onClick={() => removeRow("tags", t.id)}>Remover</Botao>
                    </div>
                  )}
                </Linha>
              );
            })}
            {tags.length === 0 && <div className="empty" style={{ padding: "8px 0" }}>Nenhuma etiqueta cadastrada.</div>}
          </div>
          <Botao compacto onClick={() => setModal({ eyebrow: "Criar", title: "Nova etiqueta", subtitle: ct("Etiqueta livre para agrupar {voluntarios} (ex: Jovens, Casais)."), saveLabel: "Criar etiqueta", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: Jovens" }, { k:"cor", label:"Cor", type:"select", options: TAG_CORES }], action: { kind: "tag" } })}>+ Etiqueta</Botao>
        </div>
      )}

      {/* ─── GRUPOS & CÉLULAS ─── */}
      {tab === "grupos" && (
        <>
          <div className="cfg-card">
            <div className="cfg-card-t">Habilitar grupos</div>
            <div className="cfg-card-s">Desligue se sua igreja não trabalha com células/GCs. O recurso some do resto do app, mas nada é apagado.</div>
            <Linha estilo="config" style={{ borderBottom: gruposCfg.ativo ? "0.5px solid var(--border-2)" : "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{gruposCfg.ativo ? "Ativado" : "Desativado"}</div>
                <div className="cfg-row-s">{gruposCfg.ativo ? "Grupos aparecem no cadastro de membro e nos relatórios." : "Grupos escondidos em todo o app."}</div>
              </div>
              <Interruptor ligado={gruposCfg.ativo} rotulo="Usar grupos" onClick={() => saveGruposCfg({ ...gruposCfg, ativo: !gruposCfg.ativo })} />
            </Linha>
            {gruposCfg.ativo && (
              <div className="cfg-grid2" style={{ gap: "0 16px", marginTop: 16 }}>
                <div className="field"><label className="field-label">Nome</label><div className="cfg-row-s" style={{ marginTop: 4 }}>{ct("{Grupo}")}. O nome se muda em Personalização, em Nomes usados no app.</div></div>
                <div className="field"><label className="field-label">Sigla</label><input className="input" value={gruposCfg.sigla} onChange={(e) => setGruposCfgState({ ...gruposCfg, sigla: e.target.value })} onBlur={() => saveGruposCfg(gruposCfg)} placeholder="ex: GC" /></div>
              </div>
            )}
          </div>
          {gruposCfg.ativo && (
            <div className="cfg-card" style={{ marginTop: 16 }}>
              <div className="cfg-card-t">{ct("{Grupos}")} · {fellowshipGroups.length}</div>
              <div className="cfg-card-s">Células, GCs, pequenos grupos... a estrutura de comunhão em casas. Cada grupo tem um líder, um dia e um endereço, que os membros veem no app.</div>
              {fellowshipGroups.map((g) => {
                const leader = people.find((p) => p.id === g.leader_person_id);
                return (
                  <Linha estilo="config" key={g.id}>
                    <div className="cong-mark"><Icon name="identidade" size={16} /></div>
                    <div className="cfg-row-main">
                      <div className="cfg-row-t">{g.name}</div>
                      <div className="cfg-row-s">{[g.weekday, g.time, g.neighborhood].filter(Boolean).join(" · ") || "sem dia/local definido"}{leader ? ` · líder ${leader.name.split(" ")[0]}` : ""}{g.capacity ? ` · ${plural(g.capacity, "lugar", "lugares")}` : ""}{g.postal_code ? "" : " · sem endereço"}</div>
                    </div>
                    <Botao compacto onClick={() => setGerirGrupoId(g.id)}>Editar</Botao>
                    <Botao compacto onClick={() => removeRow("fellowship_groups", g.id)}>Remover</Botao>
                  </Linha>
                );
              })}
              {fellowshipGroups.length === 0 && <div className="empty" style={{ padding: "20px 0" }}>Nenhum grupo cadastrado ainda.</div>}
              <Botao variante="principal" compacto style={{ marginTop: 18 }} onClick={() => setModal({ eyebrow: "Criar", title: ct("Novo {grupo}"), subtitle: "Nome, líder, dia e horário. O endereço e os lugares ficam em Editar.", saveLabel: "Criar grupo", formFields: [{ k:"nome", label:"Nome", type:"text", req:true, ph:"ex: GC Centro" }, { k:"lider", label:"Líder", type:"select", half:true, ph:"A definir", options: people.map((p) => ({ v: p.name, l: p.name })) }, { k:"dia", label:"Dia", type:"text", half:true, ph:"ex: Quarta-feira" }, { k:"hora", label:"Horário", type:"text", half:true, ph:"ex: 20h" }, { k:"bairro", label:"Bairro", type:"text", half:true, ph:"ex: Centro" }], action: { kind: "group" } })}>+ Novo grupo</Botao>
            </div>
          )}
        </>
      )}

      {/* ─── ESPAÇOS & SALAS ─── */}
      {tab === "espacos" && (
        <div className="cfg-card">
          <Espacos rooms={rooms} reservations={reservations} church={church} setModal={setModal} embed />
        </div>
      )}

      {/* ─── TURMAS KIDS ─── */}
      {tab === "kids" && (
        <div className="cfg-card">
          <TurmasKids kidsClasses={kidsClasses} rooms={rooms} setModal={setModal} />
        </div>
      )}

      {/* ─── ESCALA & PRESENÇA ─── */}
      {tab === "operacao" && (
        <>
          <div className="cfg-card">
            <div className="cfg-card-t">Regras de escala</div>
            <div className="cfg-card-s">Como a escala é gerada e os limites para não sobrecarregar ninguém. Valem para o botão “Gerar” e para o modo automático.</div>
            <div className="field" style={{ marginTop: 4 }}>
              <label className="field-label">Geração</label>
              <div className="opt-row" style={{ flexWrap: "wrap" }}>
                {([["manual", "Manual", "O líder monta tudo na mão."], ["assistido", "Assistida", "O sistema sugere; o líder confirma cada nome."], ["automatico", "Automática", "O sistema gera e já confirma, sem ação."]] as [EscalaSettings["modo"], string, string][]).map(([k, t, s]) => (
                  <Opcao key={k} marcada={escalaCfg.modo === k} estilo="opt" onClick={() => setEscala("modo", k)}>
                    <div className="opt-t">{t}</div>
                    <div className="opt-s">{s}</div>
                  </Opcao>
                ))}
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Máximo de vezes por mês</div>
                <div className="cfg-row-s">teto para não sobrecarregar a mesma pessoa</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setEscala("maxPorMes", Math.max(1, escalaCfg.maxPorMes - 1))}>−</Acao>
                <span>{escalaCfg.maxPorMes}×</span>
                <Acao onClick={() => setEscala("maxPorMes", escalaCfg.maxPorMes + 1)}>+</Acao>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Semanas de folga após servir</div>
                <div className="cfg-row-s">descanso sugerido entre escalas (0 = sem folga)</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setEscala("folgaSemanas", Math.max(0, escalaCfg.folgaSemanas - 1))}>−</Acao>
                <span>{escalaCfg.folgaSemanas}</span>
                <Acao onClick={() => setEscala("folgaSemanas", escalaCfg.folgaSemanas + 1)}>+</Acao>
              </div>
            </div>
            <Linha estilo="config">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Respeitar período de férias</div>
                <div className="cfg-row-s">{escalaCfg.considerarFerias ? "Quem está de férias fica fora da geração" : "Férias não bloqueiam a escala"}</div>
              </div>
              <Interruptor ligado={escalaCfg.considerarFerias} rotulo="Respeitar período de férias" onClick={() => setEscala("considerarFerias", !escalaCfg.considerarFerias)} />
            </Linha>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Lista de cuidado</div>
                <div className="cfg-row-s">semanas sem registro de presença para a pessoa entrar na lista de quem cuida</div>
              </div>
              <div className="stepper">
                <Acao aria-label="Menos uma semana" onClick={() => setEscala("cuidadoSemanas", Math.max(1, (escalaCfg.cuidadoSemanas ?? 3) - 1))}>−</Acao>
                <span>{plural(escalaCfg.cuidadoSemanas ?? 3, "semana")}</span>
                <Acao aria-label="Mais uma semana" onClick={() => setEscala("cuidadoSemanas", (escalaCfg.cuidadoSemanas ?? 3) + 1)}>+</Acao>
              </div>
            </div>
            <Linha estilo="config" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Quando alguém recusa</div>
                <div className="cfg-row-s">{escalaCfg.naRecusa === "proximo" ? "Chama o próximo apto automaticamente (só no modo automático)." : "Avisa o líder do time por mensagem e deixa a vaga aberta."}</div>
                <Segmentado className="seg-sm" style={{ marginTop: 10 }}>
                  <Opcao marcada={escalaCfg.naRecusa === "proximo"} onClick={() => setEscala("naRecusa", "proximo")}>Chamar o próximo</Opcao>
                  <Opcao marcada={escalaCfg.naRecusa === "avisar"} onClick={() => setEscala("naRecusa", "avisar")}>Avisar o líder</Opcao>
                </Segmentado>
              </div>
            </Linha>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">{ct("Quando um {voluntario} fica inativo")}</div>
            <div className="cfg-card-s">Cada igreja define os critérios. Assim os líderes enxergam quem está se afastando e podem fazer contato a tempo. Férias avisadas não contam.</div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Marcar como <em style={{ color: "var(--amber)", fontStyle: "normal" }}>inativando</em></div>
                <div className="cfg-row-s">após recusar escalas seguidas</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setStatus("recusasInativando", Math.max(1, statusCfg.recusasInativando - 1))}>−</Acao>
                <span>{statusCfg.recusasInativando}</span>
                <Acao onClick={() => setStatus("recusasInativando", statusCfg.recusasInativando + 1)}>+</Acao>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Marcar como <em style={{ color: "var(--danger)", fontStyle: "normal" }}>inativo</em></div>
                <div className="cfg-row-s">após recusar escalas seguidas</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setStatus("recusasInativo", Math.max(2, statusCfg.recusasInativo - 1))}>−</Acao>
                <span>{statusCfg.recusasInativo}</span>
                <Acao onClick={() => setStatus("recusasInativo", statusCfg.recusasInativo + 1)}>+</Acao>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Inativo por indisponibilidade</div>
                <div className="cfg-row-s">dias seguidos marcado como indisponível</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setStatus("diasIndispInativo", Math.max(7, statusCfg.diasIndispInativo - 7))}>−</Acao>
                <span>{statusCfg.diasIndispInativo}d</span>
                <Acao onClick={() => setStatus("diasIndispInativo", statusCfg.diasIndispInativo + 7)}>+</Acao>
              </div>
            </div>
            <Linha estilo="config" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Contar período de férias avisado</div>
                <div className="cfg-row-s">{statusCfg.considerarFerias ? "Férias contam como afastamento" : "Férias avisadas não pesam no status"}</div>
              </div>
              <Interruptor ligado={statusCfg.considerarFerias} rotulo="Contar período de férias avisado" onClick={() => setStatus("considerarFerias", !statusCfg.considerarFerias)} />
            </Linha>
            <div className="crit-legend">
              <span><i className="dot ok" /> Ativo</span>
              <span><i className="dot warn" /> Inativando: vale um contato</span>
              <span><i className="dot off" /> Inativo</span>
            </div>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">Check-in por QR Code</div>
            <div className="cfg-card-s">{ct("Cada {culto} ou evento tem um QR Code único. O {voluntario} escaneia com o celular e confirma presença pela conta logada.")}</div>
            <Linha estilo="config" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">Presença de quem não está escalado</div>
                <div className="cfg-row-s">{checkinPermitirExtra ? "Quem não está escalado pode fazer check-in como presença extra." : "Só quem está escalado consegue fazer check-in. Os demais são bloqueados."}</div>
              </div>
              <Interruptor ligado={checkinPermitirExtra} rotulo="Presença de quem não está escalado" onClick={() => setCheckinPermitirExtra(!checkinPermitirExtra)} />
            </Linha>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">Tipos de evento</div>
            <div className="cfg-card-s">{ct("Os tipos que aparecem ao criar um {culto} ou evento. Já vêm pré-preenchidos no cadastro; se faltar algum, dá pra criar na hora.")}</div>
            <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
              {tiposEvento.map((t) => (
                <span key={t} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {t}<Acao onClick={() => saveTiposEvento(tiposEvento.filter((x) => x !== t))} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "var(--fs-pn-12)", padding: 0 }}>✕</Acao>
                </span>
              ))}
              {tiposEvento.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>Nenhum tipo cadastrado.</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="input" style={{ flex: 1 }} placeholder="ex: Culto, Conferência, Vigília" value={novoTipoEvento} onChange={(e) => setNovoTipoEvento(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTipoEvento()} />
              <Botao onClick={addTipoEvento}>Adicionar</Botao>
            </div>
          </div>
        </>
      )}

      {/* ─── PERMISSÕES ─── */}
      {tab === "perm" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Papéis & permissões</div>
          <div className="cfg-card-s">Cada funcionalidade do app aparece aqui. Toque para liberar ou bloquear por papel. O Master sempre tem acesso total.</div>
          <div className="pmx-mob">
            <div className="pmx-mob-roles" role="tablist" aria-label="Papel">
              {PAPEIS_V2.map((pp) => (
                <Opcao key={pp.id} role="tab" aria-selected={papelMob === pp.id} marcada={papelMob === pp.id} estilo="pmx-mob-role" onClick={() => setPapelMob(pp.id)}>
                  {ct(pp.nome)}
                </Opcao>
              ))}
            </div>
            {(papelMob === "master" || papelMob === "membro") && (
              <div className="pmx-mob-note">
                {papelMob === "master" ? "O Master sempre tem acesso total." : "Membro usa o app. Para abrir uma tela do painel pra uma pessoa, use Acessos por pessoa."}
              </div>
            )}
            {gruposAcoes.map((grupo) => (
              <div key={`mg-${grupo}`} className="pmx-mob-group">
                <div className="pmx-mob-gt">{grupo}</div>
                {ACOES_V2.filter((a) => a.grupo === grupo).map((a) => {
                  const on = matriz[papelMob][a.id];
                  const locked = papelMob === "master" || papelMob === "membro";
                  return (
                    <div key={a.id} className="pmx-mob-row">
                      <span className="pmx-mob-name">{ct(a.nome)}</span>
                      <span className="pmx-mob-state">{on ? "Liberado" : "Bloqueado"}</span>
                      <Interruptor ligado={on} tamanho="compacto" rotulo={ct(a.nome)} desativado={locked} onClick={() => toggleMx(papelMob, a.id)} />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <table className="pmx">
            <thead>
              <tr>
                <th className="pmx-fn">Funcionalidade</th>
                {PAPEIS_V2.map((pp) => <th key={pp.id} className="pmx-role"><span style={{ color: "var(--olive)" }}><Icon name={pp.ic} size={13} /></span> {ct(pp.nome)}</th>)}
              </tr>
            </thead>
            <tbody>
              {gruposAcoes.map((grupo) => (
                <Fragment key={`g-${grupo}`}>
                  <tr className="pmx-group"><td colSpan={PAPEIS_V2.length + 1}>{grupo}</td></tr>
                  {ACOES_V2.filter((a) => a.grupo === grupo).map((a) => (
                    <tr key={a.id}>
                      <td className="pmx-fn">{ct(a.nome)}</td>
                      {PAPEIS_V2.map((pp) => {
                        const locked = pp.id === "master" || pp.id === "membro";
                        const on = matriz[pp.id][a.id];
                        const lockTitle = pp.id === "master"
                          ? "O Master sempre tem acesso total"
                          : pp.id === "membro"
                          ? "Membro usa o app. Para abrir uma tela do painel pra uma pessoa, use Acessos."
                          : "";
                        return (
                          <td key={pp.id}>
                            <Acao className={`mx-cell${on ? " on" : " off"}${locked ? " lock" : ""}`} onClick={() => toggleMx(pp.id, a.id)} title={lockTitle}>{on ? <Icon name="ok" size={14} /> : "·"}</Acao>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
            <Botao variante="principal" compacto desativado={matrizSaving} onClick={salvarMatriz}>{matrizSaving ? "Salvando…" : (matrizMsg || "Salvar permissões")}</Botao>
          </div>
        </div>
      )}

      {/* ─── ACESSOS POR PESSOA ─── */}
      {tab === "acessos" && <AcessosCard people={people} church={church} currentRole={currentRole} />}
      {tab === "entrada" && <EntradaConfig />}

      {tab === "pesquisas" && church?.organizationId && <PesquisasView organizationId={church.organizationId} ministries={ministries} />}

      {/* ─── PERSONALIZAÇÃO ─── */}
      {tab === "visual" && (
        <div className="cfg-grid2">
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">Logo da igreja</div>
            <div className="cfg-card-s">
              Aparece ao lado de &quot;Service&quot; em todo lugar: login, convite, app do membro, painel e página da igreja.
              Sem logo, aparece o nome da igreja.
            </div>
            {church && (
              <>
                <div style={{ marginTop: 10 }}>
                  <LogoField
                    identidade={identidade}
                    onSave={patchIdentidade}
                    logoUrl={church.logoUrl}
                    onUploadLogo={async (file) => {
                      const path = `${church.organizationId}/logos/${church.id}.${imageExtension(file)}`;
                      const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
                      await createServiceBrowserClient().schema("service").from("churches").update({ logo_url: url }).eq("id", church.id);
                      router.refresh();
                    }}
                    onRemoveLogo={async () => {
                      await createServiceBrowserClient().schema("service").from("churches").update({ logo_url: null }).eq("id", church.id);
                      router.refresh();
                    }}
                  />
                </div>
              </>
            )}
          </div>
          <ThemePicker brand={brand} onChange={patchBrand} churchName={sede?.nome ?? church?.nome} logoUrl={sede?.logoUrl ?? church?.logoUrl} />
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }} id="cfg-vocabulario">
            <div className="cfg-card-t">Nomes usados no app</div>
            <div className="cfg-card-s">
              Use as palavras da sua igreja. O nome da tela aparece nos títulos e textos; o nome curto, na barra de abas do app.
              Vale para toda a igreja, inclusive as congregações.
            </div>
            {TERMOS_IDS.map((id) => (
              <div key={id} className="cfg-grid2" style={{ gap: "0 16px", marginTop: 16 }}>
                <div className="field">
                  <label className="field-label" htmlFor={`voc-${id}-tela`}>{TERMOS[id].tela} · nome da tela</label>
                  <input id={`voc-${id}-tela`} className="input" value={vocabEdit[id].tela} maxLength={LIMITE_TELA} placeholder={TERMOS[id].tela} onChange={(e) => patchVocab(id, "tela", e.target.value)} />
                  <div className="field-hint">{TERMOS[id].ajuda} · {vocabEdit[id].tela.length} de {LIMITE_TELA}</div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor={`voc-${id}-curto`}>Nome curto da barra</label>
                  <input id={`voc-${id}-curto`} className="input" value={vocabEdit[id].curto} maxLength={LIMITE_CURTO} placeholder={TERMOS[id].curto} onChange={(e) => patchVocab(id, "curto", e.target.value)} />
                  <div className="field-hint">{vocabEdit[id].curto.length} de {LIMITE_CURTO}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">Fundo da página da igreja</div>
            <div className="cfg-card-s">
              Só para a página da igreja (o link da bio). Os botões e destaques dela usam a cor da igreja escolhida acima.
            </div>
            {church && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                  <BackgroundField identidade={identidade} onSave={patchIdentidade} organizationId={church.organizationId} churchId={church.id} />
                  <AccentField compact label="Cor do texto" bgHex={identidadeBgHex} value={identidade.textColor ?? IDENTIDADE_CFG_DEFAULT.textColor} defaultHex={IDENTIDADE_CFG_DEFAULT.textColor} onChange={(hex) => patchIdentidade({ textColor: hex })} />
                  <AccentField compact label="Cor das caixas e balões" bgHex={identidadeBgHex} value={identidade.boxColor ?? IDENTIDADE_CFG_DEFAULT.boxColor} defaultHex={IDENTIDADE_CFG_DEFAULT.boxColor} onChange={(hex) => patchIdentidade({ boxColor: hex })} />
                </div>
              </>
            )}
          </div>
          {(currentRole === "master" || currentRole === "pastor") && (
            <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
              <div className="cfg-card-t">Quem mais pode editar a marca</div>
              <div className="cfg-card-s">
                Além de você, libere pessoas específicas em <b>Acessos por pessoa</b>{" "}marcando &quot;Marca e
                aparência&quot;. Elas conseguem abrir só esta aba, sem acesso ao resto de Configurações.
              </div>
            </div>
          )}
          <div className="cfg-card" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", bottom: "calc(84px + var(--safe-bottom))", zIndex: 5 }}>
            <div className="cfg-card-s" style={{ margin: 0 }}>
              Você já está vendo a prévia. Salve para valer para todos da igreja.
            </div>
            <Botao variante="principal" desativado={personalizacaoSaving} onClick={salvarPersonalizacao}>
              {personalizacaoSaving ? "Salvando…" : personalizacaoMsg || "Salvar personalização"}
            </Botao>
          </div>
        </div>
      )}

      {/* ─── PÁGINA PÚBLICA ─── */}
      {tab === "pagina" && church && <PublicPageEditor church={church} currentRole={currentRole} />}

      {/* ─── CONTRIBUIR (chave Pix na matriz) ─── */}
      {tab === "contribuir" && <ContribuirConfig church={sede} />}

      {/* ─── CONGREGAÇÕES ─── */}
      {tab === "rede" && (
        <div className="cfg-card">
          <div className="cfg-card-t">Sua igreja na rede</div>
          <div className="cfg-card-s">Toda igreja começa pela matriz: a sede cadastrada na contratação. Se houver outras unidades, elas aparecem aqui como congregações; cada uma tem seus times e escalas, e a matriz enxerga tudo.</div>
          {churches.filter((c) => c.matriz).map((c) => (
            <div key={c.id} className="cong-matriz">
              <div className="cong-mark">
                {c.logoUrl ? <img src={c.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : <Icon name="identidade" size={20} />}
              </div>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{c.nome} <Selo tom="ok" style={{ marginLeft: 6 }}>matriz</Selo></div>
                <div className="cfg-row-s">{c.cidade || "Sede da rede"}</div>
              </div>
              <Botao compacto onClick={() => setGerirCongId(c.id)}>Gerir</Botao>
            </div>
          ))}
          {churches.filter((c) => !c.matriz).length > 0 && (
            <>
              <div className="cfg-card-t" style={{ marginTop: 26 }}>Outras congregações · {churches.filter((c) => !c.matriz).length}</div>
              {churches.filter((c) => !c.matriz).map((c) => (
                <Linha estilo="config" key={c.id}>
                  <div className="cong-mark">
                    {c.logoUrl ? <img src={c.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : <Icon name="globo" size={16} />}
                  </div>
                  <div className="cfg-row-main">
                    <div className="cfg-row-t">{c.nome}</div>
                    {c.cidade ? <div className="cfg-row-s">{c.cidade}</div> : null}
                  </div>
                  <Botao compacto onClick={() => setGerirCongId(c.id)}>Gerir</Botao>
                </Linha>
              ))}
            </>
          )}
          {churches.length === 0 && <div className="empty">Nenhuma congregação encontrada.</div>}
          <Botao
            variante="principal" compacto
            style={{ marginTop: 18 }}
            onClick={() => setModal({
              eyebrow: "Criar",
              title: "Adicionar congregação",
              subtitle: "Nova unidade da rede, com seus próprios times e escalas.",
              saveLabel: "Adicionar congregação",
              formFields: [
                { k: "nome", label: "Nome", type: "text", req: true, ph: "ex: Congregação Zona Norte" },
                { k: "cidade", label: "Cidade / bairro", type: "text", half: true },
                { k: "doc", label: "CNPJ", type: "text", half: true },
                { k: "fundada", label: "Ano de fundação", type: "text", half: true },
                { k: "endereco", label: "Endereço", type: "text", half: true },
                { k: "cep", label: "CEP", type: "text", half: true },
                { k: "email", label: "E-mail", type: "text", half: true },
                { k: "tel", label: "Telefone", type: "text", half: true },
              ],
              action: { kind: "congregacao" },
            })}
          >
            + Adicionar congregação
          </Botao>
        </div>
      )}

      {editMin && (
        <MinisterioEditModal ministry={editMin} courses={courses} onClose={() => setEditMin(null)} onRefresh={() => router.refresh()} />
      )}

      {elencoTag && (
        <TagElencoModal tag={elencoTag} people={people} onClose={() => setElencoTag(null)} />
      )}

      {gerirGrupoId && (() => {
        const g = fellowshipGroups.find((x) => x.id === gerirGrupoId);
        return g ? <GrupoEditModal grupo={g} people={people} onClose={() => setGerirGrupoId(null)} onRefresh={() => router.refresh()} /> : null;
      })()}
      {gerirCongId && (() => {
        const c = churches.find((x) => x.id === gerirCongId);
        if (!c) return null;
        return (
          <CongregacaoEditModal churchRow={c} ministries={ministries} tags={tags} onClose={() => setGerirCongId(null)} onRefresh={() => router.refresh()} />
        );
      })()}
      </div>
      </div>
    </div>
  );
}
