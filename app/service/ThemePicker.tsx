"use client";

import { AccentField } from "./AccentField";
import type { CSSProperties } from "react";
import { ACCENT_PRESETS, DEFAULT_ACCENT, NEUTRAL_FAMILIES, accentReport, adaptAccent, familyById, themeCss, themeVars, type BrandCfg, type NeutralFamily, type ThemeMode } from "./lib/theme";
import { bestOnColor } from "./lib/color";
import { Icon } from "./lib/icons";
import ChurchLockup from "./ChurchLockup";

import { Opcao } from "./ui/Opcao";
import { Selo } from "./ui/Selo";
import { useTexto } from "./lib/internacional/contexto";
/* Tela de marca do app da igreja (Configurações → Personalização): cor da
   igreja, fundos do modo escuro e do claro, e o modo padrão. Tudo aqui é
   decidido pela gestão; o membro só alterna claro/escuro no próprio app.
   Ver app/service/lib/theme.ts. */
export default function ThemePicker({
  brand,
  onChange,
  churchName,
  logoUrl,
}: {
  brand: BrandCfg;
  onChange: (patch: Partial<BrandCfg>) => void;
  churchName?: string;
  logoUrl?: string | null;
}) {
  const traduzirUi = useTexto();
  const accent = brand.accent || brand.accentDark || DEFAULT_ACCENT;
  const darkFam = familyById(brand.neutralDark, "dark");
  const defaultMode = brand.defaultMode ?? "dark";
  const report = accentReport(brand);
  const ajustada = report.dark.adjusted || report.light.adjusted;

  return (
    <>
      {/* prévia ao vivo: enquanto esta tela está aberta, o app inteiro já
          aparece com as escolhas ainda não salvas (vem depois do <style> do
          servidor, então sobrescreve). Saiu da tela sem salvar, volta ao salvo. */}
      <style dangerouslySetInnerHTML={{ __html: themeCss(brand) }} />
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">{traduzirUi("Cor da igreja")}</div>
        <div className="cfg-card-s">{traduzirUi("A cor da identidade visual da sua igreja: botões, destaques e ícones do app. Escolha uma só. O app ajusta o tom sozinho para ler bem no modo escuro e no claro.")}</div>
        <div className="seg-check" style={{ marginBottom: 12 }}>
          {ACCENT_PRESETS.map((p) => (
            <Opcao
              key={p.hex}
              marcada={accent.toUpperCase() === p.hex.toUpperCase()} estilo="seg-chip"
              onClick={() => onChange({ accent: p.hex })}
            >
              <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: p.hex, marginRight: 6, verticalAlign: "-1px" }} />
              {p.label}
            </Opcao>
          ))}
        </div>
        <AccentField compact label={traduzirUi("Outra cor (hex)")} bgHex={darkFam.tokens.graphite} value={accent} defaultHex={DEFAULT_ACCENT} onChange={(hex) => onChange({ accent: hex })} />
        {ajustada && (
          <p className="tp-note">
            {traduzirUi("Os botões usam a sua cor exata. Nos textos e ícones em destaque, {modo, select, ambos {nos dois modos} claro {no modo claro} other {no modo escuro}}, escurecemos ou clareamos um pouco para garantir a leitura.", { modo: report.dark.adjusted && report.light.adjusted ? "ambos" : report.light.adjusted ? "claro" : "escuro" })}
          </p>
        )}
      </div>

      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">{traduzirUi("Prévia do app do membro")}</div>
        <div className="cfg-card-s">{traduzirUi("Assim fica o Início no celular, no modo claro e no escuro, com as escolhas desta tela.")}</div>
        <div className="tp-prev-row">
          {(["light", "dark"] as ThemeMode[]).map((m) => (
            <ThemePreview key={m} brand={brand} mode={m} churchName={churchName} logoUrl={logoUrl} />
          ))}
        </div>
      </div>

      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">{traduzirUi("Fundos do app")}</div>
        <div className="cfg-card-s">{traduzirUi("Preto, cinza escuro, branco e cinza claro em combinações já testadas para leitura. Escolha uma para o modo escuro e outra para o claro.")}</div>
        <FamilyRow title={traduzirUi("Modo escuro")} mode="dark" selected={darkFam.id} accent={accent} onSelect={(id) => onChange({ neutralDark: id })} />
        <FamilyRow title={traduzirUi("Modo claro")} mode="light" selected={familyById(brand.neutralLight, "light").id} accent={accent} onSelect={(id) => onChange({ neutralLight: id })} />
      </div>

      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">{traduzirUi("Modo padrão")}</div>
        <div className="cfg-card-s">{traduzirUi("Como o app abre para todo mundo. Cada pessoa ainda pode alternar entre claro e escuro no próprio perfil.")}</div>
        <div className="opt-row">
          {(["dark", "light"] as ThemeMode[]).map((m) => (
            <Opcao key={m} marcada={defaultMode === m} estilo="opt" onClick={() => onChange({ defaultMode: m })}>
              <div className="opt-t">{m === "dark" ? traduzirUi("Escuro") : traduzirUi("Claro")}</div>
              <div className="opt-s">{m === "dark" ? traduzirUi("Fundo escuro") : traduzirUi("Fundo claro")}</div>
            </Opcao>
          ))}
        </div>
      </div>
    </>
  );
}

function FamilyRow({ title, mode, selected, accent, onSelect }: { title: string; mode: ThemeMode; selected: string; accent: string; onSelect: (id: string) => void }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div className="field-label">{title}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
        {NEUTRAL_FAMILIES.filter((f) => f.mode === mode).map((f) => (
          <Opcao key={f.id} marcada={selected === f.id} estilo="opt" onClick={() => onSelect(f.id)} style={{ padding: 10 }}>
            <FamilyPreview family={f} accent={accent} />
            <div className="opt-t" style={{ marginTop: 8 }}>{f.label}</div>
            <div className="opt-s">{f.hint}</div>
          </Opcao>
        ))}
      </div>
    </div>
  );
}

/* miniatura de uma tela do app com as cores da família: fundo, card, texto
   principal, texto secundário e botão na cor da igreja já ajustada */
function FamilyPreview({ family, accent }: { family: NeutralFamily; accent: string }) {
  const t = family.tokens;
  const a = adaptAccent(accent, t.graphite, family.mode);
  return (
    <div aria-hidden="true" style={{ background: t.ink, borderRadius: 6, padding: 8, border: `1px solid ${t.border}` }}>
      <div style={{ background: t.graphite, border: `1px solid ${t.border2}`, borderRadius: 5, padding: "8px 8px 9px" }}>
        <div style={{ height: 6, width: "70%", borderRadius: 3, background: t.white }} />
        <div style={{ height: 5, width: "90%", borderRadius: 3, background: t.muted, marginTop: 6 }} />
        <div style={{ height: 5, width: "55%", borderRadius: 3, background: t.subtle, marginTop: 4 }} />
        <div style={{ display: "flex", gap: 5, marginTop: 9 }}>
          <span style={{ height: 12, width: 38, borderRadius: 3, background: a, color: bestOnColor(a, "#0E110D", "#FAFAF7") }} />
          <span style={{ height: 12, width: 28, borderRadius: 3, border: `1px solid ${t.border3}` }} />
        </div>
      </div>
    </div>
  );
}

/* Início do app do membro em miniatura, com as variáveis do tema aplicadas
   só neste bloco (não mexe no resto da tela). */
function ThemePreview({ brand, mode, churchName, logoUrl }: { brand: BrandCfg; mode: ThemeMode; churchName?: string; logoUrl?: string | null }) {
  const traduzirUi = useTexto();
  const vars = themeVars(brand, mode) as CSSProperties;
  return (
    <figure className="tp-prev" aria-label={traduzirUi("Prévia no modo {modo, select, dark {escuro} other {claro}}", { modo: mode })}>
      <figcaption className="tp-cap">{mode === "dark" ? traduzirUi("Modo escuro") : traduzirUi("Modo claro")}</figcaption>
      <div className="tp-screen" style={vars}>
        <div className="tp-head">
          <ChurchLockup size="sm" logoUrl={logoUrl} name={churchName} />
        </div>
        <div className="tp-h1">{traduzirUi.rich("Boa tarde, <em>Maria</em>", { em: (nome) => <em>{nome}</em> })}</div>
        <div className="tp-lbl">{traduzirUi("Para você agora")}</div>
        <div className="tp-card">
          <div className="tp-t">{traduzirUi("Culto de domingo")}</div>
          <div className="tp-s">{traduzirUi("Domingo · 19:00 · Louvor")}</div>
          <div className="tp-btns">
            <span className="tp-btn pri">{traduzirUi("Confirmar")}</span>
            <span className="tp-btn sec">{traduzirUi("Não posso")}</span>
          </div>
        </div>
        <div className="tp-card tp-row">
          <span className="tp-t">{traduzirUi("Fundamentos da fé")}</span>
          <Selo tom="ok">{traduzirUi("Concluída")}</Selo>
        </div>
        <div className="tp-tabs" aria-hidden="true">
          {(["inicio", "agenda", "conversas", "cursos", "perfil"] as const).map((ic, i) => (
            <span key={ic} className={`tp-tab${i === 0 ? " on" : ""}`}><span className="tp-tab-ic"><Icon name={ic} size={18} /></span></span>
          ))}
        </div>
      </div>
    </figure>
  );
}
