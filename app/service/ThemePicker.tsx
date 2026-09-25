"use client";

import { AccentField } from "./AccentField";
import { ACCENT_PRESETS, DEFAULT_ACCENT, NEUTRAL_FAMILIES, adaptAccent, familyById, type BrandCfg, type NeutralFamily, type ThemeMode } from "./lib/theme";
import { bestOnColor } from "./lib/color";

/* Tela de marca do app da igreja (Configurações → Personalização): cor da
   igreja, fundos do modo escuro e do claro, e o modo padrão. Tudo aqui é
   decidido pela gestão; o membro só alterna claro/escuro no próprio app.
   Ver app/service/lib/theme.ts. */
export default function ThemePicker({ brand, onChange }: { brand: BrandCfg; onChange: (patch: Partial<BrandCfg>) => void }) {
  const accent = brand.accent || brand.accentDark || DEFAULT_ACCENT;
  const darkFam = familyById(brand.neutralDark, "dark");
  const defaultMode = brand.defaultMode ?? "dark";

  return (
    <>
      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Cor da igreja</div>
        <div className="cfg-card-s">
          A cor da identidade visual da sua igreja: botões, destaques e ícones do app. Escolha uma só. O app ajusta o tom
          sozinho para ler bem no modo escuro e no claro.
        </div>
        <div className="seg-check" style={{ marginBottom: 12 }}>
          {ACCENT_PRESETS.map((p) => (
            <button
              key={p.hex}
              type="button"
              className={`seg-chip${accent.toUpperCase() === p.hex.toUpperCase() ? " on" : ""}`}
              onClick={() => onChange({ accent: p.hex })}
            >
              <span aria-hidden="true" style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: p.hex, marginRight: 6, verticalAlign: "-1px" }} />
              {p.label}
            </button>
          ))}
        </div>
        <AccentField compact label="Outra cor (hex)" bgHex={darkFam.tokens.graphite} value={accent} defaultHex={DEFAULT_ACCENT} onChange={(hex) => onChange({ accent: hex })} />
      </div>

      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Fundos do app</div>
        <div className="cfg-card-s">
          Preto, cinza escuro, branco e cinza claro em combinações já testadas para leitura. Escolha uma para o modo
          escuro e outra para o claro.
        </div>
        <FamilyRow title="Modo escuro" mode="dark" selected={darkFam.id} accent={accent} onSelect={(id) => onChange({ neutralDark: id })} />
        <FamilyRow title="Modo claro" mode="light" selected={familyById(brand.neutralLight, "light").id} accent={accent} onSelect={(id) => onChange({ neutralLight: id })} />
      </div>

      <div className="cfg-card" style={{ gridColumn: "1 / -1" }}>
        <div className="cfg-card-t">Modo padrão</div>
        <div className="cfg-card-s">Como o app abre para todo mundo. Cada pessoa ainda pode alternar entre claro e escuro no próprio perfil.</div>
        <div className="opt-row">
          {(["dark", "light"] as ThemeMode[]).map((m) => (
            <button key={m} type="button" className={`opt${defaultMode === m ? " on" : ""}`} onClick={() => onChange({ defaultMode: m })}>
              <div className="opt-t">{m === "dark" ? "Escuro" : "Claro"}</div>
              <div className="opt-s">{m === "dark" ? "Fundo escuro" : "Fundo claro"}</div>
            </button>
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
          <button key={f.id} type="button" className={`opt${selected === f.id ? " on" : ""}`} onClick={() => onSelect(f.id)} style={{ padding: 10 }}>
            <FamilyPreview family={f} accent={accent} />
            <div className="opt-t" style={{ marginTop: 8 }}>{f.label}</div>
            <div className="opt-s">{f.hint}</div>
          </button>
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
