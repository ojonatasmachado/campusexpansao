"use client";

import { FusoField } from "../../modules/configuracao/FusoField";
import { useServiceLocale } from "../../lib/internacional/contexto";
import { fusoValido, normalizarFuso } from "../../lib/fuso";
import { plural } from "../../lib/plural";
import { avisar } from "../../lib/avisar";
import { useRouter } from "next/navigation";
import { Fragment, useId, useState } from "react";
import { createServiceBrowserClient } from "../../lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "../../lib/upload-image";
import { Icon } from "../../lib/icons";
import { familyById, type BrandCfg } from "../../lib/theme";
import { AccentField } from "../../AccentField";
import ThemePicker from "../../ThemePicker";
import { PublicPageEditor } from "../../PublicPageEditor";
import { ContribuirConfig } from "../../modules/contribuir/ContribuirConfig";
import { LogoField, BackgroundField } from "../../IdentidadeFields";
import { useChurchSettingsField, useChurchSettingsValor } from "../../lib/settings-field";
import { normalizarVocabulario, vocabularioParaGravar, LIMITE_CURTO, LIMITE_TELA, termosDaInterface, TERMOS_IDS, type Vocabulario } from "../../lib/vocabulario";
import { useTermos } from "../../lib/vocabulario-context";
import { IDENTIDADE_CFG_DEFAULT } from "../../../lib/church-page";
import type { IdentidadeCfg } from "../../../lib/church-page";
import CepInput from "../../CepInput";
import { HelpDot } from "../../HelpSystem";
import { PageHead } from "../ui";
import { ESCALA_DEFAULT, type EscalaSettings } from "../../modules/escalas/regras";
import { friendlyWriteError } from "../erros";
import { EntradaConfig } from "../../modules/entrada/EntradaConfig";
import { GrupoEditModal } from "../../modules/grupos/GrupoEditModal";
import { cfgTabs as gerarCfgTabs } from "../../modules/registry";
import { ACOES_V2, PAPEIS_V2, ligadosDa, matrizComFallback } from "../comum";
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
import { Abas } from "../../ui/Abas";
import { BarraSalvar } from "../../ui/BarraSalvar";
import { Linha } from "../../ui/Linha";
import { Etiqueta, Selo } from "../../ui/Selo";
import { Segmentado } from "../../ui/Segmentado";
import { Campo, Entrada } from "../../ui/Campo";
import { Vazio } from "../../ui/Estados";
import { confirmar } from "../../ui/confirmar";
import { STATUS_CFG_DEFAULT, GRUPOS_CFG_DEFAULT, DIAS_SEMANA, TAG_CORES } from "./configuracao/constantes";
import { AcessosCard } from "./configuracao/AcessosCard";
import { TagElencoModal } from "./configuracao/TagElencoModal";
import { CongregacaoEditModal } from "./configuracao/CongregacaoEditModal";
import { useTexto } from "../../lib/internacional/contexto";


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
  const traduzirUi = useTexto();

  const locale = useServiceLocale();
  const termosInterface = termosDaInterface(locale, traduzirUi);
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
    if (!fusoValido(igrejaForm.fuso)) { avisar(traduzirUi("Escolha um fuso horário válido."), "warn"); return; }
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
    avisar(traduzirUi("Dados da igreja salvos."));
    router.refresh();
    } catch { avisar(traduzirUi("Não foi possível salvar os dados da igreja. Tente novamente."), "warn"); } finally { setIgrejaLoading(false); }
  };

  async function removeRow(table: string, id: string) {
    if (!(await confirmar({ titulo: traduzirUi("Remover este registro?"), acao: "Remover" }))) return;
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
  const avisoFalha = (ok: boolean) => { if (!ok) avisar(traduzirUi("Não foi possível salvar. Tente novamente."), "warn"); };
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
  const [vocabEdit, setVocabEdit] = useState<Vocabulario>(() => normalizarVocabulario(sede?.vocabulario, sede?.settings?.gruposCfg?.termoP, locale));
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
      db.update({ settings: { ...church.settings, identidadeCfg: identidade, ...(mesmaIgreja ? { brandCfg: brand } : {}) }, ...(mesmaIgreja ? { vocabulario: vocabularioParaGravar(vocabEdit, locale, sede?.vocabulario) } : {}) }).eq("id", church.id).select("id"),
      ...(mesmaIgreja ? [] : [db.update({ settings: { ...sede.settings, brandCfg: brand }, vocabulario: vocabularioParaGravar(vocabEdit, locale, sede?.vocabulario) }).eq("id", sede.id).select("id")]),
    ]);
    setPersonalizacaoSaving(false);
    /* sem linha de volta = o banco não gravou (sem permissão ou igreja inexistente) */
    const falhou = results.some((r) => r.error || !r.data?.length);
    setPersonalizacaoMsg(falhou ? "Não foi possível salvar" : "Salvo!");
    router.refresh();
    setTimeout(() => setPersonalizacaoMsg(""), 2000);
  };
  const identidadeBgHex = identidade.bgMode === "imagem" ? familyById(undefined, "dark").tokens.ink : identidade.bgMode === "degrade" ? (identidade.bgFrom ?? IDENTIDADE_CFG_DEFAULT.bgFrom) : (identidade.bgColor ?? IDENTIDADE_CFG_DEFAULT.bgColor);

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
          <div className="ph-eyebrow">{traduzirUi("Configurações")}</div>
          <h1 className="ph-title">Configurações <HelpDot text={traduzirUi("Dados da igreja, regras de escala, permissões, marca do app e convites pra outros líderes ficam aqui.")} /></h1>
        </div>
      </div>
      )}

      {/* índice agrupado (S49): no computador fica à esquerda; no celular a
          lista abre cada página, com voltar */}
      <div className={only ? "" : `cfg-shell${cfgAberta ? " open" : ""}`}>
      {!only && (
        <nav className="cfg-index" aria-label={traduzirUi("Seções de Configurações")}>
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
            <div className="cfg-card-t">{traduzirUi("Dados da igreja")}</div>
            <div className="cfg-card-s">{traduzirUi("Como sua igreja aparece no app, nas publicações e como a secretaria pode ser encontrada.")}</div>
            <Campo rotulo={traduzirUi("Nome da igreja")}>
              <Entrada id={`${cid}-nome`} name="nome" value={igrejaForm.nome} onChange={(e) => setIgrejaForm((p) => ({ ...p, nome: e.target.value }))} />
            </Campo>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <Campo rotulo={traduzirUi("CNPJ")}><Entrada id={`${cid}-doc`} name="doc" autoCapitalize="characters" value={igrejaForm.doc} onChange={(e) => setIgrejaForm((p) => ({ ...p, doc: e.target.value }))} /></Campo>
              <Campo rotulo={traduzirUi("Fundada em")}><Entrada id={`${cid}-fundada`} name="fundada" value={igrejaForm.fundada} onChange={(e) => setIgrejaForm((p) => ({ ...p, fundada: e.target.value }))} /></Campo>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <div className="field">
                <label className="field-label">{traduzirUi("CEP")}</label>
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
              <Campo rotulo={traduzirUi("Número")}><Entrada id={`${cid}-numero`} name="numero" inputMode="numeric" value={igrejaForm.numero} onChange={(e) => setIgrejaForm((p) => ({ ...p, numero: e.target.value }))} /></Campo>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <Campo rotulo={traduzirUi("Rua")}><Entrada id={`${cid}-rua`} name="rua" autoComplete="address-line1" value={igrejaForm.rua} onChange={(e) => setIgrejaForm((p) => ({ ...p, rua: e.target.value }))} /></Campo>
              <Campo rotulo={traduzirUi("Bairro")}><Entrada id={`${cid}-bairro`} name="bairro" value={igrejaForm.bairro} onChange={(e) => setIgrejaForm((p) => ({ ...p, bairro: e.target.value }))} /></Campo>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <Campo rotulo={traduzirUi("Cidade")}><Entrada id={`${cid}-cidade`} name="cidade" autoComplete="address-level2" value={igrejaForm.cidade} onChange={(e) => setIgrejaForm((p) => ({ ...p, cidade: e.target.value }))} /></Campo>
              <Campo rotulo={traduzirUi("Estado")}><Entrada id={`${cid}-estado`} name="estado" autoComplete="address-level1" value={igrejaForm.estado} onChange={(e) => setIgrejaForm((p) => ({ ...p, estado: e.target.value }))} /></Campo>
            </div>
            <div className="cfg-grid2" style={{ gap: "0 16px" }}>
              <Campo rotulo={traduzirUi("E-mail")}><Entrada id={`${cid}-email`} name="email" type="email" autoComplete="email" inputMode="email" value={igrejaForm.email} onChange={(e) => setIgrejaForm((p) => ({ ...p, email: e.target.value }))} /></Campo>
              <Campo rotulo={traduzirUi("Telefone")}><Entrada id={`${cid}-tel`} name="tel" type="tel" autoComplete="tel" inputMode="tel" value={igrejaForm.tel} onChange={(e) => setIgrejaForm((p) => ({ ...p, tel: e.target.value }))} /></Campo>
            </div>
            <FusoField value={igrejaForm.fuso} onChange={(fuso) => setIgrejaForm((p) => ({ ...p, fuso }))} />
            <BarraSalvar visivel={igrejaMudou} salvando={igrejaLoading} aoSalvar={saveIgreja} />
          </div>
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">{ct(traduzirUi("Horários de {culto}"))}</div>
            <div className="cfg-card-s">{traduzirUi("Aparecem na agenda e ajudam a montar as escalas.")}</div>
            <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
              {horariosCulto.map((h) => (
                <span key={h} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icon name="cultos" size={12} /> {h}
                  <Acao onClick={() => saveHorariosCulto(horariosCulto.filter((x) => x !== h))} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "var(--fs-pn-12)", padding: 0 }}>✕</Acao>
                </span>
              ))}
              {horariosCulto.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{traduzirUi("Nenhum horário cadastrado.")}</span>}
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
              <Botao desativado={!novoHorarioHora} onClick={addHorarioCulto}>{traduzirUi("Adicionar")}</Botao>
            </div>
          </div>
        </div>
      )}

      {/* ─── MINISTÉRIOS & FUNÇÕES ─── */}
      {tab === "min" && (
        <div className="cfg-card">
          <div className="cfg-card-t">{traduzirUi("Times e funções")}</div>
          <div className="cfg-card-s">{ct(traduzirUi("Cada time tem um líder e suas funções. As funções alimentam a escala e as habilidades de cada {voluntario}."))}</div>
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
                    {m.positions.length === 0 && <span style={{ fontSize: "var(--fs-pn-12)", color: "var(--muted)" }}>{traduzirUi("Sem funções")}</span>}
                  </div>
                </div>
                <Botao compacto onClick={() => setEditMin(m)}>{traduzirUi("Editar")}</Botao>
              </Linha>
            );
          })}
          {ministries.length === 0 && <Vazio titulo={traduzirUi("Nenhum time ainda.")} />}
        </div>
      )}

      {tab === "min" && (
        <div className="cfg-card" style={{ marginTop: 16 }}>
          <div className="cfg-card-t">{traduzirUi("Papéis ministeriais")}</div>
          <div className="cfg-card-s">{traduzirUi("Os títulos que a sua igreja reconhece (Pastor, Diácono, Presbítero...). Atribuídos aos membros na ficha de cada um.")}</div>
          <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
            {ministerialTitles.map((t) => (
              <span key={t.id} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                {t.name}
                <Acao onClick={() => removeRow("ministerial_titles", t.id)} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "var(--fs-pn-12)", padding: 0, cursor: "pointer" }}>✕</Acao>
              </span>
            ))}
            {ministerialTitles.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{traduzirUi("Nenhum papel cadastrado.")}</span>}
          </div>
          <Botao compacto onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Novo papel ministerial"), subtitle: traduzirUi("ex: Pastor, Diácono, Presbítero."), saveLabel: traduzirUi("Adicionar papel"), formFields: [{ k:"nome", label:traduzirUi("Nome do papel"), type:"text", req:true, ph:traduzirUi("ex: Diácono") }], action: { kind: "title" } })}>{traduzirUi("+ Papel ministerial")}</Botao>
        </div>
      )}

      {tab === "min" && <RequisitosServirCard />}
      {tab === "min" && (
        <div className="cfg-card" style={{ marginTop: 16 }}>
          <div className="cfg-card-t">{traduzirUi("Etiquetas")}</div>
          <div className="cfg-card-s">{traduzirUi("Etiquetas livres como Jovens, Kids ou Casais. Uma pessoa pode ter várias: servem para juntar pessoas de times diferentes num mesmo grupo.")}</div>
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
                        <Botao compacto onClick={() => { renomearTag(t.id, tagNomeEdit); setEditTagId(null); }}>{traduzirUi("Pronto")}</Botao>
                      </div>
                    ) : (
                      <>
                        <div className="cfg-row-t">{t.name}</div>
                        <div className="cfg-row-s">
                          {plural(dentro, ct(traduzirUi("{voluntario}")))}{lideres.length > 0 ? <> · líder: <span style={{ color: "var(--olive-soft)" }}>{lideres.join(", ")}</span></> : traduzirUi(" · sem líder")}
                        </div>
                      </>
                    )}
                  </div>
                  {editTagId !== t.id && (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <Botao compacto onClick={() => setElencoTag(t)}>{traduzirUi("Elenco")}</Botao>
                      <Botao compacto onClick={() => { setEditTagId(t.id); setTagNomeEdit(t.name); }}>{traduzirUi("Editar")}</Botao>
                      <Botao compacto onClick={() => removeRow("tags", t.id)}>{traduzirUi("Remover")}</Botao>
                    </div>
                  )}
                </Linha>
              );
            })}
            {tags.length === 0 && <Vazio titulo={traduzirUi("Nenhuma etiqueta cadastrada.")} />}
          </div>
          <Botao compacto onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: traduzirUi("Nova etiqueta"), subtitle: ct(traduzirUi("Etiqueta livre para agrupar {voluntarios} (ex: Jovens, Casais).")), saveLabel: traduzirUi("Criar etiqueta"), formFields: [{ k:"nome", label:traduzirUi("Nome"), type:"text", req:true, ph:traduzirUi("ex: Jovens") }, { k:"cor", label:traduzirUi("Cor"), type:"select", options: TAG_CORES }], action: { kind: "tag" } })}>{traduzirUi("+ Etiqueta")}</Botao>
        </div>
      )}

      {/* ─── GRUPOS & CÉLULAS ─── */}
      {tab === "grupos" && (
        <>
          <div className="cfg-card">
            <div className="cfg-card-t">{traduzirUi("Habilitar grupos")}</div>
            <div className="cfg-card-s">{traduzirUi("Desligue se sua igreja não trabalha com células/GCs. O recurso some do resto do app, mas nada é apagado.")}</div>
            <Linha estilo="config" style={{ borderBottom: gruposCfg.ativo ? "0.5px solid var(--border-2)" : "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{gruposCfg.ativo ? traduzirUi("Ativado") : traduzirUi("Desativado")}</div>
                <div className="cfg-row-s">{gruposCfg.ativo ? traduzirUi("Grupos aparecem no cadastro de membro e nos relatórios.") : traduzirUi("Grupos escondidos em todo o app.")}</div>
              </div>
              <Interruptor ligado={gruposCfg.ativo} rotulo={traduzirUi("Usar grupos")} onClick={() => saveGruposCfg({ ...gruposCfg, ativo: !gruposCfg.ativo })} />
            </Linha>
            {gruposCfg.ativo && (
              <div className="cfg-grid2" style={{ gap: "0 16px", marginTop: 16 }}>
                <div className="field"><label className="field-label">{traduzirUi("Nome")}</label><div className="cfg-row-s" style={{ marginTop: 4 }}>{ct(traduzirUi("{Grupo}"))}. O nome se muda em Personalização, em Nomes usados no app.</div></div>
                <Campo rotulo={traduzirUi("Sigla")}><Entrada value={gruposCfg.sigla} onChange={(e) => setGruposCfgState({ ...gruposCfg, sigla: e.target.value })} onBlur={() => saveGruposCfg(gruposCfg)} placeholder={traduzirUi("ex: GC")} /></Campo>
              </div>
            )}
          </div>
          {gruposCfg.ativo && (
            <div className="cfg-card" style={{ marginTop: 16 }}>
              <div className="cfg-card-t">{ct(traduzirUi("{Grupos}"))} · {fellowshipGroups.length}</div>
              <div className="cfg-card-s">{traduzirUi("Células, GCs, pequenos grupos... a estrutura de comunhão em casas. Cada grupo tem um líder, um dia e um endereço, que os membros veem no app.")}</div>
              {fellowshipGroups.map((g) => {
                const leader = people.find((p) => p.id === g.leader_person_id);
                return (
                  <Linha estilo="config" key={g.id}>
                    <div className="cong-mark"><Icon name="identidade" size={16} /></div>
                    <div className="cfg-row-main">
                      <div className="cfg-row-t">{g.name}</div>
                      <div className="cfg-row-s">{[g.weekday, g.time, g.neighborhood].filter(Boolean).join(" · ") || traduzirUi("sem dia/local definido")}{leader ? traduzirUi(" · líder {value0}", { value0: String(leader.name.split(" ")[0]) }) : ""}{g.capacity ? ` · ${plural(g.capacity, "lugar", "lugares")}` : ""}{g.postal_code ? "" : traduzirUi(" · sem endereço")}</div>
                    </div>
                    <Botao compacto onClick={() => setGerirGrupoId(g.id)}>{traduzirUi("Editar")}</Botao>
                    <Botao compacto onClick={() => removeRow("fellowship_groups", g.id)}>{traduzirUi("Remover")}</Botao>
                  </Linha>
                );
              })}
              {fellowshipGroups.length === 0 && <Vazio titulo={traduzirUi("Nenhum grupo cadastrado ainda.")} />}
              <Botao variante="principal" compacto style={{ marginTop: 18 }} onClick={() => setModal({ eyebrow: traduzirUi("Criar"), title: ct(traduzirUi("Novo {grupo}")), subtitle: traduzirUi("Nome, líder, dia e horário. O endereço e os lugares ficam em Editar."), saveLabel: traduzirUi("Criar grupo"), formFields: [{ k:"nome", label:traduzirUi("Nome"), type:"text", req:true, ph:traduzirUi("ex: GC Centro") }, { k:"lider", label:traduzirUi("Líder"), type:"select", half:true, ph:traduzirUi("A definir"), options: people.map((p) => ({ v: p.name, l: p.name })) }, { k:"dia", label:traduzirUi("Dia"), type:"text", half:true, ph:traduzirUi("ex: Quarta-feira") }, { k:"hora", label:traduzirUi("Horário"), type:"text", half:true, ph:traduzirUi("ex: 20h") }, { k:"bairro", label:traduzirUi("Bairro"), type:"text", half:true, ph:traduzirUi("ex: Centro") }], action: { kind: "group" } })}>{traduzirUi("+ Novo grupo")}</Botao>
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
            <div className="cfg-card-t">{traduzirUi("Regras de escala")}</div>
            <div className="cfg-card-s">{traduzirUi("Como a escala é gerada e os limites para não sobrecarregar ninguém. Valem para o botão “Gerar” e para o modo automático.")}</div>
            <Campo rotulo={traduzirUi("Geração")} grupo style={{ marginTop: 4 }}>
              <div className="opt-row" style={{ flexWrap: "wrap" }}>
                {([["manual", "Manual", "O líder monta tudo na mão."], ["assistido", "Assistida", "O sistema sugere; o líder confirma cada nome."], ["automatico", "Automática", "O sistema gera e já confirma, sem ação."]] as [EscalaSettings["modo"], string, string][]).map(([k, t, s]) => (
                  <Opcao key={k} marcada={escalaCfg.modo === k} estilo="opt" onClick={() => setEscala("modo", k)}>
                    <div className="opt-t">{t}</div>
                    <div className="opt-s">{s}</div>
                  </Opcao>
                ))}
              </div>
            </Campo>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Máximo de vezes por mês")}</div>
                <div className="cfg-row-s">{traduzirUi("teto para não sobrecarregar a mesma pessoa")}</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setEscala("maxPorMes", Math.max(1, escalaCfg.maxPorMes - 1))}>−</Acao>
                <span>{escalaCfg.maxPorMes}×</span>
                <Acao onClick={() => setEscala("maxPorMes", escalaCfg.maxPorMes + 1)}>+</Acao>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Semanas de folga após servir")}</div>
                <div className="cfg-row-s">{traduzirUi("descanso sugerido entre escalas (0 = sem folga)")}</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setEscala("folgaSemanas", Math.max(0, escalaCfg.folgaSemanas - 1))}>−</Acao>
                <span>{escalaCfg.folgaSemanas}</span>
                <Acao onClick={() => setEscala("folgaSemanas", escalaCfg.folgaSemanas + 1)}>+</Acao>
              </div>
            </div>
            <Linha estilo="config">
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Respeitar período de férias")}</div>
                <div className="cfg-row-s">{escalaCfg.considerarFerias ? traduzirUi("Quem está de férias fica fora da geração") : traduzirUi("Férias não bloqueiam a escala")}</div>
              </div>
              <Interruptor ligado={escalaCfg.considerarFerias} rotulo={traduzirUi("Respeitar período de férias")} onClick={() => setEscala("considerarFerias", !escalaCfg.considerarFerias)} />
            </Linha>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Lista de cuidado")}</div>
                <div className="cfg-row-s">{traduzirUi("semanas sem registro de presença para a pessoa entrar na lista de quem cuida")}</div>
              </div>
              <div className="stepper">
                <Acao aria-label={traduzirUi("Menos uma semana")} onClick={() => setEscala("cuidadoSemanas", Math.max(1, (escalaCfg.cuidadoSemanas ?? 3) - 1))}>−</Acao>
                <span>{plural(escalaCfg.cuidadoSemanas ?? 3, "semana")}</span>
                <Acao aria-label={traduzirUi("Mais uma semana")} onClick={() => setEscala("cuidadoSemanas", (escalaCfg.cuidadoSemanas ?? 3) + 1)}>+</Acao>
              </div>
            </div>
            <Linha estilo="config" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Quando alguém recusa")}</div>
                <div className="cfg-row-s">{escalaCfg.naRecusa === "proximo" ? traduzirUi("Chama o próximo apto automaticamente (só no modo automático).") : traduzirUi("Avisa o líder do time por mensagem e deixa a vaga aberta.")}</div>
                <Segmentado className="seg-sm" style={{ marginTop: 10 }}>
                  <Opcao marcada={escalaCfg.naRecusa === "proximo"} onClick={() => setEscala("naRecusa", "proximo")}>{traduzirUi("Chamar o próximo")}</Opcao>
                  <Opcao marcada={escalaCfg.naRecusa === "avisar"} onClick={() => setEscala("naRecusa", "avisar")}>{traduzirUi("Avisar o líder")}</Opcao>
                </Segmentado>
              </div>
            </Linha>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">{ct(traduzirUi("Quando um {voluntario} fica inativo"))}</div>
            <div className="cfg-card-s">{traduzirUi("Cada igreja define os critérios. Assim os líderes enxergam quem está se afastando e podem fazer contato a tempo. Férias avisadas não contam.")}</div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Marcar como <em style={{ color: "var(--amber)", fontStyle: "normal" }}>{traduzirUi("inativando")}</em></div>
                <div className="cfg-row-s">{traduzirUi("após recusar escalas seguidas")}</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setStatus("recusasInativando", Math.max(1, statusCfg.recusasInativando - 1))}>−</Acao>
                <span>{statusCfg.recusasInativando}</span>
                <Acao onClick={() => setStatus("recusasInativando", statusCfg.recusasInativando + 1)}>+</Acao>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Marcar como <em style={{ color: "var(--danger)", fontStyle: "normal" }}>{traduzirUi("inativo")}</em></div>
                <div className="cfg-row-s">{traduzirUi("após recusar escalas seguidas")}</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setStatus("recusasInativo", Math.max(2, statusCfg.recusasInativo - 1))}>−</Acao>
                <span>{statusCfg.recusasInativo}</span>
                <Acao onClick={() => setStatus("recusasInativo", statusCfg.recusasInativo + 1)}>+</Acao>
              </div>
            </div>
            <div className="crit-row">
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Inativo por indisponibilidade")}</div>
                <div className="cfg-row-s">{traduzirUi("dias seguidos marcado como indisponível")}</div>
              </div>
              <div className="stepper">
                <Acao onClick={() => setStatus("diasIndispInativo", Math.max(7, statusCfg.diasIndispInativo - 7))}>−</Acao>
                <span>{statusCfg.diasIndispInativo}d</span>
                <Acao onClick={() => setStatus("diasIndispInativo", statusCfg.diasIndispInativo + 7)}>+</Acao>
              </div>
            </div>
            <Linha estilo="config" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Contar período de férias avisado")}</div>
                <div className="cfg-row-s">{statusCfg.considerarFerias ? traduzirUi("Férias contam como afastamento") : traduzirUi("Férias avisadas não pesam no status")}</div>
              </div>
              <Interruptor ligado={statusCfg.considerarFerias} rotulo={traduzirUi("Contar período de férias avisado")} onClick={() => setStatus("considerarFerias", !statusCfg.considerarFerias)} />
            </Linha>
            <div className="crit-legend">
              <span><i className="dot ok" /> Ativo</span>
              <span><i className="dot warn" /> Inativando: vale um contato</span>
              <span><i className="dot off" /> Inativo</span>
            </div>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">{traduzirUi("Check-in por QR Code")}</div>
            <div className="cfg-card-s">{ct(traduzirUi("Cada {culto} ou evento tem um QR Code único. O {voluntario} escaneia com o celular e confirma presença pela conta logada."))}</div>
            <Linha estilo="config" style={{ borderBottom: "none" }}>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{traduzirUi("Presença de quem não está escalado")}</div>
                <div className="cfg-row-s">{checkinPermitirExtra ? traduzirUi("Quem não está escalado pode fazer check-in como presença extra.") : traduzirUi("Só quem está escalado consegue fazer check-in. Os demais são bloqueados.")}</div>
              </div>
              <Interruptor ligado={checkinPermitirExtra} rotulo={traduzirUi("Presença de quem não está escalado")} onClick={() => setCheckinPermitirExtra(!checkinPermitirExtra)} />
            </Linha>
          </div>
          <div className="cfg-card" style={{ marginTop: 16 }}>
            <div className="cfg-card-t">{traduzirUi("Tipos de evento")}</div>
            <div className="cfg-card-s">{ct(traduzirUi("Os tipos que aparecem ao criar um {culto} ou evento. Já vêm pré-preenchidos no cadastro; se faltar algum, dá pra criar na hora."))}</div>
            <div className="cell-tags" style={{ gap: 8, marginBottom: 16 }}>
              {tiposEvento.map((t) => (
                <span key={t} className="papel-tag" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  {t}<Acao onClick={() => saveTiposEvento(tiposEvento.filter((x) => x !== t))} style={{ background: "none", border: "none", color: "var(--muted)", fontSize: "var(--fs-pn-12)", padding: 0 }}>✕</Acao>
                </span>
              ))}
              {tiposEvento.length === 0 && <span style={{ fontSize: "var(--fs-pn-13)", color: "var(--muted)" }}>{traduzirUi("Nenhum tipo cadastrado.")}</span>}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="input" style={{ flex: 1 }} placeholder={traduzirUi("ex: Culto, Conferência, Vigília")} value={novoTipoEvento} onChange={(e) => setNovoTipoEvento(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addTipoEvento()} />
              <Botao onClick={addTipoEvento}>{traduzirUi("Adicionar")}</Botao>
            </div>
          </div>
        </>
      )}

      {/* ─── PERMISSÕES ─── */}
      {tab === "perm" && (
        <div className="cfg-card">
          <div className="cfg-card-t">{traduzirUi("Papéis & permissões")}</div>
          <div className="cfg-card-s">{traduzirUi("Cada funcionalidade do app aparece aqui. Toque para liberar ou bloquear por papel. O Master sempre tem acesso total.")}</div>
          <div className="pmx-mob">
            <Abas rotulo={traduzirUi("Papel")} ativa={papelMob} aoMudar={(v) => setPapelMob(v as typeof papelMob)}
              abas={PAPEIS_V2.map((pp) => ({ id: pp.id, rotulo: ct(pp.nome) }))} />
            {(papelMob === "master" || papelMob === "membro") && (
              <div className="pmx-mob-note">
                {papelMob === "master" ? traduzirUi("O Master sempre tem acesso total.") : traduzirUi("Membro usa o app. Para abrir uma tela do painel pra uma pessoa, use Acessos por pessoa.")}
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
                      <span className="pmx-mob-state">{on ? traduzirUi("Liberado") : traduzirUi("Bloqueado")}</span>
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
                <th className="pmx-fn">{traduzirUi("Funcionalidade")}</th>
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
            <Botao variante="principal" compacto desativado={matrizSaving} onClick={salvarMatriz}>{matrizSaving ? traduzirUi("Salvando…") : (matrizMsg || traduzirUi("Salvar permissões"))}</Botao>
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
            <div className="cfg-card-t">{traduzirUi("Logo da igreja")}</div>
            <div className="cfg-card-s">{traduzirUi("Aparece ao lado de \"Service\" em todo lugar: login, convite, app do membro, painel e página da igreja. Sem logo, aparece o nome da igreja.")}</div>
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
            <div className="cfg-card-t">{traduzirUi("Nomes usados no app")}</div>
            <div className="cfg-card-s">{traduzirUi("Use as palavras da sua igreja. O nome da tela aparece nos títulos e textos; o nome curto, na barra de abas do app. Vale para toda a igreja, inclusive as congregações.")}</div>
            {TERMOS_IDS.map((id) => (
              <div key={id} className="cfg-grid2" style={{ gap: "0 16px", marginTop: 16 }}>
                <Campo rotulo={traduzirUi("{value0} · nome da tela", { value0: String(termosInterface[id].tela) })} ajuda={traduzirUi("{value0} · {value1} de {value2}", { value0: String(termosInterface[id].ajuda), value1: String(vocabEdit[id].tela.length), value2: String(LIMITE_TELA) })}>
                  <Entrada id={`voc-${id}-tela`} value={vocabEdit[id].tela} maxLength={LIMITE_TELA} placeholder={termosInterface[id].tela} onChange={(e) => patchVocab(id, "tela", e.target.value)} />
                </Campo>
                <Campo rotulo={traduzirUi("Nome curto da barra")} ajuda={traduzirUi("{value0} de {value1}", { value0: String(vocabEdit[id].curto.length), value1: String(LIMITE_CURTO) })}>
                  <Entrada id={`voc-${id}-curto`} value={vocabEdit[id].curto} maxLength={LIMITE_CURTO} placeholder={termosInterface[id].curto} onChange={(e) => patchVocab(id, "curto", e.target.value)} />
                </Campo>
              </div>
            ))}
          </div>
          <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
            <div className="cfg-card-t">{traduzirUi("Fundo da página da igreja")}</div>
            <div className="cfg-card-s">{traduzirUi("Só para a página da igreja (o link da bio). Os botões e destaques dela usam a cor da igreja escolhida acima.")}</div>
            {church && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
                  <BackgroundField identidade={identidade} onSave={patchIdentidade} organizationId={church.organizationId} churchId={church.id} />
                  <AccentField compact label={traduzirUi("Cor do texto")} bgHex={identidadeBgHex} value={identidade.textColor ?? IDENTIDADE_CFG_DEFAULT.textColor} defaultHex={IDENTIDADE_CFG_DEFAULT.textColor} onChange={(hex) => patchIdentidade({ textColor: hex })} />
                  <AccentField compact label={traduzirUi("Cor das caixas e balões")} bgHex={identidadeBgHex} value={identidade.boxColor ?? IDENTIDADE_CFG_DEFAULT.boxColor} defaultHex={IDENTIDADE_CFG_DEFAULT.boxColor} onChange={(hex) => patchIdentidade({ boxColor: hex })} />
                </div>
              </>
            )}
          </div>
          {(currentRole === "master" || currentRole === "pastor") && (
            <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
              <div className="cfg-card-t">{traduzirUi("Quem mais pode editar a marca")}</div>
              <div className="cfg-card-s">
                Além de você, libere pessoas específicas em <b>{traduzirUi("Acessos por pessoa")}</b>{" "}marcando &quot;Marca e
                aparência&quot;. Elas conseguem abrir só esta aba, sem acesso ao resto de Configurações.
              </div>
            </div>
          )}
          <div className="cfg-card" style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, position: "sticky", bottom: "calc(84px + var(--safe-bottom))", zIndex: 5 }}>
            <div className="cfg-card-s" style={{ margin: 0 }}>{traduzirUi("Você já está vendo a prévia. Salve para valer para todos da igreja.")}</div>
            <Botao variante="principal" desativado={personalizacaoSaving} onClick={salvarPersonalizacao}>
              {personalizacaoSaving ? traduzirUi("Salvando…") : personalizacaoMsg || traduzirUi("Salvar personalização")}
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
          <div className="cfg-card-t">{traduzirUi("Sua igreja na rede")}</div>
          <div className="cfg-card-s">{traduzirUi("Toda igreja começa pela matriz: a sede cadastrada na contratação. Se houver outras unidades, elas aparecem aqui como congregações; cada uma tem seus times e escalas, e a matriz enxerga tudo.")}</div>
          {churches.filter((c) => c.matriz).map((c) => (
            <div key={c.id} className="cong-matriz">
              <div className="cong-mark">
                {c.logoUrl ? <img src={c.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }} /> : <Icon name="identidade" size={20} />}
              </div>
              <div className="cfg-row-main">
                <div className="cfg-row-t">{c.nome} <Selo tom="ok" style={{ marginLeft: 6 }}>{traduzirUi("matriz")}</Selo></div>
                <div className="cfg-row-s">{c.cidade || traduzirUi("Sede da rede")}</div>
              </div>
              <Botao compacto onClick={() => setGerirCongId(c.id)}>{traduzirUi("Gerir")}</Botao>
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
                  <Botao compacto onClick={() => setGerirCongId(c.id)}>{traduzirUi("Gerir")}</Botao>
                </Linha>
              ))}
            </>
          )}
          {churches.length === 0 && <Vazio titulo={traduzirUi("Nenhuma congregação encontrada.")} />}
          <Botao
            variante="principal" compacto
            style={{ marginTop: 18 }}
            onClick={() => setModal({
              eyebrow: traduzirUi("Criar"),
              title: traduzirUi("Adicionar congregação"),
              subtitle: traduzirUi("Nova unidade da rede, com seus próprios times e escalas."),
              saveLabel: traduzirUi("Adicionar congregação"),
              formFields: [
                { k: "nome", label: traduzirUi("Nome"), type: "text", req: true, ph: traduzirUi("ex: Congregação Zona Norte") },
                { k: "cidade", label: traduzirUi("Cidade / bairro"), type: "text", half: true },
                { k: "doc", label: traduzirUi("CNPJ"), type: "text", half: true },
                { k: "fundada", label: traduzirUi("Ano de fundação"), type: "text", half: true },
                { k: "endereco", label: traduzirUi("Endereço"), type: "text", half: true },
                { k: "cep", label: traduzirUi("CEP"), type: "text", half: true },
                { k: "email", label: traduzirUi("E-mail"), type: "text", half: true },
                { k: "tel", label: traduzirUi("Telefone"), type: "text", half: true },
              ],
              action: { kind: "congregacao" },
            })}
          >{traduzirUi("+ Adicionar congregação")}</Botao>
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

export { STATUS_CFG_DEFAULT, GRUPOS_CFG_DEFAULT, DIAS_SEMANA, ACESSO_ROTAS, TAG_CORES } from "./configuracao/constantes";

export { AcessosCard } from "./configuracao/AcessosCard";

export { TagElencoModal } from "./configuracao/TagElencoModal";

export { CongregacaoEditModal } from "./configuracao/CongregacaoEditModal";
