"use client";

/* Configurações › Contribuir: a igreja cadastra a chave Pix que aparece no
   app do membro. Guardado na matriz (settings.contribuirCfg). Com mais de 4
   campos, a edição abre em tela de formulário (FormScreen). */

import { useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FormScreen, FormSection, type FormScreenHandle } from "../../painel/form/FormScreen";
import { EmptyState } from "../../painel/ui";
import { useChurchSettingsField } from "../../lib/settings-field";
import { useTermos } from "../../lib/vocabulario-context";
import { avisar } from "../../lib/avisar";
import {
  CONTRIBUIR_PADRAO, FINALIDADES_SUGERIDAS, MAX_FINALIDADES, MAX_TEXTO, TIPOS_CHAVE,
  chaveLegivel, contribuirPronto, erroDaChave, normalizarChave, rotuloDoTipo, type ContribuirCfg, type TipoChave,
} from "./pix";

import { Botao } from "../../ui/Botao";
import { Acao } from "../../ui/Acao";
import { Linha } from "../../ui/Linha";
type IgrejaCfg = { id: string; cidade?: string | null; settings?: Record<string, unknown> };

export function ContribuirConfig({ church }: { church?: IgrejaCfg }) {
  const router = useRouter();
  const { comTermos: ct } = useTermos();
  const [cfg, , salvar] = useChurchSettingsField<ContribuirCfg>("contribuirCfg", CONTRIBUIR_PADRAO, church, () => router.refresh());
  const [editando, setEditando] = useState(false);
  const pronto = contribuirPronto(cfg) !== null;
  const [confirmaTirar, setConfirmaTirar] = useState(false);

  const tirar = async () => {
    setConfirmaTirar(false);
    if (await salvar(CONTRIBUIR_PADRAO)) avisar("Contribuir saiu do app do membro.");
    else avisar("Não foi possível tirar agora. Tente de novo.", "warn");
  };

  return (
    <>
      <div className="cfg-card">
        <div className="cfg-card-t">Contribuir por Pix</div>
        <div className="cfg-card-s">{ct("O membro abre Contribuir na {Caminhada}, copia o código Pix e escolhe o valor no próprio banco. O app não guarda valores nem quem contribuiu.")}</div>
        {pronto ? (
          <>
            <Linha estilo="config">
              <div className="cfg-row-main">
                <div className="cfg-row-t contrib-cfg-v">{chaveLegivel(cfg.tipo, cfg.chave)}</div>
                <div className="cfg-row-s">{rotuloDoTipo(cfg.tipo)} · {cfg.favorecido}{cfg.cidade ? ` · ${cfg.cidade}` : ""}</div>
              </div>
            </Linha>
            <Linha estilo="config">
              <div className="cfg-row-main">
                <div className="cfg-row-t">Finalidades</div>
                <div className="cfg-row-s">{cfg.finalidades.length ? cfg.finalidades.join(" · ") : "Sem escolha: o membro só copia o código"}</div>
              </div>
            </Linha>
            {cfg.texto.trim() && (
              <Linha estilo="config">
                <div className="cfg-row-main">
                  <div className="cfg-row-t">Texto no app</div>
                  <div className="cfg-row-s contrib-cfg-v">{cfg.texto}</div>
                </div>
              </Linha>
            )}
            <div className="contrib-cfg-acoes">
              {confirmaTirar ? (
                <>
                  <span className="cfg-row-s contrib-cfg-pergunta">Tirar Contribuir do app de todos os membros?</span>
                  <Botao variante="principal" compacto onClick={tirar}>Tirar</Botao>
                  <Botao compacto onClick={() => setConfirmaTirar(false)}>Manter</Botao>
                </>
              ) : (
                <>
                  <Botao variante="principal" compacto onClick={() => setEditando(true)}>Editar</Botao>
                  <Botao compacto onClick={() => setConfirmaTirar(true)}>Tirar do app</Botao>
                </>
              )}
            </div>
          </>
        ) : (
          <EmptyState
            title="Nenhuma chave Pix cadastrada"
            text={ct("Enquanto não houver chave, Contribuir não aparece no app do membro.")}
            action={{ label: "Cadastrar chave", onClick: () => setEditando(true) }}
          />
        )}
      </div>
      {editando && (
        <ContribuirForm
          inicial={{ ...cfg, cidade: cfg.cidade || church?.cidade || "" }}
          onSave={salvar}
          onClose={() => setEditando(false)}
        />
      )}
    </>
  );
}

function ContribuirForm({ inicial, onSave, onClose }: { inicial: ContribuirCfg; onSave: (c: ContribuirCfg) => Promise<boolean>; onClose: () => void }) {
  const fid = useId();
  const telaRef = useRef<FormScreenHandle>(null);
  const [tipo, setTipo] = useState<TipoChave>(inicial.tipo);
  const [chave, setChave] = useState(inicial.chave ? chaveLegivel(inicial.tipo, inicial.chave) : "");
  const [favorecido, setFavorecido] = useState(inicial.favorecido);
  const [cidade, setCidade] = useState(inicial.cidade);
  const [texto, setTexto] = useState(inicial.texto);
  const [finalidades, setFinalidades] = useState<string[]>(inicial.finalidades);
  const [outra, setOutra] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const tipoInfo = TIPOS_CHAVE.find((t) => t.v === tipo) ?? TIPOS_CHAVE[0];
  const erroChave = chave.trim() ? erroDaChave(tipo, chave) : null;
  const opcoes = [...FINALIDADES_SUGERIDAS, ...finalidades.filter((f) => !FINALIDADES_SUGERIDAS.includes(f))];
  const cheio = finalidades.length >= MAX_FINALIDADES;
  const alternar = (f: string) => setFinalidades((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : prev.length >= MAX_FINALIDADES ? prev : [...prev, f]));
  const somarOutra = () => {
    const f = outra.trim().replace(/\s+/g, " ");
    if (!f || cheio) return;
    if (!finalidades.some((x) => x.toLowerCase() === f.toLowerCase())) setFinalidades((prev) => [...prev, f]);
    setOutra("");
  };

  const retrato = JSON.stringify({ tipo, chave, favorecido, cidade, texto, finalidades });
  const [retratoInicial] = useState(retrato);
  const falta = [
    !chave.trim() && "a chave Pix",
    !!erroChave && erroChave,
    !favorecido.trim() && "o nome do favorecido",
  ].filter(Boolean) as string[];

  const salvar = async () => {
    if (falta.length) return;
    setSaving(true);
    setError("");
    const ok = await onSave({
      tipo,
      chave: normalizarChave(tipo, chave),
      favorecido: favorecido.trim(),
      cidade: cidade.trim(),
      texto: texto.trim().slice(0, MAX_TEXTO),
      finalidades,
    }).catch(() => false);
    if (!ok) {
      setSaving(false);
      setError("Não foi possível salvar agora. Confira sua conexão e se você pode editar a igreja.");
      return;
    }
    avisar("Chave Pix salva. Contribuir já aparece no app do membro.");
    if (telaRef.current) await telaRef.current.fechar(); else onClose();
  };

  return (
    <FormScreen
      ref={telaRef}
      eyebrow="Contribuir"
      title="Chave Pix da igreja"
      saveLabel="Salvar chave"
      saving={saving}
      missing={falta}
      dirty={retrato !== retratoInicial}
      error={error}
      onSave={salvar}
      onClose={onClose}
    >
      <FormSection title="Chave">
        <div className="fs-grid">
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-tipo`}>Tipo da chave</label>
            <select id={`${fid}-tipo`} className="select" value={tipo} onChange={(e) => setTipo(e.target.value as TipoChave)}>
              {TIPOS_CHAVE.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}
            </select>
          </div>
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-chave`}>Chave Pix</label>
            <input
              id={`${fid}-chave`} className="input" aria-required="true" aria-invalid={!!erroChave}
              inputMode={tipoInfo.modo} type={tipo === "email" ? "email" : "text"} autoCapitalize="none" autoCorrect="off" spellCheck={false}
              placeholder={tipoInfo.ph} value={chave} onChange={(e) => setChave(e.target.value)}
            />
            {erroChave ? <div className="field-hint">Falta {erroChave}.</div> : null}
          </div>
          <div className="field">
            <label className="field-label req" htmlFor={`${fid}-fav`}>Favorecido</label>
            <input id={`${fid}-fav`} className="input" aria-required="true" placeholder="ex: Igreja Batista Central" value={favorecido} onChange={(e) => setFavorecido(e.target.value)} />
            <div className="field-hint">{favorecido.trim().length > 25 ? "Aparece inteiro no app. No código Pix entram as primeiras 25 letras; o banco confirma pelo titular da chave." : "O nome que o membro vê no app, junto da chave."}</div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor={`${fid}-cid`}>Cidade</label>
            <input id={`${fid}-cid`} className="input" placeholder="ex: São Paulo" value={cidade} onChange={(e) => setCidade(e.target.value)} />
          </div>
        </div>
      </FormSection>

      <FormSection title="No app do membro">
        <div className="field">
          <label className="field-label" htmlFor={`${fid}-txt`}>Texto curto (opcional)</label>
          <textarea id={`${fid}-txt`} className="input" rows={3} maxLength={MAX_TEXTO} placeholder="ex: Obrigado por sustentar a missão da nossa igreja." value={texto} onChange={(e) => setTexto(e.target.value)} />
          <div className="field-hint">{texto.length} de {MAX_TEXTO} caracteres</div>
        </div>
        <div className="field">
          <div className="field-label" id={`${fid}-fin`}>Finalidades (opcional)</div>
          <div className="cand-pick" role="group" aria-labelledby={`${fid}-fin`}>
            {opcoes.map((f) => {
              const on = finalidades.includes(f);
              return (
                <Acao key={f} className={`cand-chip ${on ? "on" : ""}`} aria-pressed={on} desativado={!on && cheio} onClick={() => alternar(f)}>{f}</Acao>
              );
            })}
          </div>
          <div className="contrib-cfg-outra">
            <input className="input" aria-label="Outra finalidade" placeholder="Outra, ex: Construção" maxLength={24} value={outra} disabled={cheio}
              onChange={(e) => setOutra(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); somarOutra(); } }} />
            <Botao compacto desativado={cheio || !outra.trim()} onClick={somarOutra}>Somar</Botao>
          </div>
          <p className="fs-note">{cheio ? `No máximo ${MAX_FINALIDADES}.` : "Com duas ou mais, o membro escolhe uma e ela vai como descrição do Pix."}</p>
        </div>
      </FormSection>
    </FormScreen>
  );
}
