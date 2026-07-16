"use client";

import { useEffect, useState } from "react";
import { isValidHex, normalizeHex, deriveAccentVars, contrastRatio, contrastLabel, buildColorWheel, hslToHex } from "./lib/color";
import { Icon } from "./lib/icons";

/* Seletor de cor livre (hex), com roda de cores + leitura de contraste ao
   vivo. Extraído de ServiceExactApp.tsx (era local, usado só pela cor de
   destaque da marca) pra ser reaproveitado também pelo editor da Página
   pública (PublicPageEditor.tsx) : cor de fundo/texto/destaque da página são
   o mesmo tipo de campo. */

/* roda de cores em favo de mel (matiz + saturação pela posição, luminosidade
   decrescendo pra fora) : calculada uma única vez, reaproveitada por todo
   campo que usa este componente. Bem mais rica que uma paleta fixa de poucos
   tons. */
const COLOR_WHEEL = buildColorWheel(6);
const COLOR_WHEEL_MAX_DIST = Math.max(...COLOR_WHEEL.map((c) => Math.hypot(c.x, c.y)));
const GRAYSCALE_STEPS = [0.97, 0.85, 0.7, 0.55, 0.4, 0.25, 0.12, 0.02].map((l) => hslToHex(0, 0, l));

/* grade hexagonal de cores prontas pra escolher rápido, sem digitar hex +
   tira de cinzas embaixo. Usada dentro de AccentField, ao lado do campo
   detalhado (hex + seletor nativo). */
function ColorWheelPicker({ onPick }: { onPick: (hex: string) => void }) {
  const containerR = 92;
  const scale = containerR / COLOR_WHEEL_MAX_DIST;
  const hexW = Math.sqrt(3) * scale;
  const hexH = 2 * scale;
  return (
    <div className="color-wheel-wrap">
      <div className="color-wheel" style={{ width: containerR * 2, height: containerR * 2 }}>
        {COLOR_WHEEL.map((cell, i) => (
          <button
            key={i}
            type="button"
            className="color-wheel-cell"
            style={{ width: hexW + 1.5, height: hexH + 1.5, left: `calc(50% + ${cell.x * scale}px)`, top: `calc(50% + ${cell.y * scale}px)`, background: cell.hex }}
            title={cell.hex}
            onClick={() => onPick(cell.hex)}
          />
        ))}
      </div>
      <div className="color-wheel-gray">
        {GRAYSCALE_STEPS.map((hex) => (
          <button key={hex} type="button" className="color-wheel-gray-cell" style={{ background: hex }} title={hex} onClick={() => onPick(hex)} />
        ))}
      </div>
    </div>
  );
}

/* editor de uma cor de destaque : roda de cores pronta + hex livre/seletor
   nativo com leitura de contraste ao vivo (WCAG), e um botão "Aplicar"
   explícito (nada se salva sozinho ao digitar ou trocar de campo).

   compact=true : começa fechado, mostrando só label + bolinha da cor atual.
   Clicar abre o seletor completo (roda + hex + contraste); "Aplicar" fecha
   de novo. Pensado pra tela com vários campos de cor juntos (Página
   pública), onde a roda inteira sempre aberta pesa demais visualmente. Sem
   compact, o campo já nasce aberto (comportamento de sempre, usado em
   Personalização). */
export function AccentField({ label, bgHex, value, defaultHex, onChange, compact }: { label: string; bgHex: string; value: string; defaultHex: string; onChange: (hex: string) => void; compact?: boolean }) {
  const [draft, setDraft] = useState(value);
  const [savedMsg, setSavedMsg] = useState(false);
  const [expanded, setExpanded] = useState(!compact);
  useEffect(() => setDraft(value), [value]);

  const valid = isValidHex(draft);
  const hex = valid ? normalizeHex(draft) : value;
  const vars = deriveAccentVars(hex, bgHex === "#0E110D" ? "dark" : "light");
  const bgContrast = contrastRatio(hex, bgHex);
  const bgLabel = contrastLabel(bgContrast);
  const dirty = valid && hex.toLowerCase() !== value.toLowerCase();

  const aplicar = () => {
    if (!valid) return;
    onChange(hex);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1600);
    if (compact) setExpanded(false);
  };

  if (compact && !expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        style={{
          display: "flex", alignItems: "center", gap: 10, width: "100%",
          padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border-2)",
          background: "var(--graphite-2)", color: "var(--light)", cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ width: 22, height: 22, borderRadius: 999, background: hex, border: "1px solid rgba(255,255,255,0.18)", flex: "none" }} />
        <span style={{ flex: 1, fontSize: 13.5 }}>{label}</span>
        <span style={{ fontSize: 12, fontFamily: "monospace", color: "var(--muted)" }}>{hex}</span>
      </button>
    );
  }

  return (
    <div className="brand-accent-field">
      <div className="brand-accent-head">
        <span>{label}</span>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {draft.toLowerCase() !== defaultHex.toLowerCase() && (
            <button type="button" className="brand-accent-reset" onClick={() => setDraft(defaultHex)}>
              Restaurar padrão
            </button>
          )}
          {compact && (
            <button type="button" className="brand-accent-reset" onClick={() => setExpanded(false)}>
              Fechar
            </button>
          )}
        </div>
      </div>

      <ColorWheelPicker onPick={setDraft} />

      <div className="brand-accent-row">
        <input
          type="color"
          className="brand-accent-swatch"
          value={valid ? hex : defaultHex}
          onChange={(e) => setDraft(e.target.value)}
          aria-label={`Cor de destaque : ${label}`}
        />
        <input
          className="input brand-accent-hex"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="#7A9E3F"
        />
        <button type="button" className="brand-accent-preview" style={{ background: hex, color: vars.accentInk }} disabled>
          Aa
        </button>
      </div>

      {!valid && <div className="brand-accent-warn">Use um hex válido, tipo #7A9E3F.</div>}
      {valid && (
        <div className={`brand-accent-contrast${bgLabel.ok ? "" : " low"}`}>
          {bgLabel.label} · {bgContrast.toFixed(2)}:1 contra o fundo. Texto dos botões ajustado sozinho pra continuar legível.
        </div>
      )}

      <button type="button" className="btn btn-pri btn-sm brand-accent-apply" disabled={!valid || !dirty} onClick={aplicar}>
        {savedMsg ? <><Icon name="ok" size={14} /> Aplicado</> : "Aplicar"}
      </button>
    </div>
  );
}
