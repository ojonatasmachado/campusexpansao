"use client";

import { useRef, useState } from "react";
import { createServiceBrowserClient } from "./lib/supabase-browser";
import { uploadServiceImage, imageExtension } from "./lib/upload-image";
import { useTexto } from "./lib/internacional/contexto";


/* Componente único de upload de foto : a "bolinha" circular. Usado em
   qualquer lugar do Service que capture uma foto (cadastro de voluntário,
   ficha da criança, foto do responsável...) — nunca reimplementar isso
   localmente numa tela nova, sempre importar daqui. */
export function PhotoPicker({
  photoUrl,
  path,
  onUploaded,
  placeholder,
  label,
}: {
  photoUrl: string | null;
  path: string;
  onUploaded: (url: string) => void;
  placeholder?: string;
  label?: string;
}) {
  const traduzirUi = useTexto();

  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const onChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const url = await uploadServiceImage(createServiceBrowserClient(), file, `${path}.${imageExtension(file)}`, traduzirUi);
      onUploaded(url);
    } catch {
      setError(traduzirUi("Não consegui enviar a foto agora."));
    }
    setBusy(false);
  };

  return (
    <div style={{ textAlign: "center" }}>
      {label ? <div className="field-label" style={{ marginBottom: 8 }}>{label}</div> : null}
      <div className="ob-foto-area" onClick={() => inputRef.current?.click()} style={{ cursor: "pointer", margin: "0 auto" }}>
        {photoUrl ? (
          <img src={photoUrl} alt={label ?? traduzirUi("Foto")} className="ob-foto-img" />
        ) : (
          <div className="ob-foto-placeholder">
            <span>{busy ? "…" : "+"}</span>
            <small>{busy ? traduzirUi("Enviando...") : placeholder ?? traduzirUi("Toque para enviar")}</small>
          </div>
        )}
        <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={onChange} />
      </div>
      {error ? <div style={{ fontSize: "var(--fs-ui-sm)", color: "var(--danger)", marginTop: 6 }}>{error}</div> : null}
    </div>
  );
}
