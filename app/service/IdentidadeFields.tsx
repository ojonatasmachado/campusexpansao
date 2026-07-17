"use client";

import { useEffect, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import { ImageUpload } from "./ImageUpload";
import { AccentField } from "./AccentField";
import { IDENTIDADE_CFG_DEFAULT, LOGO_FONTS } from "../lib/church-page";
import type { IdentidadeCfg, LogoFontKey } from "../lib/church-page";

/* Campos da identidade única da igreja (logo, fundo, texto, caixas) :
   editados uma vez em Configurações → Personalização, consumidos pela
   Página pública e pelo login temático. Reaproveitados só ali (não dentro
   de ServiceExactApp.tsx, que já tem 10k+ linhas), mesmo padrão de extração
   do ImageUpload/AccentField. */

const BG_ANGLE_PRESETS: { angle: number; label: string }[] = [
  { angle: 180, label: "↓" },
  { angle: 135, label: "↘" },
  { angle: 90, label: "→" },
  { angle: 45, label: "↗" },
];

/* Cor de fundo da identidade : sólida, degradê (como no Studio) ou uma foto
   (com uma camada escura por cima, ajustável, pra sempre continuar dando
   pra ler o texto e os botões). */
export function BackgroundField({ identidade, onSave, organizationId, churchId }: { identidade: IdentidadeCfg; onSave: (patch: Partial<IdentidadeCfg>) => void; organizationId: string; churchId: string }) {
  const mode = identidade.bgMode ?? "solida";
  const from = identidade.bgFrom ?? IDENTIDADE_CFG_DEFAULT.bgFrom;
  const to = identidade.bgTo ?? IDENTIDADE_CFG_DEFAULT.bgTo;
  const angle = identidade.bgAngle ?? IDENTIDADE_CFG_DEFAULT.bgAngle;
  const overlay = identidade.bgOverlay ?? IDENTIDADE_CFG_DEFAULT.bgOverlay;

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 8 }}>Cor de fundo</div>
      <div className="opt-row" style={{ marginBottom: 10 }}>
        <button type="button" className={`opt${mode === "solida" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ bgMode: "solida" })}>
          <div className="opt-t">Sólida</div>
        </button>
        <button type="button" className={`opt${mode === "degrade" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ bgMode: "degrade" })}>
          <div className="opt-t">Degradê</div>
        </button>
        <button type="button" className={`opt${mode === "imagem" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ bgMode: "imagem" })}>
          <div className="opt-t">Imagem</div>
        </button>
      </div>

      {mode === "solida" && (
        <AccentField compact label="Cor de fundo" bgHex="#0E110D" value={identidade.bgColor ?? IDENTIDADE_CFG_DEFAULT.bgColor} defaultHex={IDENTIDADE_CFG_DEFAULT.bgColor} onChange={(hex) => onSave({ bgColor: hex })} />
      )}

      {mode === "degrade" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ height: 40, borderRadius: 10, background: `linear-gradient(${angle}deg, ${from}, ${to})`, border: "1px solid var(--border-2)" }} />
          <AccentField compact label="Cor inicial" bgHex="#0E110D" value={from} defaultHex={IDENTIDADE_CFG_DEFAULT.bgFrom} onChange={(hex) => onSave({ bgFrom: hex })} />
          <AccentField compact label="Cor final" bgHex="#0E110D" value={to} defaultHex={IDENTIDADE_CFG_DEFAULT.bgTo} onChange={(hex) => onSave({ bgTo: hex })} />
          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Direção</div>
            <div style={{ display: "flex", gap: 8 }}>
              {BG_ANGLE_PRESETS.map((p) => (
                <button
                  key={p.angle}
                  type="button"
                  className={`opt${angle === p.angle ? " on" : ""}`}
                  style={{ width: 44, height: 44, padding: 0, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => onSave({ bgAngle: p.angle })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "imagem" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <ImageUpload
            label="Foto de fundo"
            hint="Cobre a página inteira. Escureça um pouco pra manter os botões legíveis."
            url={identidade.bgImageUrl}
            aspectRatio={0.75}
            onUpload={async (file) => {
              const path = `${organizationId}/paginas/${churchId}-fundo.${imageExtension(file)}`;
              const url = await uploadServiceImage(createServiceBrowserClient(), file, path);
              await onSave({ bgImageUrl: url });
            }}
            onRemove={() => onSave({ bgImageUrl: undefined })}
          />
          {identidade.bgImageUrl && (
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Escurecer a foto</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.01}
                  value={overlay}
                  onChange={(e) => onSave({ bgOverlay: Number(e.target.value) })}
                  style={{ flex: 1 }}
                />
                <span style={{ fontSize: 12, color: "var(--subtle)", width: 34, textAlign: "right" }}>{Math.round(overlay * 100)}%</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* Logo do cabeçalho : imagem enviada (padrão) ou o nome escrito numa fonte
   bonita, pra igreja que ainda não tem uma logo pronta. Usada na Página
   pública e no login temático. */
export function LogoField({
  identidade, onSave, logoUrl, onUploadLogo, onRemoveLogo,
}: {
  identidade: IdentidadeCfg;
  onSave: (patch: Partial<IdentidadeCfg>) => void;
  logoUrl?: string | null;
  onUploadLogo: (file: File) => Promise<void>;
  onRemoveLogo: () => void | Promise<void>;
}) {
  const mode = identidade.logoMode ?? "imagem";
  const [textDraft, setTextDraft] = useState(identidade.logoText ?? "");
  useEffect(() => setTextDraft(identidade.logoText ?? ""), [identidade.logoText]);

  return (
    <div>
      <div className="field-label" style={{ marginBottom: 8 }}>Logo</div>
      <div className="opt-row" style={{ marginBottom: 10 }}>
        <button type="button" className={`opt${mode === "imagem" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ logoMode: "imagem" })}>
          <div className="opt-t">Imagem</div>
        </button>
        <button type="button" className={`opt${mode === "texto" ? " on" : ""}`} style={{ padding: "8px 14px" }} onClick={() => onSave({ logoMode: "texto" })}>
          <div className="opt-t">Texto</div>
        </button>
      </div>

      {mode === "imagem" ? (
        <ImageUpload
          label="Logotipo da igreja"
          hint="Tamanho ideal: 480×160px (proporção 3:1), PNG com fundo transparente."
          url={logoUrl}
          aspectRatio={3}
          onUpload={onUploadLogo}
          onRemove={onRemoveLogo}
        />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input
            className="input"
            value={textDraft}
            placeholder="Nome da igreja"
            onChange={(e) => setTextDraft(e.target.value)}
            onBlur={() => onSave({ logoText: textDraft })}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(Object.entries(LOGO_FONTS) as [LogoFontKey, typeof LOGO_FONTS[LogoFontKey]][]).map(([key, font]) => (
              <button
                key={key}
                type="button"
                className={`opt${(identidade.logoFont ?? "inter") === key ? " on" : ""}`}
                style={{ padding: "10px 14px", fontFamily: font.family, fontWeight: font.weight, fontSize: 15 }}
                onClick={() => onSave({ logoFont: key })}
              >
                {font.label}
              </button>
            ))}
          </div>

          <div>
            <div className="field-label" style={{ marginBottom: 6 }}>Posição do texto</div>
            <div style={{ display: "flex", gap: 8 }}>
              {([["left", "⟵"], ["center", "•"], ["right", "⟶"]] as const).map(([align, mark]) => (
                <button
                  key={align}
                  type="button"
                  className={`opt${(identidade.logoAlign ?? "center") === align ? " on" : ""}`}
                  style={{ width: 44, height: 44, padding: 0, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}
                  onClick={() => onSave({ logoAlign: align })}
                >
                  {mark}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
