"use client";

import { useRef, useState } from "react";
import { ImageCropper } from "./ImageCropper";

/* Upload de imagem retangular (logo, capa/banner...), com preview de fundo e
   botão trocar/remover. Extraído de ServiceExactApp.tsx (era local/não
   exportado, usado só pro logo da igreja) pra poder ser reaproveitado também
   pelo editor da Página pública (PublicPageEditor.tsx). Pra foto redonda de
   pessoa, o componente certo é PhotoPicker.tsx, não este.

   Toda imagem passa pelo ImageCropper antes de subir : dá pra cortar e dar
   zoom pra enquadrar direito, em vez de mandar a foto do jeito que veio da
   galeria/câmera. */
export function ImageUpload({
  label, hint, url, round, aspectRatio = 1, onUpload, onRemove,
}: {
  label: string;
  hint?: string;
  url?: string | null;
  round?: boolean;
  aspectRatio?: number;
  onUpload: (file: File) => Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      await onUpload(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível enviar a imagem.");
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="img-up">
      <button
        type="button"
        className={`img-up-slot${round ? " round" : ""}`}
        onClick={() => ref.current?.click()}
        style={url ? { backgroundImage: `url(${url})` } : undefined}
      >
        {!url && <span className="img-up-plus">+</span>}
      </button>
      <div className="img-up-main">
        <div className="cfg-row-t">{label}</div>
        {hint && <div className="cfg-row-s">{hint}</div>}
        {error && <div style={{ fontSize: 12, color: "var(--danger)", marginTop: 6 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button className="btn btn-sec btn-sm" type="button" disabled={busy} onClick={() => ref.current?.click()}>
            {busy ? "Enviando..." : url ? "Trocar" : "Enviar imagem"}
          </button>
          {url && (
            <button className="btn btn-ghost btn-sm" type="button" disabled={busy} onClick={() => onRemove()}>
              Remover
            </button>
          )}
        </div>
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) setPendingFile(file);
          if (ref.current) ref.current.value = "";
        }}
      />
      {pendingFile && (
        <ImageCropper
          file={pendingFile}
          round={round}
          aspectRatio={aspectRatio}
          onCancel={() => setPendingFile(null)}
          onConfirm={(cropped) => {
            setPendingFile(null);
            handleFile(cropped);
          }}
        />
      )}
    </div>
  );
}
